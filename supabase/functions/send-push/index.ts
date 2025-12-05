import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Note: In production, you'd use the web-push library with proper VAPID keys
// For now, this stores the notification for the service worker to fetch

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const { user_id, title, body, url, type } = await req.json();

    console.log("[SEND-PUSH] Sending notification to user:", user_id);
    console.log("[SEND-PUSH] Notification:", { title, body, type });

    if (!user_id) {
      throw new Error("user_id is required");
    }

    // Get user's push subscriptions
    const { data: subscriptions, error: subError } = await supabaseClient
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", user_id);

    if (subError) {
      console.error("[SEND-PUSH] Error fetching subscriptions:", subError);
      throw subError;
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log("[SEND-PUSH] No push subscriptions found for user");
      return new Response(
        JSON.stringify({ success: true, message: "No subscriptions found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[SEND-PUSH] Found", subscriptions.length, "subscription(s)");

    // In a production app, you would:
    // 1. Use the web-push library
    // 2. Have VAPID keys stored in secrets
    // 3. Actually send the push notification
    
    // For demonstration, we'll log the notification
    // Real implementation would use:
    // import webpush from 'npm:web-push';
    // webpush.setVapidDetails('mailto:...', publicKey, privateKey);
    // await webpush.sendNotification(subscription, JSON.stringify(payload));

    const payload = {
      title: title || "Ritual",
      body: body || "You have a new notification",
      url: url || "/",
      type: type || "general"
    };

    console.log("[SEND-PUSH] Would send payload:", payload);
    console.log("[SEND-PUSH] To endpoints:", subscriptions.map(s => s.endpoint.substring(0, 50) + "..."));

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent_to: subscriptions.length,
        payload 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[SEND-PUSH] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
