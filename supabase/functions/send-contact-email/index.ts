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

const SUBJECT_LABELS: Record<string, string> = {
  general: "General Inquiry",
  support: "Technical Support",
  feedback: "Product Feedback",
  partnership: "Partnership Opportunity",
  billing: "Billing Question",
  other: "Other",
};

const handler = async (req: Request): Promise<Response> => {
  console.log("send-contact-email function called");

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const { name, email, subject, message }: ContactRequest = await req.json();
    console.log("Contact form submission from:", email);

    // Validate input
    if (!name || !email || !subject || !message) {
      return new Response(
        JSON.stringify({ error: "All fields are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const subjectLabel = SUBJECT_LABELS[subject] || subject;

    // Send notification email to admin
    const adminEmailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Ritual Contact <onboarding@resend.dev>",
        to: ["hello@krishraja.com"],
        subject: `[Ritual Contact] ${subjectLabel} from ${name}`,
        html: `
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
              Sent from Ritual Contact Form
            </p>
          </div>
        `,
      }),
    });

    if (!adminEmailRes.ok) {
      const errorData = await adminEmailRes.text();
      console.error("Failed to send admin email:", errorData);
      throw new Error("Failed to send admin notification email");
    }

    console.log("Admin email sent successfully");

    // Send confirmation email to user
    const userEmailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Ritual <onboarding@resend.dev>",
        to: [email],
        subject: "We received your message!",
        html: `
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
      }),
    });

    if (!userEmailRes.ok) {
      console.error("Failed to send user confirmation email");
    } else {
      console.log("User confirmation email sent successfully");
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in send-contact-email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
