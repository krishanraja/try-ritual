import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ContactRequest {
  name: string;
  email: string;
  subject: string;
  message: string;
}

interface ResendResponse {
  id?: string;
  error?: {
    message: string;
    name?: string;
  };
}

const SUBJECT_LABELS: Record<string, string> = {
  general: "General Inquiry",
  support: "Technical Support",
  feedback: "Product Feedback",
  partnership: "Partnership Opportunity",
  billing: "Billing Question",
  other: "Other",
};

const log = (level: string, message: string, data?: Record<string, unknown>) => {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    function: "send-contact-email",
    message,
    ...data,
  };
  console.log(JSON.stringify(logEntry));
};

const maskEmail = (email: string): string => {
  const [local, domain] = email.split("@");
  if (!domain) return "***";
  const maskedLocal = local.length > 2 ? `${local[0]}***${local[local.length - 1]}` : "***";
  return `${maskedLocal}@${domain}`;
};

const sendEmail = async (
  apiKey: string,
  to: string[],
  subject: string,
  html: string,
  from: string
): Promise<{ success: boolean; id?: string; error?: string }> => {
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ from, to, subject, html }),
    });

    const responseText = await response.text();
    let data: ResendResponse;
    
    try {
      data = JSON.parse(responseText);
    } catch {
      return { success: false, error: `Invalid JSON response: ${responseText.substring(0, 200)}` };
    }

    if (!response.ok) {
      return {
        success: false,
        error: data.error?.message || `HTTP ${response.status}: ${responseText.substring(0, 200)}`,
      };
    }

    return { success: true, id: data.id };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Unknown fetch error";
    return { success: false, error: errorMessage };
  }
};

const handler = async (req: Request): Promise<Response> => {
  const startTime = Date.now();
  const requestId = crypto.randomUUID();

  log("info", "Function invoked", { requestId, method: req.method });

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    log("info", "CORS preflight request", { requestId });
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      log("error", "RESEND_API_KEY is not configured", { requestId });
      throw new Error("RESEND_API_KEY is not configured");
    }

    const body = await req.json();
    const { name, email, subject, message }: ContactRequest = body;

    log("info", "Processing contact form submission", {
      requestId,
      maskedEmail: maskEmail(email),
      subject,
      nameLength: name?.length,
      messageLength: message?.length,
    });

    // Validate input
    if (!name || !email || !subject || !message) {
      const missingFields = [];
      if (!name) missingFields.push("name");
      if (!email) missingFields.push("email");
      if (!subject) missingFields.push("subject");
      if (!message) missingFields.push("message");
      
      log("warn", "Validation failed - missing fields", { requestId, missingFields });
      return new Response(
        JSON.stringify({ error: "All fields are required", missingFields }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      log("warn", "Validation failed - invalid email format", { requestId, maskedEmail: maskEmail(email) });
      return new Response(
        JSON.stringify({ error: "Invalid email format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const subjectLabel = SUBJECT_LABELS[subject] || subject;
    const fromAddress = "Ritual Contact <onboarding@resend.dev>";

    // Warn about using default Resend domain
    log("warn", "Using default Resend domain - user confirmation emails may fail for non-verified recipients", {
      requestId,
      note: "To send to any email, verify your domain at https://resend.com/domains",
    });

    // Send notification email to admin
    log("info", "Sending admin notification email", { requestId });
    
    const adminEmailResult = await sendEmail(
      RESEND_API_KEY,
      ["hello@krishraja.com"],
      `[Ritual Contact] ${subjectLabel} from ${name}`,
      `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333; margin-bottom: 20px;">New Contact Form Submission</h2>
          
          <div style="background: #f9f9f9; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <p style="margin: 0 0 10px;"><strong>From:</strong> ${name}</p>
            <p style="margin: 0 0 10px;"><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
            <p style="margin: 0;"><strong>Subject:</strong> ${subjectLabel}</p>
          </div>
          
          <div style="background: #fff; border: 1px solid #e5e5e5; border-radius: 8px; padding: 20px;">
            <h3 style="margin: 0 0 10px; color: #333;">Message:</h3>
            <p style="margin: 0; color: #555; white-space: pre-wrap;">${message}</p>
          </div>
          
          <p style="margin-top: 20px; color: #999; font-size: 12px;">
            Sent from Ritual Contact Form | Request ID: ${requestId}
          </p>
        </div>
      `,
      fromAddress
    );

    if (!adminEmailResult.success) {
      log("error", "Failed to send admin notification email", {
        requestId,
        error: adminEmailResult.error,
      });
      throw new Error(`Failed to send admin notification: ${adminEmailResult.error}`);
    }

    log("info", "Admin notification email sent successfully", {
      requestId,
      emailId: adminEmailResult.id,
    });

    // Send confirmation email to user (non-blocking - don't fail if this fails)
    let userEmailSuccess = false;
    let userEmailError: string | null = null;

    log("info", "Attempting to send user confirmation email", { requestId, maskedEmail: maskEmail(email) });
    
    const userEmailResult = await sendEmail(
      RESEND_API_KEY,
      [email],
      "We received your message!",
      `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333; margin-bottom: 20px;">Thanks for reaching out, ${name}!</h2>
          
          <p style="color: #555; line-height: 1.6;">
            We've received your message and will get back to you as soon as possible, 
            typically within 24 hours.
          </p>
          
          <div style="background: #f9f9f9; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <p style="margin: 0 0 10px;"><strong>Your message:</strong></p>
            <p style="margin: 0; color: #555; white-space: pre-wrap;">${message}</p>
          </div>
          
          <p style="color: #555; line-height: 1.6;">
            In the meantime, feel free to explore more about how Ritual can help you 
            and your partner create meaningful connections.
          </p>
          
          <p style="margin-top: 30px; color: #333;">
            Best,<br>
            The Ritual Team
          </p>
        </div>
      `,
      "Ritual <onboarding@resend.dev>"
    );

    if (!userEmailResult.success) {
      userEmailError = userEmailResult.error || "Unknown error";
      log("warn", "User confirmation email failed", {
        requestId,
        error: userEmailError,
        maskedEmail: maskEmail(email),
        note: "This is non-blocking - admin was notified successfully. User email likely failed because onboarding@resend.dev can only send to the Resend account owner email.",
      });
    } else {
      userEmailSuccess = true;
      log("info", "User confirmation email sent successfully", {
        requestId,
        emailId: userEmailResult.id,
      });
    }

    const executionTime = Date.now() - startTime;
    log("info", "Request completed successfully", {
      requestId,
      executionTimeMs: executionTime,
      adminEmailSent: true,
      userEmailSent: userEmailSuccess,
      userEmailError: userEmailError,
    });

    return new Response(
      JSON.stringify({
        success: true,
        requestId,
        adminNotified: true,
        userConfirmationSent: userEmailSuccess,
        userConfirmationError: userEmailError,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const executionTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    log("error", "Request failed with error", {
      requestId,
      error: errorMessage,
      stack: errorStack,
      executionTimeMs: executionTime,
    });

    return new Response(
      JSON.stringify({ error: errorMessage, requestId }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
