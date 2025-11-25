import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    // Check rate limit: max once per hour
    const { data: cycle } = await supabaseClient
      .from('weekly_cycles')
      .select('nudged_at, couple_id')
      .eq('id', cycleId)
      .single();

    if (!cycle) {
      return new Response(
        JSON.stringify({ error: 'Cycle not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user is part of this couple
    const { data: couple } = await supabaseClient
      .from('couples')
      .select('partner_one, partner_two')
      .eq('id', cycle.couple_id)
      .single();

    if (!couple || (couple.partner_one !== user.id && couple.partner_two !== user.id)) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check rate limit
    if (cycle.nudged_at) {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      if (new Date(cycle.nudged_at) > oneHourAgo) {
        return new Response(
          JSON.stringify({ error: 'Please wait an hour before sending another reminder' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Update nudge timestamp
    const { error } = await supabaseClient
      .from('weekly_cycles')
      .update({ nudged_at: new Date().toISOString() })
      .eq('id', cycleId);

    if (error) throw error;

    console.log(`Nudge sent for cycle ${cycleId} by user ${user.id}`);

    return new Response(
      JSON.stringify({ success: true, message: 'Nudge sent successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in nudge-partner:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});