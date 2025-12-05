import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Surprise ritual templates
const SURPRISE_RITUALS = [
  {
    title: "Starlight Picnic",
    description: "Pack a blanket, some snacks, and head outside after dark. Find a spot to stargaze together and share your dreams for the future.",
    time_estimate: "1-2 hours",
    category: "Adventure"
  },
  {
    title: "Memory Lane Walk",
    description: "Visit a place that's meaningful to your relationship - where you first met, first date spot, or a favorite shared memory location.",
    time_estimate: "2-3 hours",
    category: "Nostalgia"
  },
  {
    title: "Blindfolded Taste Test",
    description: "Take turns blindfolding each other and trying different foods. Guess what you're eating and rate each other's picks!",
    time_estimate: "45 min",
    category: "Playful"
  },
  {
    title: "Love Letter Exchange",
    description: "Write heartfelt letters to each other about what you love most about your relationship. Exchange and read them together over tea or wine.",
    time_estimate: "1 hour",
    category: "Intimate"
  },
  {
    title: "Sunrise Adventure",
    description: "Wake up early and watch the sunrise together from a scenic spot. Bring hot coffee and share what you're grateful for.",
    time_estimate: "2 hours",
    category: "Adventure"
  },
  {
    title: "DIY Spa Night",
    description: "Create a home spa experience with face masks, massages, candles, and relaxing music. Take turns pampering each other.",
    time_estimate: "1-2 hours",
    category: "Relaxation"
  },
  {
    title: "Dance in the Living Room",
    description: "Create a playlist of 'your songs' and dance together at home. No judgment, just connection and fun.",
    time_estimate: "30 min",
    category: "Playful"
  },
  {
    title: "Future Planning Date",
    description: "Dream together about your future - create a vision board, plan a future trip, or discuss your 5-year dreams.",
    time_estimate: "1-2 hours",
    category: "Growth"
  }
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    console.log("[DELIVER-SURPRISE] Starting surprise ritual delivery");

    const now = new Date();
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

    // Find all premium couples who haven't received a surprise this month
    const { data: eligibleCouples, error: couplesError } = await supabaseClient
      .from("couples")
      .select("id, partner_one, partner_two, premium_expires_at")
      .eq("is_active", true)
      .not("partner_two", "is", null)
      .gt("premium_expires_at", now.toISOString());

    if (couplesError) {
      console.error("[DELIVER-SURPRISE] Error fetching couples:", couplesError);
      throw couplesError;
    }

    console.log("[DELIVER-SURPRISE] Found", eligibleCouples?.length || 0, "premium couples");

    let deliveredCount = 0;

    for (const couple of eligibleCouples || []) {
      // Check if already delivered this month
      const { data: existing } = await supabaseClient
        .from("surprise_rituals")
        .select("id")
        .eq("couple_id", couple.id)
        .eq("month", currentMonth)
        .single();

      if (existing) {
        console.log("[DELIVER-SURPRISE] Skipping couple", couple.id, "- already has surprise this month");
        continue;
      }

      // Select a random surprise ritual
      const ritual = SURPRISE_RITUALS[Math.floor(Math.random() * SURPRISE_RITUALS.length)];

      // Insert surprise ritual
      const { error: insertError } = await supabaseClient
        .from("surprise_rituals")
        .insert({
          couple_id: couple.id,
          ritual_data: ritual,
          month: currentMonth
        });

      if (insertError) {
        console.error("[DELIVER-SURPRISE] Error inserting for couple", couple.id, ":", insertError);
        continue;
      }

      console.log("[DELIVER-SURPRISE] Delivered surprise to couple", couple.id);
      deliveredCount++;

      // Send push notifications to both partners
      const sendPushUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-push`;
      const authHeader = `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`;

      for (const partnerId of [couple.partner_one, couple.partner_two]) {
        if (partnerId) {
          try {
            await fetch(sendPushUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": authHeader
              },
              body: JSON.stringify({
                user_id: partnerId,
                title: "🎁 Surprise Ritual!",
                body: "A special surprise ritual is waiting for you!",
                url: "/",
                type: "surprise_ritual"
              })
            });
          } catch (pushError) {
            console.error("[DELIVER-SURPRISE] Error sending push to", partnerId, ":", pushError);
          }
        }
      }
    }

    console.log("[DELIVER-SURPRISE] Completed. Delivered to", deliveredCount, "couples");

    return new Response(
      JSON.stringify({ 
        success: true, 
        delivered: deliveredCount,
        month: currentMonth
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[DELIVER-SURPRISE] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
