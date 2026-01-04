/**
 * useRitualFlow Hook
 * 
 * Single source of truth for the entire ritual flow.
 * Manages state, realtime sync, and all user actions.
 * 
 * CRITICAL FIX (2026-01-03):
 * - Added 30s synthesis timeout with auto-retry
 * - Added polling fallback when realtime fails
 * - Shows visible error when synthesis appears stuck
 * 
 * @created 2025-12-26
 * @updated 2026-01-03 - Added synthesis timeout and polling
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
import type { City } from '@/utils/timezoneUtils';

// Synthesis timeout configuration
const SYNTHESIS_TIMEOUT_MS = 30000; // 30 seconds before showing error
const SYNTHESIS_POLL_INTERVAL_MS = 3000; // Poll every 3 seconds as fallback (was 5s)
const UNIVERSAL_SYNC_INTERVAL_MS = 8000; // Universal sync every 8 seconds to catch any state drift

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
  
  // Synthesis state (for timeout handling)
  synthesisTimedOut: boolean;
  isRetrying: boolean;
  
  // Overlapping time slots for MatchPhase
  overlappingSlots: Array<{ dayOffset: number; timeSlot: TimeSlot }>;
  
  // Slot picker rotation
  isSlotPicker: boolean;
  
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
  forceSync: () => Promise<void>;
}

export function useRitualFlow(): UseRitualFlowReturn {
  const { user, couple, partnerProfile, refreshCycle } = useCouple();
  
  // Local state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cycle, setCycle] = useState<WeeklyCycle | null>(null);
  
  // Synthesis timeout state
  const [synthesisTimedOut, setSynthesisTimedOut] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const synthesisStartTimeRef = useRef<number | null>(null);
  const hasAutoRetriedRef = useRef(false);
  
  // Input phase state
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [desire, setDesireState] = useState('');
  
  // FIX: Capture the city at initial load to prevent city changes mid-session
  // from causing the hook to fetch a different week's cycle due to timezone differences.
  // This prevents the bug where changing cities navigates user to the "confirmed" phase
  // because a different city's timezone produces a different week start date.
  const initialCityRef = useRef<City | null>(null);
  
  // Pick phase state
  const [myPicks, setMyPicks] = useState<RitualPreference[]>([]);
  const [partnerPicks, setPartnerPicks] = useState<RitualPreference[]>([]);
  const [mySlots, setMySlots] = useState<AvailabilitySlot[]>([]);
  const [partnerSlots, setPartnerSlots] = useState<AvailabilitySlot[]>([]);
  
  // Derived values
  const isPartnerOne = couple?.partner_one === user?.id;
  const partnerId = isPartnerOne ? couple?.partner_two : couple?.partner_one;
  const partnerName = partnerProfile?.name || 'your partner';
  
  // Slot picker rotation logic:
  // If no one picked last time, partner_one goes first
  // Otherwise, alternate from whoever picked last
  const lastPickerId = (couple as any)?.last_slot_picker_id;
  const isSlotPicker = useMemo(() => {
    if (!user?.id || !couple) return true; // Default to true if we can't determine
    
    // Check if this cycle already has a designated picker
    const cyclePickerId = (cycle as any)?.slot_picker_id;
    if (cyclePickerId) {
      return cyclePickerId === user.id;
    }
    
    // If no one picked last, partner_one gets first pick
    if (!lastPickerId) {
      return isPartnerOne;
    }
    
    // Otherwise, the other partner picks this time
    return lastPickerId !== user.id;
  }, [user?.id, couple, lastPickerId, isPartnerOne, cycle]);
  
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
    console.log('[useRitualFlow] loadCycleData called', {
      coupleId: couple?.id,
      userId: user?.id,
      preferredCity: couple?.preferred_city,
      initialCity: initialCityRef.current,
    });
    
    if (!couple?.id || !user?.id) {
      console.log('[useRitualFlow] loadCycleData skipped - missing couple or user');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Get or create current week's cycle
      const { getWeekStartDate } = await import('@/utils/timezoneUtils');
      
      // FIX: Use captured initial city to prevent city changes from switching cycles mid-session.
      // Only capture the city once on first load - subsequent city changes won't affect week calculation.
      if (!initialCityRef.current) {
        initialCityRef.current = (couple.preferred_city || 'New York') as City;
        console.log('[useRitualFlow] Captured initial city:', initialCityRef.current);
      }
      const preferredCity = initialCityRef.current;
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
      
      console.log('[useRitualFlow] Cycle loaded/created:', {
        cycleId: existingCycle?.id,
        status: (existingCycle as any)?.status,
        hasOutput: !!existingCycle?.synthesized_output,
      });
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
      console.error('[useRitualFlow] Error loading cycle:', err);
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  // NOTE: couple?.preferred_city intentionally excluded - we use initialCityRef to prevent
  // city changes from causing a refetch with a different week start date (timezone bug fix)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [couple?.id, user?.id, isPartnerOne, loadPicks, loadAvailability]);

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
  // Synthesis Timeout & Polling Fallback
  // ============================================================================
  
  // Track when synthesis starts and handle timeout
  useEffect(() => {
    const isGenerating = status === 'generating' || 
      (cycle?.partner_one_input && cycle?.partner_two_input && !cycle?.synthesized_output);
    
    if (isGenerating) {
      // Mark when synthesis started
      if (!synthesisStartTimeRef.current) {
        synthesisStartTimeRef.current = Date.now();
        console.log('[useRitualFlow] Synthesis started, tracking timeout');
      }
      
      // Check if we've exceeded timeout
      const elapsed = Date.now() - synthesisStartTimeRef.current;
      if (elapsed >= SYNTHESIS_TIMEOUT_MS && !synthesisTimedOut) {
        console.warn('[useRitualFlow] ⚠️ Synthesis timeout exceeded', {
          elapsed: `${(elapsed / 1000).toFixed(1)}s`,
          hasAutoRetried: hasAutoRetriedRef.current,
        });
        
        // Auto-retry once
        if (!hasAutoRetriedRef.current && cycle?.id) {
          hasAutoRetriedRef.current = true;
          console.log('[useRitualFlow] Attempting auto-retry...');
          supabase.functions.invoke('trigger-synthesis', {
            body: { cycleId: cycle.id, forceRetry: true }
          }).catch(err => {
            console.error('[useRitualFlow] Auto-retry failed:', err);
          });
          // Reset start time to give retry a chance
          synthesisStartTimeRef.current = Date.now();
        } else {
          // Already retried, show timeout error
          setSynthesisTimedOut(true);
          setError('Ritual generation is taking longer than expected. Please try again.');
        }
      }
    } else {
      // Reset timeout tracking when not generating
      if (synthesisStartTimeRef.current) {
        console.log('[useRitualFlow] Synthesis complete or not generating, resetting timeout tracking');
        synthesisStartTimeRef.current = null;
        hasAutoRetriedRef.current = false;
        setSynthesisTimedOut(false);
      }
    }
  }, [status, cycle?.partner_one_input, cycle?.partner_two_input, cycle?.synthesized_output, cycle?.id, synthesisTimedOut]);

  // Polling fallback when in generating status (in case realtime fails)
  useEffect(() => {
    const isGenerating = status === 'generating' || 
      (cycle?.partner_one_input && cycle?.partner_two_input && !cycle?.synthesized_output);
    
    if (!isGenerating || !cycle?.id) return;
    
    console.log('[useRitualFlow] Starting polling fallback for synthesis');
    
    const pollForCompletion = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('weekly_cycles')
          .select('synthesized_output, status')
          .eq('id', cycle.id)
          .single();
        
        if (fetchError) {
          console.warn('[useRitualFlow] Polling error:', fetchError);
          return;
        }
        
        if (data?.synthesized_output) {
          console.log('[useRitualFlow] ✅ Polling detected synthesis completion');
          setCycle(prev => prev ? { ...prev, ...data } as typeof prev : prev);
        }
      } catch (err) {
        console.warn('[useRitualFlow] Polling exception:', err);
      }
    };
    
    // Poll immediately, then every SYNTHESIS_POLL_INTERVAL_MS
    pollForCompletion();
    const pollInterval = setInterval(pollForCompletion, SYNTHESIS_POLL_INTERVAL_MS);
    
    return () => {
      clearInterval(pollInterval);
    };
  }, [status, cycle?.id, cycle?.partner_one_input, cycle?.partner_two_input, cycle?.synthesized_output]);

  // Timeout check interval
  useEffect(() => {
    const isGenerating = status === 'generating' || 
      (cycle?.partner_one_input && cycle?.partner_two_input && !cycle?.synthesized_output);
    
    if (!isGenerating) return;
    
    // Check timeout every second
    const timeoutInterval = setInterval(() => {
      if (!synthesisStartTimeRef.current) return;
      
      const elapsed = Date.now() - synthesisStartTimeRef.current;
      if (elapsed >= SYNTHESIS_TIMEOUT_MS && !synthesisTimedOut && hasAutoRetriedRef.current) {
        setSynthesisTimedOut(true);
        setError('Ritual generation is taking longer than expected. Please try again.');
      }
    }, 1000);
    
    return () => {
      clearInterval(timeoutInterval);
    };
  }, [status, cycle?.partner_one_input, cycle?.partner_two_input, cycle?.synthesized_output, synthesisTimedOut]);

  // ============================================================================
  // Universal Sync - Catches any state drift between partners
  // ============================================================================
  
  // This runs in ALL phases to ensure both partners stay in sync
  // Critical for fixing the "both partners hang" issue
  useEffect(() => {
    if (!cycle?.id) return;
    
    console.log('[useRitualFlow] Starting universal sync polling');
    
    const syncCycleState = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('weekly_cycles')
          .select('*')
          .eq('id', cycle.id)
          .single();
        
        if (fetchError) {
          console.warn('[useRitualFlow] Universal sync error:', fetchError);
          return;
        }
        
        if (!data) return;
        
        // Check if server state differs from local state
        const serverStatus = (data as any).status;
        const localStatus = status;
        const serverHasOutput = !!data.synthesized_output;
        const localHasOutput = !!cycle.synthesized_output;
        const serverP1Input = !!data.partner_one_input;
        const serverP2Input = !!data.partner_two_input;
        const localP1Input = !!cycle.partner_one_input;
        const localP2Input = !!cycle.partner_two_input;
        
        // Detect state drift
        const hasDrift = 
          serverStatus !== localStatus ||
          serverHasOutput !== localHasOutput ||
          serverP1Input !== localP1Input ||
          serverP2Input !== localP2Input;
        
        if (hasDrift) {
          console.log('[useRitualFlow] 🔄 State drift detected, syncing from server', {
            server: { status: serverStatus, hasOutput: serverHasOutput, p1: serverP1Input, p2: serverP2Input },
            local: { status: localStatus, hasOutput: localHasOutput, p1: localP1Input, p2: localP2Input },
          });
          
          // Update local state from server
          setCycle(data);
          
          // Reload picks and availability if we now have output
          if (serverHasOutput && !localHasOutput) {
            await Promise.all([
              loadPicks(cycle.id),
              loadAvailability(cycle.id)
            ]);
          }
        }
      } catch (err) {
        console.warn('[useRitualFlow] Universal sync exception:', err);
      }
    };
    
    // Sync immediately on mount and then periodically
    syncCycleState();
    const syncInterval = setInterval(syncCycleState, UNIVERSAL_SYNC_INTERVAL_MS);
    
    return () => {
      clearInterval(syncInterval);
    };
  }, [cycle?.id, status, cycle?.synthesized_output, cycle?.partner_one_input, cycle?.partner_two_input, loadPicks, loadAvailability]);

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
    const submitStartTime = performance.now();
    console.log('[useRitualFlow] ===== submitInput called =====', {
      cycleId: cycle?.id,
      userId: user?.id,
      selectedCardsCount: selectedCards.length,
      selectedCards: selectedCards,
      desire: desire,
      hasCycle: !!cycle,
      hasUser: !!user,
      isPartnerOne,
      timestamp: new Date().toISOString(),
    });
    
    // Separate validation checks with specific error messages
    if (!cycle?.id) {
      const errorMsg = 'Failed to initialize. Please refresh the page.';
      console.error('[useRitualFlow] ❌ Submit failed: No cycle ID');
      setError(errorMsg);
      return;
    }
    if (!user?.id) {
      const errorMsg = 'Session expired. Please sign in again.';
      console.error('[useRitualFlow] ❌ Submit failed: No user ID');
      setError(errorMsg);
      return;
    }
    if (selectedCards.length < 3) {
      const errorMsg = 'Please select at least 3 mood cards';
      console.error('[useRitualFlow] ❌ Submit failed: Not enough cards selected', {
        selectedCount: selectedCards.length,
        required: 3,
      });
      setError(errorMsg);
      return;
    }
    
    // Clear any previous errors
    setError(null);
    
    const inputData = {
      cards: selectedCards,
      desire: desire.trim() || null,
      inputType: 'cards' as const
    };
    
    const updateField = isPartnerOne ? 'partner_one_input' : 'partner_two_input';
    const submittedField = isPartnerOne ? 'partner_one_submitted_at' : 'partner_two_submitted_at';
    
    console.log('[useRitualFlow] Preparing to update database', {
      cycleId: cycle.id,
      updateField,
      submittedField,
      inputData,
    });
    
    try {
      const updateStartTime = performance.now();
      const { data, error: updateError } = await supabase
        .from('weekly_cycles')
        .update({
          [updateField]: inputData,
          [submittedField]: new Date().toISOString()
        })
        .eq('id', cycle.id)
        .select();
      
      const updateDuration = performance.now() - updateStartTime;
      
      if (updateError) {
        console.error('[useRitualFlow] ❌ Database update failed', {
          error: updateError,
          code: updateError.code,
          message: updateError.message,
          details: updateError.details,
          hint: updateError.hint,
          duration: `${updateDuration.toFixed(2)}ms`,
        });
        throw updateError;
      }
      
      console.log('[useRitualFlow] ✅ Database update successful', {
        duration: `${updateDuration.toFixed(2)}ms`,
        updatedData: data,
      });
      
      // Determine the new status based on partner completion
      const updatedCycle = { ...cycle, [updateField]: inputData };
      const bothComplete = updatedCycle.partner_one_input && updatedCycle.partner_two_input;
      
      // CRITICAL FIX: Compute and update status so phase transition happens
      let newStatus: CycleStatus;
      if (bothComplete) {
        newStatus = 'generating';
      } else if (isPartnerOne) {
        newStatus = 'awaiting_partner_two';
      } else {
        newStatus = 'awaiting_partner_one';
      }
      
      console.log('[useRitualFlow] Updating status to:', newStatus, {
        bothComplete,
        isPartnerOne,
        hadPartnerOneInput: !!cycle.partner_one_input,
        hadPartnerTwoInput: !!cycle.partner_two_input,
      });
      
      // Update status in database
      const { error: statusError } = await supabase
        .from('weekly_cycles')
        .update({ status: newStatus })
        .eq('id', cycle.id);
      
      if (statusError) {
        console.warn('[useRitualFlow] ⚠️ Status update failed (non-blocking):', statusError);
        // Continue anyway - the local state update is more important for UX
      }
      
      // CRITICAL: Optimistically update local state so UI transitions immediately
      const now = new Date().toISOString();
      setCycle(prev => prev ? {
        ...prev,
        [updateField]: inputData,
        [submittedField]: now,
        status: newStatus
      } as typeof prev : prev);
      
      console.log('[useRitualFlow] ✅ Local state updated with status:', newStatus);
      
      // Trigger synthesis if both are now complete
      if (bothComplete) {
        console.log('[useRitualFlow] Both partners complete, triggering synthesis');
        // Fire and forget - trigger will handle idempotency
        supabase.functions.invoke('trigger-synthesis', {
          body: { cycleId: cycle.id }
        }).catch(err => {
          console.warn('[useRitualFlow] ⚠️ Synthesis trigger failed (non-blocking):', err);
        });
      }
      
      const totalDuration = performance.now() - submitStartTime;
      console.log('[useRitualFlow] ===== submitInput completed successfully =====', {
        totalDuration: `${totalDuration.toFixed(2)}ms`,
        newStatus,
      });
      
    } catch (err) {
      const totalDuration = performance.now() - submitStartTime;
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit';
      console.error('[useRitualFlow] ===== submitInput FAILED =====', {
        error: err,
        errorMessage,
        totalDuration: `${totalDuration.toFixed(2)}ms`,
      });
      setError(errorMessage);
      // Re-throw to allow parent component to handle if needed
      throw err;
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
    
    if (!cycle?.id) {
      setError('No active cycle found');
      return;
    }
    
    setError(null);
    
    // Determine new status based on whether partner has also picked
    // Partner is considered "done" if they have 3+ picks AND any availability
    const partnerHasPicks = partnerPicks.length >= 3;
    const partnerHasSlots = partnerSlots.length > 0;
    const partnerDone = partnerHasPicks && partnerHasSlots;
    
    const newStatus: CycleStatus = partnerDone
      ? 'awaiting_agreement'
      : isPartnerOne
        ? 'awaiting_partner_two_pick'
        : 'awaiting_partner_one_pick';
    
    console.log('[useRitualFlow] Submitting picks with status:', newStatus, {
      partnerHasPicks,
      partnerHasSlots,
      partnerDone,
      isPartnerOne
    });
    
    // Update cycle status in database
    const { error: updateError } = await supabase
      .from('weekly_cycles')
      .update({ status: newStatus })
      .eq('id', cycle.id);
    
    if (updateError) {
      console.error('[useRitualFlow] Failed to update cycle status:', updateError);
      setError(updateError.message);
      return;
    }
    
    // Optimistically update local state
    setCycle(prev => prev ? { ...prev, status: newStatus } as typeof prev : prev);
    
    await refreshCycle();
  }, [myPicks.length, mySlots.length, partnerPicks.length, partnerSlots.length, isPartnerOne, cycle?.id, refreshCycle]);

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
      // Update the cycle with the confirmed ritual and time
      const { error: updateError } = await supabase
        .from('weekly_cycles')
        .update({
          agreement_reached: true,
          agreed_ritual: matchResult.matchedRitual as any,
          agreed_date: date.toISOString().split('T')[0],
          agreed_time_start: timeRange.start,
          agreed_time_end: timeRange.end,
          agreed_time: timeRange.start, // Legacy field
          slot_picker_id: user?.id, // Track who confirmed
          slot_selected_at: new Date().toISOString(),
          status: 'agreed' as CycleStatus
        })
        .eq('id', cycle.id);
      
      if (updateError) throw updateError;
      
      // Update the couple to track who picked last (for rotation)
      // Only update if this user was the designated picker
      if (isSlotPicker && couple?.id) {
        const { error: coupleError } = await supabase
          .from('couples')
          .update({ last_slot_picker_id: user?.id })
          .eq('id', couple.id);
        
        if (coupleError) {
          console.warn('[useRitualFlow] Failed to update picker rotation:', coupleError);
          // Non-blocking - don't fail the confirmation
        }
      }
      
      console.log('[useRitualFlow] ✅ Match confirmed', {
        ritual: matchResult.matchedRitual.title,
        date: date.toISOString().split('T')[0],
        time: timeRange.start,
        picker: user?.id,
      });
      
    } catch (err) {
      console.error('[useRitualFlow] Confirm match error:', err);
      setError(err instanceof Error ? err.message : 'Failed to confirm');
    }
  }, [cycle?.id, couple?.id, user?.id, isSlotPicker, matchResult]);

  // ============================================================================
  // Actions - General
  // ============================================================================
  
  const retryGeneration = useCallback(async () => {
    if (!cycle?.id) return;
    
    console.log('[useRitualFlow] Manual retry generation triggered');
    setError(null);
    setSynthesisTimedOut(false);
    setIsRetrying(true);
    
    // Reset timeout tracking for fresh retry
    synthesisStartTimeRef.current = Date.now();
    hasAutoRetriedRef.current = false;
    
    try {
      const { data, error: fnError } = await supabase.functions.invoke('trigger-synthesis', {
        body: { cycleId: cycle.id, forceRetry: true }
      });
      
      if (fnError) throw fnError;
      
      if (data?.status === 'ready') {
        console.log('[useRitualFlow] ✅ Retry successful, rituals ready');
        await loadCycleData();
      } else if (data?.status === 'generating') {
        console.log('[useRitualFlow] Retry triggered, generation in progress');
        // Will be picked up by polling
      } else if (data?.status === 'failed') {
        setError(data.error || 'Generation failed. Please try again.');
      }
    } catch (err) {
      console.error('[useRitualFlow] Retry generation error:', err);
      setError(err instanceof Error ? err.message : 'Failed to retry. Please try again.');
    } finally {
      setIsRetrying(false);
    }
  }, [cycle?.id, loadCycleData]);
  
  const refresh = useCallback(async () => {
    await loadCycleData();
  }, [loadCycleData]);

  // Force sync - immediately fetches latest state from server
  // Use this when user suspects state is out of sync
  const forceSync = useCallback(async () => {
    if (!cycle?.id) return;
    
    console.log('[useRitualFlow] 🔄 Force sync triggered by user');
    setError(null);
    
    try {
      const { data, error: fetchError } = await supabase
        .from('weekly_cycles')
        .select('*')
        .eq('id', cycle.id)
        .single();
      
      if (fetchError) throw fetchError;
      if (!data) throw new Error('Cycle not found');
      
      setCycle(data);
      
      // Reload all related data
      await Promise.all([
        loadPicks(cycle.id),
        loadAvailability(cycle.id)
      ]);
      
      console.log('[useRitualFlow] ✅ Force sync complete', {
        status: (data as any).status,
        hasOutput: !!data.synthesized_output,
      });
    } catch (err) {
      console.error('[useRitualFlow] Force sync failed:', err);
      setError('Sync failed. Please try again.');
    }
  }, [cycle?.id, loadPicks, loadAvailability]);

  // Compute overlapping time slots for MatchPhase
  const overlappingSlots = useMemo(() => {
    const mySlotKeys = new Set(mySlots.map(s => `${s.day_offset}-${s.time_slot}`));
    const overlapping = partnerSlots
      .filter(s => mySlotKeys.has(`${s.day_offset}-${s.time_slot}`))
      .map(s => ({ dayOffset: s.day_offset, timeSlot: s.time_slot as TimeSlot }));
    
    // Sort by day then time
    const slotOrder: Record<TimeSlot, number> = { morning: 0, afternoon: 1, evening: 2 };
    return overlapping.sort((a, b) => {
      if (a.dayOffset !== b.dayOffset) return a.dayOffset - b.dayOffset;
      return slotOrder[a.timeSlot] - slotOrder[b.timeSlot];
    });
  }, [mySlots, partnerSlots]);

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
    // Synthesis timeout state
    synthesisTimedOut,
    isRetrying,
    // Overlapping slots for MatchPhase
    overlappingSlots,
    // Slot picker rotation
    isSlotPicker,
    // Actions
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
    forceSync,
  };
}

