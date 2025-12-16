import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY");
  
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error("[STRIPE-WEBHOOK] Supabase configuration missing");
    return new Response(JSON.stringify({ error: "Database configuration missing" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseClient = createClient(
    SUPABASE_URL,
    SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );

  try {
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const signature = req.headers.get("stripe-signature");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    
    // SECURITY: Signature verification is mandatory
    if (!webhookSecret) {
      console.error("[STRIPE-WEBHOOK] STRIPE_WEBHOOK_SECRET is not configured");
      return new Response(JSON.stringify({ error: "Webhook not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    if (!signature) {
      console.error("[STRIPE-WEBHOOK] Missing stripe-signature header");
      return new Response(JSON.stringify({ error: "Missing signature" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    const body = await req.text();
    let event: Stripe.Event;
    
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error("[STRIPE-WEBHOOK] Signature verification failed:", err);
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[STRIPE-WEBHOOK] Event type:", event.type);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const coupleId = session.metadata?.couple_id;
        const customerId = session.customer as string;

        if (coupleId) {
          console.log("[STRIPE-WEBHOOK] Checkout completed for couple:", coupleId);

          // Get subscription details
          if (session.subscription) {
            const subscription = await stripe.subscriptions.retrieve(
              session.subscription as string
            );
            const expiresAt = new Date(subscription.current_period_end * 1000);

            await supabaseClient
              .from("couples")
              .update({
                stripe_customer_id: customerId,
                subscription_id: subscription.id,
                premium_expires_at: expiresAt.toISOString(),
              })
              .eq("id", coupleId);

            console.log("[STRIPE-WEBHOOK] Couple upgraded to premium");
          }
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const coupleId = subscription.metadata?.couple_id;

        if (coupleId) {
          const expiresAt = new Date(subscription.current_period_end * 1000);
          
          await supabaseClient
            .from("couples")
            .update({
              subscription_id: subscription.id,
              premium_expires_at: subscription.status === "active" 
                ? expiresAt.toISOString() 
                : null,
            })
            .eq("id", coupleId);

          console.log("[STRIPE-WEBHOOK] Subscription updated for couple:", coupleId);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const coupleId = subscription.metadata?.couple_id;

        if (coupleId) {
          await supabaseClient
            .from("couples")
            .update({
              subscription_id: null,
              premium_expires_at: null,
            })
            .eq("id", coupleId);

          console.log("[STRIPE-WEBHOOK] Subscription cancelled for couple:", coupleId);
        } else {
          // Find couple by customer ID
          const customerId = subscription.customer as string;
          await supabaseClient
            .from("couples")
            .update({
              subscription_id: null,
              premium_expires_at: null,
            })
            .eq("stripe_customer_id", customerId);
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.subscription) {
          const subscription = await stripe.subscriptions.retrieve(
            invoice.subscription as string
          );
          const coupleId = subscription.metadata?.couple_id;

          if (coupleId) {
            const expiresAt = new Date(subscription.current_period_end * 1000);
            
            await supabaseClient
              .from("couples")
              .update({
                premium_expires_at: expiresAt.toISOString(),
              })
              .eq("id", coupleId);

            console.log("[STRIPE-WEBHOOK] Payment succeeded, extended premium for:", coupleId);
          }
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        console.log("[STRIPE-WEBHOOK] Payment failed for invoice:", invoice.id);
        // Could send notification to user here
        break;
      }

      default:
        console.log("[STRIPE-WEBHOOK] Unhandled event type:", event.type);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("[STRIPE-WEBHOOK] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
