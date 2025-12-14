/**
 * trigger-synthesis Edge Function
 * 
 * Idempotent synthesis trigger that ensures only one synthesis runs per cycle.
 * This prevents race conditions when both partners submit simultaneously.
 * 
 * Key guarantees:
 * 1. Only triggers synthesis if both partners have submitted
 * 2. Uses atomic update with conditional check to prevent duplicates
 * 3. Returns existing rituals if already generated
 * 4. Can be safely retried on failure
 */

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const log = (level: string, message: string, data?: Record<string, unknown>) => {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    function: 'trigger-synthesis',
    message,
    ...data,
  }));
};

serve(async (req) => {
  const requestId = crypto.randomUUID();

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    log('info', 'Function invoked', { requestId });

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { cycleId, forceRetry = false } = await req.json();

    if (!cycleId) {
      return new Response(
        JSON.stringify({ error: 'cycleId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    log('info', 'Checking cycle state', { requestId, cycleId, forceRetry });

    // Step 1: Fetch current cycle state
    const { data: cycle, error: fetchError } = await supabaseClient
      .from('weekly_cycles')
      .select('*, couples!inner(preferred_city)')
      .eq('id', cycleId)
      .single();

    if (fetchError || !cycle) {
      log('error', 'Cycle not found', { requestId, cycleId, error: fetchError?.message });
      return new Response(
        JSON.stringify({ error: 'Cycle not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 2: If already synthesized, return existing rituals
    if (cycle.synthesized_output && !forceRetry) {
      log('info', 'Rituals already exist', { requestId, cycleId });
      return new Response(
        JSON.stringify({ 
          status: 'ready',
          rituals: (cycle.synthesized_output as any).rituals,
          message: 'Rituals already generated'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 3: Check if both partners have submitted
    if (!cycle.partner_one_input || !cycle.partner_two_input) {
      log('info', 'Not both partners ready', { 
        requestId, 
        cycleId,
        hasPartnerOne: !!cycle.partner_one_input,
        hasPartnerTwo: !!cycle.partner_two_input
      });
      return new Response(
        JSON.stringify({ 
          status: 'waiting',
          message: 'Waiting for both partners to submit',
          partnerOneReady: !!cycle.partner_one_input,
          partnerTwoReady: !!cycle.partner_two_input
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 4: Try to acquire synthesis lock using atomic conditional update
    // Only set generated_at if it's currently null (or if forceRetry)
    const lockTimestamp = new Date().toISOString();
    
    let lockAcquired = false;
    
    if (forceRetry) {
      // Force retry - always acquire lock
      const { error: lockError } = await supabaseClient
        .from('weekly_cycles')
        .update({ 
          generated_at: lockTimestamp,
          synthesized_output: null // Clear old output for retry
        })
        .eq('id', cycleId);
      
      lockAcquired = !lockError;
    } else {
      // Normal case - only acquire if not already locked
      const { data: lockResult, error: lockError } = await supabaseClient
        .from('weekly_cycles')
        .update({ generated_at: lockTimestamp })
        .eq('id', cycleId)
        .is('generated_at', null)
        .select('id');
      
      lockAcquired = !lockError && lockResult && lockResult.length > 0;
    }

    if (!lockAcquired) {
      // Another process is already running synthesis
      log('info', 'Synthesis already in progress', { requestId, cycleId });
      return new Response(
        JSON.stringify({ 
          status: 'generating',
          message: 'Synthesis already in progress'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    log('info', 'Lock acquired, starting synthesis', { requestId, cycleId });

    // Step 5: Call the main synthesize-rituals function
    try {
      const userCity = (cycle.couples as any)?.preferred_city || 'New York';
      
      // FIX #6: Sanitize inputs before sending to AI
      const sanitizeInput = (input: any): any => {
        if (!input) return input;
        if (typeof input === 'string') {
          return input
            .replace(/ignore\s+previous\s+instructions/gi, '')
            .replace(/system\s*:/gi, '')
            .replace(/assistant\s*:/gi, '')
            .replace(/user\s*:/gi, '')
            .trim();
        }
        if (typeof input === 'object' && input !== null) {
          const sanitized: any = Array.isArray(input) ? [] : {};
          for (const key in input) {
            sanitized[key] = sanitizeInput(input[key]);
          }
          return sanitized;
        }
        return input;
      };

      const synthesisResponse = await supabaseClient.functions.invoke('synthesize-rituals', {
        body: {
          partnerOneInput: sanitizeInput(cycle.partner_one_input),
          partnerTwoInput: sanitizeInput(cycle.partner_two_input),
          coupleId: cycle.couple_id,
          userCity
        }
      });

      if (synthesisResponse.error) {
        throw new Error(synthesisResponse.error.message || 'Synthesis failed');
      }

      const rituals = synthesisResponse.data?.rituals;
      
      if (!rituals || !Array.isArray(rituals) || rituals.length === 0) {
        throw new Error('Synthesis returned no rituals');
      }

      log('info', 'Synthesis successful', { requestId, cycleId, ritualCount: rituals.length });

      // Step 6: Save the synthesized output
      const { error: saveError } = await supabaseClient
        .from('weekly_cycles')
        .update({
          synthesized_output: { rituals },
          sync_completed_at: new Date().toISOString()
        })
        .eq('id', cycleId);

      if (saveError) {
        throw new Error(`Failed to save rituals: ${saveError.message}`);
      }

      return new Response(
        JSON.stringify({ 
          status: 'ready',
          rituals,
          message: 'Rituals generated successfully'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (synthesisError) {
      // Synthesis failed - clear the lock so retry is possible
      log('error', 'Synthesis failed', { 
        requestId, 
        cycleId, 
        error: synthesisError instanceof Error ? synthesisError.message : 'Unknown error'
      });

      // Clear generated_at to release the lock
      await supabaseClient
        .from('weekly_cycles')
        .update({ generated_at: null })
        .eq('id', cycleId);

      return new Response(
        JSON.stringify({ 
          status: 'failed',
          error: synthesisError instanceof Error ? synthesisError.message : 'Synthesis failed',
          canRetry: true
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    log('error', 'Function failed', { requestId, error: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage, canRetry: true }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
