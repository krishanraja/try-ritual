import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PRICE_ID = "price_1Saq4wHGqJqsGEJLN0D1MACf";

// Coupon mappings for promo codes
const PROMO_CODES: Record<string, string> = {
  "GETINVOLVED": "mzqYdlcf", // 100% off forever
  "3MONTHS": "aB3HsS4D"       // 100% off for 3 months
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    console.log("[CREATE-CHECKOUT] Function started");

    // Get authenticated user
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    
    if (!user?.email) {
      throw new Error("User not authenticated or email not available");
    }
    console.log("[CREATE-CHECKOUT] User authenticated:", user.id);

    // Parse request body for promo code
    let promoCode: string | undefined;
    try {
      const body = await req.json();
      promoCode = body.promo_code?.toUpperCase();
    } catch {
      // No body or invalid JSON, proceed without promo code
    }

    console.log("[CREATE-CHECKOUT] Promo code:", promoCode || "none");

    // Get user's couple
    const { data: couple, error: coupleError } = await supabaseClient
      .from("couples")
      .select("id, stripe_customer_id")
      .or(`partner_one.eq.${user.id},partner_two.eq.${user.id}`)
      .eq("is_active", true)
      .single();

    if (coupleError || !couple) {
      throw new Error("User is not part of an active couple");
    }
    console.log("[CREATE-CHECKOUT] Found couple:", couple.id);

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Check if customer already exists
    let customerId = couple.stripe_customer_id;
    
    if (!customerId) {
      // Check Stripe for existing customer by email
      const customers = await stripe.customers.list({ email: user.email, limit: 1 });
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
      }
    }

    console.log("[CREATE-CHECKOUT] Customer ID:", customerId || "new customer");

    // Validate and get coupon ID if promo code provided
    let couponId: string | undefined;
    if (promoCode && PROMO_CODES[promoCode]) {
      couponId = PROMO_CODES[promoCode];
      console.log("[CREATE-CHECKOUT] Applying coupon:", couponId);
    } else if (promoCode) {
      console.log("[CREATE-CHECKOUT] Invalid promo code:", promoCode);
    }

    // Create checkout session
    const origin = req.headers.get("origin") || "https://lovable.dev";
    
    const sessionConfig: Stripe.Checkout.SessionCreateParams = {
      customer: customerId || undefined,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price: PRICE_ID,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${origin}/profile?checkout=success`,
      cancel_url: `${origin}/profile?checkout=cancelled`,
      metadata: {
        couple_id: couple.id,
        user_id: user.id,
        promo_code: promoCode || ""
      },
      subscription_data: {
        metadata: {
          couple_id: couple.id,
        },
      },
      // Allow Stripe's promotion code input as fallback
      allow_promotion_codes: !couponId,
    };

    // Apply coupon if valid promo code was provided
    if (couponId) {
      sessionConfig.discounts = [{ coupon: couponId }];
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);

    console.log("[CREATE-CHECKOUT] Session created:", session.id);

    // Store the applied promo code if valid
    if (promoCode && couponId) {
      await supabaseClient
        .from("couples")
        .update({ applied_promo_code: promoCode })
        .eq("id", couple.id);
    }

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("[CREATE-CHECKOUT] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
