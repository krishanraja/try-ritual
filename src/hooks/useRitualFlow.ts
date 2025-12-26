/**
 * useRitualFlow Hook
 * 
 * Single source of truth for the entire ritual flow.
 * Manages state, realtime sync, and all user actions.
 * 
 * @created 2025-12-26
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCouple } from '@/contexts/CoupleContext';
import {
  CycleStatus,
  FlowPhase,
  WeeklyCycle,
  Ritual,
  RitualPreference,
  AvailabilitySlot,
  UserProgress,
  MatchResult,
  TimeSlot,
  computeFlowPhase,
  computeMatch,
  getStatusMessage,
  dayOffsetToDate,
  getSlotTimeRange,
} from '@/types/database';

interface UseRitualFlowReturn {
  // Core state
  loading: boolean;
  error: string | null;
  
  // Cycle data
  cycle: WeeklyCycle | null;
  status: CycleStatus;
  phase: FlowPhase;
  rituals: Ritual[];
  
  // Progress tracking
  myProgress: UserProgress;
  partnerProgress: UserProgress;
  
  // Match result (when both have picked)
  matchResult: MatchResult | null;
  
  // Status display
  statusMessage: { title: string; subtitle: string };
  
  // Local input state (for cards phase)
  selectedCards: string[];
  desire: string;
  
  // Actions - Input phase
  selectCard: (cardId: string) => void;
  setDesire: (desire: string) => void;
  submitInput: () => Promise<void>;
  
  // Actions - Pick phase
  rankRitual: (ritual: Ritual, rank: number) => Promise<void>;
  removeRank: (rank: number) => Promise<void>;
  toggleAvailability: (dayOffset: number, timeSlot: TimeSlot) => Promise<void>;
  submitPicks: () => Promise<void>;
  
  // Actions - Match phase
  confirmMatch: () => Promise<void>;
  
  // Actions - General
  retryGeneration: () => Promise<void>;
  refresh: () => Promise<void>;
}

export function useRitualFlow(): UseRitualFlowReturn {
  const { user, couple, partnerProfile, refreshCycle } = useCouple();
  
  // Local state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cycle, setCycle] = useState<WeeklyCycle | null>(null);
  
  // Input phase state
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [desire, setDesireState] = useState('');
  
  // Pick phase state
  const [myPicks, setMyPicks] = useState<RitualPreference[]>([]);
  const [partnerPicks, setPartnerPicks] = useState<RitualPreference[]>([]);
  const [mySlots, setMySlots] = useState<AvailabilitySlot[]>([]);
  const [partnerSlots, setPartnerSlots] = useState<AvailabilitySlot[]>([]);
  
  // Derived values
  const isPartnerOne = couple?.partner_one === user?.id;
  const partnerId = isPartnerOne ? couple?.partner_two : couple?.partner_one;
  const partnerName = partnerProfile?.name || 'your partner';
  
  // Get status from cycle, with fallback
  const status: CycleStatus = (cycle as any)?.status || 'awaiting_both_input';
  
  const rituals: Ritual[] = useMemo(() => {
    if (!cycle?.synthesized_output) return [];
    const output = cycle.synthesized_output as any;
    return output?.rituals || [];
  }, [cycle?.synthesized_output]);
  
  const myProgress: UserProgress = useMemo(() => {
    const myInput = isPartnerOne ? cycle?.partner_one_input : cycle?.partner_two_input;
    return {
      inputDone: !!myInput,
      inputData: myInput as any,
      picksDone: myPicks.length >= 3,
      picks: myPicks,
      availabilityDone: mySlots.length > 0,
      availability: mySlots,
    };
  }, [cycle, isPartnerOne, myPicks, mySlots]);
  
  const partnerProgress: UserProgress = useMemo(() => {
    const partnerInput = isPartnerOne ? cycle?.partner_two_input : cycle?.partner_one_input;
    return {
      inputDone: !!partnerInput,
      inputData: partnerInput as any,
      picksDone: partnerPicks.length >= 3,
      picks: partnerPicks,
      availabilityDone: partnerSlots.length > 0,
      availability: partnerSlots,
    };
  }, [cycle, isPartnerOne, partnerPicks, partnerSlots]);
  
  const phase = useMemo(() => 
    computeFlowPhase(status, isPartnerOne, myProgress),
    [status, isPartnerOne, myProgress]
  );
  
  const statusMessage = useMemo(() =>
    getStatusMessage(status, partnerName, isPartnerOne),
    [status, partnerName, isPartnerOne]
  );
  
  const matchResult = useMemo(() => {
    if (myPicks.length === 0 && partnerPicks.length === 0) return null;
    return computeMatch(myPicks, partnerPicks, mySlots, partnerSlots, rituals);
  }, [myPicks, partnerPicks, mySlots, partnerSlots, rituals]);

  // ============================================================================
  // Data Loading
  // ============================================================================
  
  const loadPicks = useCallback(async (cycleId: string) => {
    if (!user?.id || !partnerId) return;
    
    try {
      const { data: allPicks } = await supabase
        .from('ritual_preferences')
        .select('*')
        .eq('weekly_cycle_id', cycleId)
        .order('rank', { ascending: true });
      
      if (allPicks) {
        setMyPicks(allPicks.filter(p => p.user_id === user.id));
        setPartnerPicks(allPicks.filter(p => p.user_id === partnerId));
      }
    } catch (err) {
      console.warn('[useRitualFlow] Error loading picks:', err);
    }
  }, [user?.id, partnerId]);
  
  const loadAvailability = useCallback(async (cycleId: string) => {
    if (!user?.id || !partnerId) return;
    
    try {
      const { data: allSlots } = await supabase
        .from('availability_slots')
        .select('*')
        .eq('weekly_cycle_id', cycleId);
      
      if (allSlots) {
        setMySlots(allSlots.filter(s => s.user_id === user.id));
        setPartnerSlots(allSlots.filter(s => s.user_id === partnerId));
      }
    } catch (err) {
      console.warn('[useRitualFlow] Error loading availability:', err);
    }
  }, [user?.id, partnerId]);
  
  const loadCycleData = useCallback(async () => {
    // #region agent log
    fetch('http://127.0.0.1:7250/ingest/1e40f760-cc38-4a6c-aac8-84efd2c161d0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useRitualFlow.ts:loadCycleData:entry',message:'loadCycleData called',data:{coupleId:couple?.id,preferredCity:couple?.preferred_city,userId:user?.id,hasCouple:!!couple,hasUser:!!user},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1'})}).catch(()=>{});
    // #endregion
    if (!couple?.id || !user?.id) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Get or create current week's cycle
      const { getWeekStartDate } = await import('@/utils/timezoneUtils');
      const preferredCity = (couple.preferred_city || 'New York') as 'London' | 'Sydney' | 'Melbourne' | 'New York';
      const weekStart = getWeekStartDate(preferredCity);
      
      // Try to get existing cycle
      let { data: existingCycle, error: fetchError } = await supabase
        .from('weekly_cycles')
        .select('*')
        .eq('couple_id', couple.id)
        .eq('week_start_date', weekStart)
        .maybeSingle();
      
      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }
      
      // Create if doesn't exist
      if (!existingCycle) {
        // Note: Don't include 'status' column - migration may not be run yet
        // The status column has a default value in DB, so it will be set automatically
        const { data: newCycle, error: createError } = await supabase
          .from('weekly_cycles')
          .insert({
            couple_id: couple.id,
            week_start_date: weekStart
          })
          .select()
          .single();
        
        if (createError) {
          // Handle race condition - another request created it
          if (createError.code === '23505') {
            const { data: retryFetch } = await supabase
              .from('weekly_cycles')
              .select('*')
              .eq('couple_id', couple.id)
              .eq('week_start_date', weekStart)
              .single();
            existingCycle = retryFetch;
          } else {
            throw createError;
          }
        } else {
          existingCycle = newCycle;
        }
      }
      
      // #region agent log
      fetch('http://127.0.0.1:7250/ingest/1e40f760-cc38-4a6c-aac8-84efd2c161d0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useRitualFlow.ts:loadCycleData:afterFetch',message:'Cycle fetch/create result',data:{cycleId:existingCycle?.id,cycleStatus:existingCycle?.status,hasCycle:!!existingCycle},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H2'})}).catch(()=>{});
      // #endregion
      setCycle(existingCycle);
      
      // Restore input state if user has draft
      const myInput = isPartnerOne 
        ? existingCycle?.partner_one_input 
        : existingCycle?.partner_two_input;
      
      if (myInput) {
        const input = myInput as any;
        setSelectedCards(input.cards || []);
        setDesireState(input.desire || '');
      }
      
      // Load picks and availability
      if (existingCycle?.id) {
        await Promise.all([
          loadPicks(existingCycle.id),
          loadAvailability(existingCycle.id)
        ]);
      }
      
    } catch (err) {
      // #region agent log
      fetch('http://127.0.0.1:7250/ingest/1e40f760-cc38-4a6c-aac8-84efd2c161d0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useRitualFlow.ts:loadCycleData:error',message:'loadCycleData failed',data:{error:err instanceof Error ? err.message : String(err),coupleId:couple?.id},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H2'})}).catch(()=>{});
      // #endregion
      console.error('[useRitualFlow] Error loading cycle:', err);
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [couple?.id, couple?.preferred_city, user?.id, isPartnerOne, loadPicks, loadAvailability]);

  // ============================================================================
  // Realtime Subscription
  // ============================================================================
  
  useEffect(() => {
    if (!cycle?.id || !user?.id) return;
    
    console.log('[useRitualFlow] Setting up realtime subscription for cycle:', cycle.id);
    
    const channel = supabase
      .channel(`ritual-flow-${cycle.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'weekly_cycles',
        filter: `id=eq.${cycle.id}`
      }, (payload) => {
        console.log('[useRitualFlow] Cycle updated via realtime:', payload.new);
        setCycle(payload.new as WeeklyCycle);
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'ritual_preferences',
        filter: `weekly_cycle_id=eq.${cycle.id}`
      }, () => {
        // Reload picks when any change
        loadPicks(cycle.id);
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'availability_slots',
        filter: `weekly_cycle_id=eq.${cycle.id}`
      }, () => {
        // Reload availability when any change
        loadAvailability(cycle.id);
      })
      .subscribe((subStatus) => {
        if (subStatus === 'SUBSCRIBED') {
          console.log('[useRitualFlow] ✅ Realtime connected');
        }
      });
    
    return () => {
      console.log('[useRitualFlow] Cleaning up realtime subscription');
      supabase.removeChannel(channel);
    };
  }, [cycle?.id, user?.id, loadPicks, loadAvailability]);

  // Initial load
  useEffect(() => {
    loadCycleData();
  }, [loadCycleData]);

  // ============================================================================
  // Actions - Input Phase
  // ============================================================================
  
  const selectCard = useCallback((cardId: string) => {
    setSelectedCards(prev => {
      if (prev.includes(cardId)) {
        return prev.filter(c => c !== cardId);
      }
      // Max 5 cards
      if (prev.length >= 5) {
        return [...prev.slice(1), cardId];
      }
      return [...prev, cardId];
    });
  }, []);
  
  const setDesire = useCallback((value: string) => {
    setDesireState(value);
  }, []);
  
  const submitInput = useCallback(async () => {
    // #region agent log
    fetch('http://127.0.0.1:7250/ingest/1e40f760-cc38-4a6c-aac8-84efd2c161d0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useRitualFlow.ts:submitInput:entry',message:'submitInput called',data:{cycleId:cycle?.id,userId:user?.id,selectedCardsLength:selectedCards.length,hasCycle:!!cycle,hasUser:!!user},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1-H2'})}).catch(()=>{});
    // #endregion
    
    // Separate validation checks with specific error messages
    if (!cycle?.id) {
      setError('Failed to initialize. Please refresh the page.');
      return;
    }
    if (!user?.id) {
      setError('Session expired. Please sign in again.');
      return;
    }
    if (selectedCards.length < 3) {
      setError('Please select at least 3 mood cards');
      return;
    }
    
    setError(null);
    
    const inputData = {
      cards: selectedCards,
      desire: desire.trim() || null,
      inputType: 'cards' as const
    };
    
    const updateField = isPartnerOne ? 'partner_one_input' : 'partner_two_input';
    const submittedField = isPartnerOne ? 'partner_one_submitted_at' : 'partner_two_submitted_at';
    
    try {
      const { error: updateError } = await supabase
        .from('weekly_cycles')
        .update({
          [updateField]: inputData,
          [submittedField]: new Date().toISOString()
        })
        .eq('id', cycle.id);
      
      if (updateError) throw updateError;
      
      // Trigger synthesis if both are now complete
      const updatedCycle = { ...cycle, [updateField]: inputData };
      const bothComplete = updatedCycle.partner_one_input && updatedCycle.partner_two_input;
      
      if (bothComplete) {
        // Fire and forget - trigger will handle idempotency
        supabase.functions.invoke('trigger-synthesis', {
          body: { cycleId: cycle.id }
        }).catch(err => console.warn('[useRitualFlow] Synthesis trigger failed:', err));
      }
      
    } catch (err) {
      console.error('[useRitualFlow] Submit input error:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit');
    }
  }, [cycle, user?.id, selectedCards, desire, isPartnerOne]);

  // ============================================================================
  // Actions - Pick Phase
  // ============================================================================
  
  const rankRitual = useCallback(async (ritual: Ritual, rank: number) => {
    if (!cycle?.id || !user?.id) return;
    
    // Optimistic update
    setMyPicks(prev => {
      // Remove any existing pick at this rank or for this ritual
      const filtered = prev.filter(p => p.rank !== rank && p.ritual_title !== ritual.title);
      return [...filtered, {
        id: `temp-${Date.now()}`,
        weekly_cycle_id: cycle.id,
        user_id: user.id,
        ritual_title: ritual.title,
        ritual_data: ritual,
        rank,
        proposed_date: null,
        proposed_time: null,
        proposed_time_start: null,
        proposed_time_end: null,
        created_at: new Date().toISOString()
      } as any].sort((a, b) => a.rank - b.rank);
    });
    
    try {
      // Delete existing at this rank
      await supabase
        .from('ritual_preferences')
        .delete()
        .eq('weekly_cycle_id', cycle.id)
        .eq('user_id', user.id)
        .eq('rank', rank);
      
      // Delete if this ritual was at another rank
      await supabase
        .from('ritual_preferences')
        .delete()
        .eq('weekly_cycle_id', cycle.id)
        .eq('user_id', user.id)
        .eq('ritual_title', ritual.title);
      
      // Insert new
      const { error: insertError } = await supabase
        .from('ritual_preferences')
        .insert({
          weekly_cycle_id: cycle.id,
          user_id: user.id,
          ritual_title: ritual.title,
          ritual_data: ritual as any,
          rank
        });
      
      if (insertError) throw insertError;
      
    } catch (err) {
      console.error('[useRitualFlow] Rank ritual error:', err);
      // Reload picks to restore correct state
      await loadPicks(cycle.id);
    }
  }, [cycle?.id, user?.id, loadPicks]);
  
  const removeRank = useCallback(async (rank: number) => {
    if (!cycle?.id || !user?.id) return;
    
    // Optimistic update
    setMyPicks(prev => prev.filter(p => p.rank !== rank));
    
    try {
      await supabase
        .from('ritual_preferences')
        .delete()
        .eq('weekly_cycle_id', cycle.id)
        .eq('user_id', user.id)
        .eq('rank', rank);
    } catch (err) {
      console.error('[useRitualFlow] Remove rank error:', err);
      await loadPicks(cycle.id);
    }
  }, [cycle?.id, user?.id, loadPicks]);
  
  const toggleAvailability = useCallback(async (dayOffset: number, timeSlot: TimeSlot) => {
    if (!cycle?.id || !user?.id) return;
    
    const exists = mySlots.some(s => 
      s.day_offset === dayOffset && s.time_slot === timeSlot
    );
    
    // Optimistic update
    if (exists) {
      setMySlots(prev => prev.filter(s => 
        !(s.day_offset === dayOffset && s.time_slot === timeSlot)
      ));
    } else {
      setMySlots(prev => [...prev, {
        id: `temp-${Date.now()}`,
        weekly_cycle_id: cycle.id,
        user_id: user.id,
        day_offset: dayOffset,
        time_slot: timeSlot,
        created_at: new Date().toISOString()
      }]);
    }
    
    try {
      if (exists) {
        await supabase
          .from('availability_slots')
          .delete()
          .eq('weekly_cycle_id', cycle.id)
          .eq('user_id', user.id)
          .eq('day_offset', dayOffset)
          .eq('time_slot', timeSlot);
      } else {
        await supabase
          .from('availability_slots')
          .insert({
            weekly_cycle_id: cycle.id,
            user_id: user.id,
            day_offset: dayOffset,
            time_slot: timeSlot
          });
      }
    } catch (err) {
      console.error('[useRitualFlow] Toggle availability error:', err);
      // Reload to restore correct state
      await loadAvailability(cycle.id);
    }
  }, [cycle?.id, user?.id, mySlots, loadAvailability]);
  
  const submitPicks = useCallback(async () => {
    if (myPicks.length < 3) {
      setError('Please select your top 3 rituals');
      return;
    }
    
    if (mySlots.length === 0) {
      setError('Please select at least one time slot');
      return;
    }
    
    setError(null);
    
    // Picks and availability are already persisted
    // Just need to refresh to trigger status update
    await refreshCycle();
  }, [myPicks.length, mySlots.length, refreshCycle]);

  // ============================================================================
  // Actions - Match Phase
  // ============================================================================
  
  const confirmMatch = useCallback(async () => {
    if (!cycle?.id || !matchResult?.matchedRitual || !matchResult?.matchedSlot) {
      setError('No match to confirm');
      return;
    }
    
    setError(null);
    
    const date = dayOffsetToDate(matchResult.matchedSlot.dayOffset);
    const timeRange = getSlotTimeRange(matchResult.matchedSlot.timeSlot);
    
    try {
      const { error: updateError } = await supabase
        .from('weekly_cycles')
        .update({
          agreement_reached: true,
          agreed_ritual: matchResult.matchedRitual as any,
          agreed_date: date.toISOString().split('T')[0],
          agreed_time_start: timeRange.start,
          agreed_time_end: timeRange.end,
          agreed_time: timeRange.start // Legacy field
        })
        .eq('id', cycle.id);
      
      if (updateError) throw updateError;
      
    } catch (err) {
      console.error('[useRitualFlow] Confirm match error:', err);
      setError(err instanceof Error ? err.message : 'Failed to confirm');
    }
  }, [cycle?.id, matchResult]);

  // ============================================================================
  // Actions - General
  // ============================================================================
  
  const retryGeneration = useCallback(async () => {
    if (!cycle?.id) return;
    
    setError(null);
    
    try {
      const { data, error: fnError } = await supabase.functions.invoke('trigger-synthesis', {
        body: { cycleId: cycle.id, forceRetry: true }
      });
      
      if (fnError) throw fnError;
      
      if (data?.status === 'ready') {
        await loadCycleData();
      } else if (data?.status === 'failed') {
        setError(data.error || 'Generation failed');
      }
    } catch (err) {
      console.error('[useRitualFlow] Retry generation error:', err);
      setError(err instanceof Error ? err.message : 'Failed to retry');
    }
  }, [cycle?.id, loadCycleData]);
  
  const refresh = useCallback(async () => {
    await loadCycleData();
  }, [loadCycleData]);

  return {
    loading,
    error,
    cycle,
    status,
    phase,
    rituals,
    myProgress,
    partnerProgress,
    matchResult,
    statusMessage,
    selectedCards,
    desire,
    selectCard,
    setDesire,
    submitInput,
    rankRitual,
    removeRank,
    toggleAvailability,
    submitPicks,
    confirmMatch,
    retryGeneration,
    refresh,
  };
}

