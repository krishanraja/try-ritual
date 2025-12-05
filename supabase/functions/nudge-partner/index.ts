import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const FREE_NUDGES_PER_WEEK = 1;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { cycleId } = await req.json();

    if (!cycleId) {
      return new Response(
        JSON.stringify({ error: 'Missing cycleId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get cycle with nudge count
    const { data: cycle } = await supabaseClient
      .from('weekly_cycles')
      .select('nudged_at, couple_id, nudge_count')
      .eq('id', cycleId)
      .single();

    if (!cycle) {
      return new Response(
        JSON.stringify({ error: 'Cycle not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user is part of this couple and check premium status
    const { data: couple } = await supabaseClient
      .from('couples')
      .select('partner_one, partner_two, premium_expires_at')
      .eq('id', cycle.couple_id)
      .single();

    if (!couple || (couple.partner_one !== user.id && couple.partner_two !== user.id)) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if premium
    const isPremium = couple.premium_expires_at && 
      new Date(couple.premium_expires_at) > new Date();

    // Check hourly rate limit (applies to everyone)
    if (cycle.nudged_at) {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      if (new Date(cycle.nudged_at) > oneHourAgo) {
        return new Response(
          JSON.stringify({ error: 'Please wait an hour before sending another reminder' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Check weekly limit for free users
    const nudgeCount = cycle.nudge_count || 0;
    if (!isPremium && nudgeCount >= FREE_NUDGES_PER_WEEK) {
      console.log(`[NUDGE] Free user ${user.id} hit weekly limit`);
      return new Response(
        JSON.stringify({ 
          error: 'You\'ve used your weekly nudge. Upgrade to Premium for unlimited nudges.',
          code: 'weekly_limit_reached'
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update nudge timestamp and increment count
    const { error } = await supabaseClient
      .from('weekly_cycles')
      .update({ 
        nudged_at: new Date().toISOString(),
        nudge_count: nudgeCount + 1
      })
      .eq('id', cycleId);

    if (error) throw error;

    // Send push notification to partner
    const partnerId = couple.partner_one === user.id ? couple.partner_two : couple.partner_one;
    if (partnerId) {
      try {
        const sendPushUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-push`;
        await fetch(sendPushUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`
          },
          body: JSON.stringify({
            user_id: partnerId,
            title: "💕 Your partner is waiting!",
            body: "They're excited to create this week's ritual with you",
            url: "/input",
            type: "nudge"
          })
        });
        console.log(`[NUDGE] Push notification sent to partner ${partnerId}`);
      } catch (pushError) {
        console.error("[NUDGE] Error sending push:", pushError);
        // Don't fail the nudge if push fails
      }
    }

    console.log(`[NUDGE] Sent for cycle ${cycleId} by user ${user.id} (premium: ${isPremium}, count: ${nudgeCount + 1})`);

    return new Response(
      JSON.stringify({ success: true, message: 'Nudge sent successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[NUDGE] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});