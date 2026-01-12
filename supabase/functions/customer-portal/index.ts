import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[CUSTOMER-PORTAL] Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      throw new Error("Supabase configuration missing");
    }

    const supabaseClient = createClient(
      SUPABASE_URL,
      SERVICE_ROLE_KEY,
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated");

    console.log("[CUSTOMER-PORTAL] User:", user.id);

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Get couple's stripe customer ID
    const { data: couple } = await supabaseClient
      .from("couples")
      .select("stripe_customer_id")
      .or(`partner_one.eq.${user.id},partner_two.eq.${user.id}`)
      .eq("is_active", true)
      .single();

    let customerId = couple?.stripe_customer_id;

    // Fallback to email lookup
    if (!customerId) {
      const customers = await stripe.customers.list({ email: user.email, limit: 1 });
      if (customers.data.length === 0) {
        throw new Error("No Stripe customer found");
      }
      customerId = customers.data[0].id;
    }

    console.log("[CUSTOMER-PORTAL] Customer ID:", customerId);

    const origin = req.headers.get("origin") || "https://tryritual.co";
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/profile`,
    });

    console.log("[CUSTOMER-PORTAL] Portal session created");

    return new Response(JSON.stringify({ url: portalSession.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("[CUSTOMER-PORTAL] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
