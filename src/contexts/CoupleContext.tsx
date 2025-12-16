/**
 * CoupleContext
 * 
 * Global context for couple/partner state management.
 * 
 * CRITICAL FIX (2025-12-15):
 * - Improved realtime sync for partner completion
 * - Added synthesis status tracking
 * - Fixed edge cases in state derivation
 * 
 * @updated 2025-12-15 - Fixed two-partner flow reliability
 */

import { createContext, useContext, useState, useEffect, useRef, ReactNode, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { User } from '@supabase/supabase-js';
import type { Couple, PartnerProfile, WeeklyCycle } from '@/types/database';
import { deriveCycleState, type CycleState } from '@/types/database';

// Version tracking for deployment verification
const CONTEXT_VERSION = '2024-12-15-v6';

// Check localStorage for existing Supabase session token (instant, synchronous)
const checkCachedSession = (): boolean => {
  try {
    // Use project ID from environment variable to construct storage key
    // Fail loudly if project ID is missing (no hardcoded fallback for multi-project safety)
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    if (!projectId) {
      console.warn('[AUTH] VITE_SUPABASE_PROJECT_ID not set, cannot check cached session');
      return false;
    }
    const storageKey = `sb-${projectId}-auth-token`;
    const cached = localStorage.getItem(storageKey);
    return !!cached;
  } catch (error) {
    console.warn('[AUTH] Error checking cached session:', error);
    return false;
  }
};

interface CoupleContextType {
  user: User | null;
  session: any;
  couple: Couple | null;
  partnerProfile: PartnerProfile | null;
  userProfile: { name: string } | null;
  currentCycle: WeeklyCycle | null;
  cycleState: CycleState;
  loading: boolean;
  hasKnownSession: boolean;
  refreshCouple: () => Promise<void>;
  refreshCycle: () => Promise<WeeklyCycle | null>;
  leaveCouple: () => Promise<{ success: boolean; error?: string }>;
  triggerSynthesis: () => Promise<{ success: boolean; error?: string }>;
}

const CoupleContext = createContext<CoupleContextType | null>(null);

export const CoupleProvider = ({ children }: { children: ReactNode }) => {
  const [hasKnownSession] = useState(() => checkCachedSession());
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<any>(null);
  const [couple, setCouple] = useState<Couple | null>(null);
  const [partnerProfile, setPartnerProfile] = useState<PartnerProfile | null>(null);
  const [userProfile, setUserProfile] = useState<{ name: string } | null>(null);
  const [currentCycle, setCurrentCycle] = useState<WeeklyCycle | null>(null);
  const [loading, setLoadingState] = useState(true);
  const [coupleLoading, setCoupleLoadingState] = useState(false);
  const navigate = useNavigate();
  
  // Use refs to access current state values in timeout callbacks
  const loadingRef = useRef(loading);
  const coupleLoadingRef = useRef(coupleLoading);
  
  // Keep refs in sync with state
  useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);
  
  useEffect(() => {
    coupleLoadingRef.current = coupleLoading;
  }, [coupleLoading]);

  // Diagnostic logging wrappers for state changes
  const setLoading = (value: boolean) => {
    const stack = new Error().stack;
    console.log(`[DIAG] setLoading(${value}) called`, {
      previousValue: loading,
      newValue: value,
      stack: stack?.split('\n').slice(2, 5).join('\n'), // First 3 stack frames
      timestamp: new Date().toISOString(),
    });
    setLoadingState(value);
  };

  const setCoupleLoading = (value: boolean) => {
    const stack = new Error().stack;
    console.log(`[DIAG] setCoupleLoading(${value}) called`, {
      previousValue: coupleLoading,
      newValue: value,
      stack: stack?.split('\n').slice(2, 5).join('\n'),
      timestamp: new Date().toISOString(),
    });
    setCoupleLoadingState(value);
  };

  const fetchUserProfile = async (userId: string) => {
    const startTime = Date.now();
    try {
      console.log('[PROFILE] Fetching profile for user:', userId);
      
      // Add 10s timeout to prevent hanging
      const profilePromise = supabase
        .from('profiles')
        .select('name')
        .eq('id', userId)
        .single();
      
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error('fetchUserProfile timeout after 10 seconds'));
        }, 10000);
      });
      
      const { data, error } = await Promise.race([profilePromise, timeoutPromise]);
      
      const duration = Date.now() - startTime;
      console.log(`[DIAG] fetchUserProfile completed in ${duration}ms`);
      
      if (error) {
        // Profile might not exist yet - this is OK for new users
        if (error.code === 'PGRST116') {
          console.warn('[PROFILE] Profile not found for user:', userId, '- will be created by trigger');
          // Profile should be created by handle_new_user trigger
          // If it's still missing, we'll handle it in onboarding
        } else {
          console.error('[PROFILE] Error fetching profile:', error.message);
        }
        return;
      }
      
      if (data) {
        console.log('[PROFILE] Profile found:', data.name);
        setUserProfile(data);
      } else {
        console.warn('[PROFILE] Profile query returned no data for user:', userId);
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`[PROFILE] Unexpected error fetching profile after ${duration}ms:`, error);
      if (error instanceof Error && error.message.includes('timeout')) {
        console.error('[PROFILE] ⚠️ fetchUserProfile timed out after 10s');
      }
    }
  };

  const fetchCouple = async (userId: string) => {
    const startTime = Date.now();
    console.log('[COUPLE] fetchCouple called for user:', userId);
    try {
      // Add 10s timeout to prevent hanging
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error('fetchCouple timeout after 10 seconds'));
        }, 10000);
      });
      
      // Step 1: Fetch couple (check both as partner_one and partner_two)
      const coupleQueryPromise = Promise.all([
        supabase
          .from('couples')
          .select('*')
          .eq('partner_one', userId)
          .eq('is_active', true)
          .maybeSingle(),
        supabase
          .from('couples')
          .select('*')
          .eq('partner_two', userId)
          .eq('is_active', true)
          .maybeSingle(),
      ]);
      
      const [result1, result2] = await Promise.race([coupleQueryPromise, timeoutPromise]);
      const { data: asPartnerOne, error: err1 } = result1;
      const { data: asPartnerTwo, error: err2 } = result2;

      console.log('[COUPLE] Query results - asPartnerOne:', asPartnerOne?.id, 'asPartnerTwo:', asPartnerTwo?.id);
      if (err1) console.error('[COUPLE] Error fetching as partner_one:', err1);
      if (err2) console.error('[COUPLE] Error fetching as partner_two:', err2);

      const coupleData = asPartnerOne || asPartnerTwo;
      
      if (!coupleData) {
        console.log('[COUPLE] No active couple found for user');
        setCouple(null);
        setPartnerProfile(null);
        const duration = Date.now() - startTime;
        console.log(`[DIAG] fetchCouple completed in ${duration}ms (no couple found)`);
        return null;
      }

      console.log('[COUPLE] Found couple:', coupleData.id);
      console.log('[COUPLE] partner_one:', coupleData.partner_one);
      console.log('[COUPLE] partner_two:', coupleData.partner_two);

      // Step 2: Fetch partner's profile separately
      const partnerId = coupleData.partner_one === userId 
        ? coupleData.partner_two 
        : coupleData.partner_one;
      
      console.log('[COUPLE] Partner ID:', partnerId);
      
      if (partnerId) {
        const partnerNamePromise = supabase
          .rpc('get_partner_name', { partner_id: partnerId });
        
        const partnerNameTimeout = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('get_partner_name timeout')), 5000);
        });
        
        const { data: partnerName } = await Promise.race([partnerNamePromise, partnerNameTimeout]);
        
        console.log('[COUPLE] Partner name:', partnerName);
        if (partnerName) {
          setPartnerProfile({ id: partnerId, name: partnerName });
        } else {
          setPartnerProfile(null);
        }
      } else {
        console.log('[COUPLE] No partner_two yet - waiting for partner to join');
        setPartnerProfile(null);
      }

      setCouple(coupleData);
      const duration = Date.now() - startTime;
      console.log(`[DIAG] fetchCouple completed in ${duration}ms`);
      return coupleData;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`[COUPLE] Error fetching couple after ${duration}ms:`, error);
      if (error instanceof Error && error.message.includes('timeout')) {
        console.error('[COUPLE] ⚠️ fetchCouple timed out after 10s');
      }
      return null;
    }
  };

  const fetchCycle = async (coupleId: string) => {
    const startTime = Date.now();
    try {
      // Add 10s timeout to prevent hanging
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error('fetchCycle timeout after 10 seconds'));
        }, 10000);
      });
      
      // FIX #9: Check for stale cycles (older than 7 days) and clean them up
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      
      const incompleteCyclePromise = supabase
        .from('weekly_cycles')
        .select('*')
        .eq('couple_id', coupleId)
        .or('synthesized_output.is.null,agreement_reached.eq.false')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      const { data: incompleteCycle, error: incompleteError } = await Promise.race([
        incompleteCyclePromise,
        timeoutPromise,
      ]);

      if (incompleteError) throw incompleteError;

      if (incompleteCycle) {
        // FIX #9: If cycle is older than 7 days and incomplete, it's stale
        const cycleDate = new Date(incompleteCycle.created_at);
        const isStale = cycleDate.getTime() < new Date(sevenDaysAgo).getTime();
        
        if (isStale && (!incompleteCycle.synthesized_output || !incompleteCycle.agreement_reached)) {
          console.log('[CYCLE] Stale cycle detected, will create new cycle for current week');
          // Don't return stale cycle, fall through to create new one
        } else {
          setCurrentCycle(incompleteCycle);
          const duration = Date.now() - startTime;
          console.log(`[DIAG] fetchCycle completed in ${duration}ms (incomplete cycle found)`);
          return incompleteCycle;
        }
      }

      // FIX #3: Use couple's preferred_city for timezone-aware week calculation
      // Fetch couple to get preferred_city
      const coupleDataPromise = supabase
        .from('couples')
        .select('preferred_city')
        .eq('id', coupleId)
        .single();
      
      const { data: coupleData } = await Promise.race([coupleDataPromise, timeoutPromise]);
      
      const preferredCity = (coupleData?.preferred_city || 'New York') as 'London' | 'Sydney' | 'Melbourne' | 'New York';
      
      // Use timezone-aware week calculation
      const { getWeekStartDate } = await import('@/utils/timezoneUtils');
      const weekStartStr = getWeekStartDate(preferredCity);

      const currentWeekCyclePromise = supabase
        .from('weekly_cycles')
        .select('*')
        .eq('couple_id', coupleId)
        .eq('week_start_date', weekStartStr)
        .maybeSingle();
      
      const { data: currentWeekCycle, error: weekError } = await Promise.race([
        currentWeekCyclePromise,
        timeoutPromise,
      ]);

      if (weekError) throw weekError;
      setCurrentCycle(currentWeekCycle);
      const duration = Date.now() - startTime;
      console.log(`[DIAG] fetchCycle completed in ${duration}ms`);
      return currentWeekCycle;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`[CYCLE] Error fetching cycle after ${duration}ms:`, error);
      if (error instanceof Error && error.message.includes('timeout')) {
        console.error('[CYCLE] ⚠️ fetchCycle timed out after 10s');
      }
      return null;
    }
  };

  useEffect(() => {
    console.log('[AUTH] Initializing auth state, context version:', CONTEXT_VERSION);
    const authInitStartTime = performance.now();
    
    // Run connection test in development to help diagnose issues
    if (import.meta.env.DEV) {
      import('@/utils/supabase-connection-test').then(({ testSupabaseConnection, logConnectionTestResults }) => {
        testSupabaseConnection().then((result) => {
          logConnectionTestResults(result);
          if (!result.success) {
            console.error('[AUTH] ⚠️ Supabase connection test failed. The app may not work correctly.');
          }
        });
      }).catch((error) => {
        console.warn('[AUTH] Could not run connection test:', error);
      });
    }
    
    let isMounted = true;
    let subscription: { unsubscribe: () => void } | null = null;
    let authListenerSetup = false;
    let getSessionCompleted = false;
    
    // Primary safety timeout - ensures loading is set to false
    console.log('[DIAG] Creating primary safety timeout (3s)');
    const safetyTimeout = setTimeout(() => {
      if (isMounted) {
        const elapsed = performance.now() - authInitStartTime;
        console.log(`[AUTH] ⚠️ Primary safety timeout triggered (3s, elapsed: ${elapsed.toFixed(2)}ms) - forcing loading=false`);
        console.log('[AUTH] Status check:', {
          authListenerSetup,
          getSessionCompleted,
          elapsed: `${elapsed.toFixed(2)}ms`,
        });
        console.log('[AUTH] This may indicate a Supabase connection issue. Check your .env configuration.');
        console.log('[AUTH] Common issues after Supabase migration:');
        console.log('[AUTH]   1. Wrong VITE_SUPABASE_URL (old project URL)');
        console.log('[AUTH]   2. Wrong VITE_SUPABASE_PUBLISHABLE_KEY (old project key)');
        console.log('[AUTH]   3. Wrong VITE_SUPABASE_PROJECT_ID (old project ID)');
        setLoading(false);
      } else {
        console.log('[DIAG] Safety timeout fired but component is unmounted');
      }
    }, 3000);

    try {
      // Verify Supabase client is available
      console.log('[DIAG] Verifying Supabase client availability...');
      let supabaseAvailable = false;
      try {
        // Try to access supabase.auth to verify it's available
        if (supabase && supabase.auth) {
          supabaseAvailable = true;
          console.log('[DIAG] ✅ Supabase client is available');
        } else {
          throw new Error('Supabase client or auth is null/undefined');
        }
      } catch (supabaseError) {
        console.error('[AUTH] ❌ Supabase client is not available:', supabaseError);
        console.error('[AUTH] This usually means:');
        console.error('[AUTH]   1. Environment variables are missing or invalid');
        console.error('[AUTH]   2. Supabase configuration failed to initialize');
        console.error('[AUTH]   3. Check browser console for Supabase Client initialization errors');
        
        // Set loading to false immediately so app can show error UI
        clearTimeout(safetyTimeout);
        setSession(null);
        setUser(null);
        setLoading(false);
        return; // Exit early - don't try to set up auth listeners
      }
      
      // Set up auth state change listener FIRST (this fires immediately with INITIAL_SESSION)
      console.log('[DIAG] Setting up onAuthStateChange listener');
      let listenerFired = false;
      
      try {
        const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange((_event, session) => {
          listenerFired = true;
          const eventTime = performance.now() - authInitStartTime;
          console.log(`[AUTH] onAuthStateChange event (${eventTime.toFixed(2)}ms):`, _event, 'has session:', !!session);
          
          if (!isMounted) {
            console.log('[DIAG] onAuthStateChange fired but component is unmounted');
            return;
          }
          
          console.log('[DIAG] Clearing safety timeout from onAuthStateChange');
          clearTimeout(safetyTimeout);
          setSession(session);
          setUser(session?.user ?? null);
          setLoading(false);
          
          // FIX #8: Session Recovery - Restore critical state from localStorage if session was lost
          if (session?.user) {
            try {
              const savedState = localStorage.getItem(`ritual-state-${session.user.id}`);
              if (savedState) {
                const parsed = JSON.parse(savedState);
                console.log('[AUTH] Restoring saved state:', parsed);
                // State will be refreshed from database, but this provides fallback
              }
            } catch (e) {
              console.warn('[AUTH] Failed to restore saved state:', e);
            }
          }
        });
        subscription = authSubscription;
        authListenerSetup = true;
        console.log('[DIAG] ✅ onAuthStateChange listener set up successfully');
        
        // Give listener a moment to fire INITIAL_SESSION event
        setTimeout(() => {
          if (!listenerFired) {
            console.warn('[AUTH] ⚠️ onAuthStateChange listener did not fire INITIAL_SESSION event within 500ms');
          }
        }, 500);
      } catch (listenerError) {
        console.error('[AUTH] ❌ Failed to set up onAuthStateChange listener:', listenerError);
        // Continue - getSession will still work
      }

      // Check existing session with timeout wrapper - ensure it ALWAYS completes
      console.log('[DIAG] Creating getSession promise with 5s timeout');
      const getSessionStartTime = performance.now();
      
      const sessionPromise = Promise.race([
        supabase.auth.getSession().then((result) => {
          const duration = performance.now() - getSessionStartTime;
          console.log(`[DIAG] getSession promise resolved (${duration.toFixed(2)}ms)`);
          return result;
        }).catch((error) => {
          const duration = performance.now() - getSessionStartTime;
          console.log(`[DIAG] getSession promise rejected (${duration.toFixed(2)}ms):`, error);
          throw error;
        }),
        new Promise<{ data: { session: null }; error: Error }>((_, reject) => {
          console.log('[DIAG] Creating timeout promise for getSession (5s)');
          setTimeout(() => {
            const duration = performance.now() - getSessionStartTime;
            console.log(`[DIAG] getSession timeout promise firing (${duration.toFixed(2)}ms)`);
            reject(new Error('getSession timeout after 5 seconds'));
          }, 5000);
        }),
      ]);

      // Ensure getSession ALWAYS completes and sets loading to false
      sessionPromise
        .then((result: any) => {
          getSessionCompleted = true;
          const duration = performance.now() - getSessionStartTime;
          console.log(`[DIAG] getSession promise.then() handler executing (${duration.toFixed(2)}ms)`);
          
          if (!isMounted) {
            console.log('[DIAG] getSession resolved but component is unmounted');
            return;
          }
          
          const { data: { session }, error } = result;
          
          if (error) {
            console.error('[AUTH] getSession error:', error);
            console.log('[DIAG] Clearing safety timeout from getSession error handler');
            clearTimeout(safetyTimeout);
            setSession(null);
            setUser(null);
            setLoading(false);
            return;
          }
          
          console.log('[AUTH] getSession result - has session:', !!session);
          console.log('[DIAG] Clearing safety timeout from getSession success handler');
          clearTimeout(safetyTimeout);
          setSession(session);
          setUser(session?.user ?? null);
          setLoading(false);
        })
        .catch((error) => {
          getSessionCompleted = true;
          const duration = performance.now() - getSessionStartTime;
          console.log(`[DIAG] getSession promise.catch() handler executing (${duration.toFixed(2)}ms)`);
          
          if (!isMounted) {
            console.log('[DIAG] getSession rejected but component is unmounted');
            return;
          }
          
          console.error('[AUTH] getSession error or timeout:', error);
          console.error('[AUTH] This may indicate:', {
            'Wrong Supabase URL': 'Check VITE_SUPABASE_URL in .env',
            'Wrong Supabase Key': 'Check VITE_SUPABASE_PUBLISHABLE_KEY in .env',
            'Network Issue': 'Check browser console for CORS/network errors',
            'Project Migration': 'Ensure all env vars match your new Supabase project',
          });
          console.log('[DIAG] Clearing safety timeout from getSession catch handler');
          clearTimeout(safetyTimeout);
          setSession(null);
          setUser(null);
          setLoading(false);
        })
        .finally(() => {
          const totalDuration = performance.now() - authInitStartTime;
          console.log(`[DIAG] getSession finally block (total auth init: ${totalDuration.toFixed(2)}ms)`);
          getSessionCompleted = true;
        });
    } catch (error) {
      const errorDuration = performance.now() - authInitStartTime;
      console.error(`[AUTH] ❌ Failed to initialize auth listeners (${errorDuration.toFixed(2)}ms):`, error);
      console.log('[DIAG] Clearing safety timeout from catch block');
      clearTimeout(safetyTimeout);
      setSession(null);
      setUser(null);
      setLoading(false);
    }

    // Additional safety check: if loading is still true after 5s, force it false
    const additionalSafetyTimeout = setTimeout(() => {
      if (isMounted && loadingRef.current) {
        const totalDuration = performance.now() - authInitStartTime;
        console.warn(`[AUTH] ⚠️ Additional safety check (5s, elapsed: ${totalDuration.toFixed(2)}ms) - loading is still true, forcing to false`);
        console.warn('[AUTH] Status at safety check:', {
          authListenerSetup,
          getSessionCompleted,
          loading: loadingRef.current,
        });
        console.warn('[AUTH] This indicates a critical issue - loading state did not resolve properly');
        setLoading(false);
      }
    }, 5000);

    return () => {
      console.log('[DIAG] Cleaning up auth initialization effect');
      isMounted = false;
      if (subscription) {
        console.log('[DIAG] Unsubscribing from auth state changes');
        subscription.unsubscribe();
      }
      console.log('[DIAG] Clearing safety timeout in cleanup');
      clearTimeout(safetyTimeout);
      clearTimeout(additionalSafetyTimeout);
    };
  }, []);

  useEffect(() => {
    if (user) {
      console.log('[DIAG] User detected, starting couple data fetch');
      const dataFetchStartTime = performance.now();
      setCoupleLoading(true);
      console.log('[CONTEXT] Starting couple fetch for user:', user.id);
      
      // Track completion state
      let dataFetchCompleted = false;
      
      // Fetch user profile and couple data in parallel with comprehensive error handling
      const dataFetchPromise = Promise.allSettled([
        fetchUserProfile(user.id),
        fetchCouple(user.id)
      ]).then((results) => {
        const fetchDuration = performance.now() - dataFetchStartTime;
        console.log(`[DIAG] Promise.allSettled resolved after ${fetchDuration.toFixed(2)}ms`);
        
        const [profileResult, coupleResult] = results;
        
        // Log results
        if (profileResult.status === 'fulfilled') {
          console.log('[DIAG] fetchUserProfile completed successfully');
        } else {
          console.error('[DIAG] fetchUserProfile failed:', profileResult.reason);
        }
        
        if (coupleResult.status === 'fulfilled') {
          const coupleData = coupleResult.value;
          console.log('[CONTEXT] Couple fetch complete, hasCouple:', !!coupleData);
          
          if (coupleData) {
            console.log('[DIAG] Fetching cycle for couple:', coupleData.id);
            // Fetch cycle - don't block on this, but track it
            fetchCycle(coupleData.id)
              .then((cycleResult) => {
                console.log('[DIAG] fetchCycle completed');
                return cycleResult;
              })
              .catch((cycleError) => {
                console.error('[DIAG] fetchCycle failed:', cycleError);
                // Don't throw - cycle fetch failure shouldn't block app
              });
          }
        } else {
          console.error('[DIAG] fetchCouple failed:', coupleResult.reason);
        }
        
        dataFetchCompleted = true;
      }).catch((error) => {
        const fetchDuration = performance.now() - dataFetchStartTime;
        console.error(`[DIAG] Promise.allSettled rejected after ${fetchDuration.toFixed(2)}ms:`, error);
        dataFetchCompleted = true;
      }).finally(() => {
        const totalDuration = performance.now() - dataFetchStartTime;
        console.log(`[DIAG] Couple data fetch finally block executing after ${totalDuration.toFixed(2)}ms`);
        console.log('[DIAG] Data fetch completed:', dataFetchCompleted);
        setCoupleLoading(false);
      });
      
      // Additional safety: ensure coupleLoading is set to false after 12s maximum
      const coupleLoadingSafetyTimeout = setTimeout(() => {
        if (coupleLoadingRef.current) {
          const elapsed = performance.now() - dataFetchStartTime;
          console.warn(`[CONTEXT] ⚠️ Couple loading safety timeout (12s, elapsed: ${elapsed.toFixed(2)}ms) - forcing coupleLoading=false`);
          console.warn('[CONTEXT] Data fetch status:', {
            dataFetchCompleted,
            elapsed: `${elapsed.toFixed(2)}ms`,
          });
          setCoupleLoading(false);
        }
      }, 12000);

      // Realtime subscriptions with improved sync and detailed logging
      // Note: These are set up after data fetch starts, but don't block loading state
      const channelName = `couples-${user.id}-${Date.now()}`;
      console.log('[REALTIME] Setting up channel:', channelName);
      
      const couplesChannel = supabase
        .channel(channelName)
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'couples' 
        }, async (payload: any) => {
          console.log('[REALTIME] === Couples change detected ===');
          console.log('[REALTIME] Event type:', payload.eventType);
          console.log('[REALTIME] Old record:', JSON.stringify(payload.old, null, 2));
          console.log('[REALTIME] New record:', JSON.stringify(payload.new, null, 2));
          
          // Check if this update is relevant to this user
          const isRelevant = 
            payload.new?.partner_one === user.id || 
            payload.new?.partner_two === user.id ||
            payload.old?.partner_one === user.id ||
            payload.old?.partner_two === user.id;
          
          console.log('[REALTIME] Is relevant to user:', isRelevant);
          
          if (!isRelevant) {
            console.log('[REALTIME] Ignoring - not relevant to this user');
            return;
          }
          
          // Check if partner just joined (partner_two changed from null to a value)
          const partnerJoined = 
            payload.eventType === 'UPDATE' && 
            payload.new?.partner_two && 
            !payload.old?.partner_two;
          
          console.log('[REALTIME] Partner joined?', partnerJoined);
          
          if (partnerJoined) {
            console.log('[REALTIME] 🎉 Partner joined! New partner_two:', payload.new.partner_two);
            console.log('[REALTIME] Refreshing couple data multiple times...');
            
            // Immediate refresh
            await fetchCouple(user.id);
            console.log('[REALTIME] First refresh complete');
            
            // Delayed refreshes for consistency
            setTimeout(async () => {
              console.log('[REALTIME] Second refresh (300ms)');
              await fetchCouple(user.id);
            }, 300);
            
            setTimeout(async () => {
              console.log('[REALTIME] Third refresh (800ms)');
              await fetchCouple(user.id);
            }, 800);
            
            // Navigate both users to /input
            console.log('[REALTIME] Navigating to /input');
            navigate('/input');
          } else if (payload.eventType === 'UPDATE') {
            console.log('[REALTIME] Couple updated (not partner join), refreshing...');
            await fetchCouple(user.id);
          } else if (payload.eventType === 'DELETE') {
            console.log('[REALTIME] Couple deleted, clearing state...');
            setCouple(null);
            setPartnerProfile(null);
            setCurrentCycle(null);
            navigate('/');
          }
        })
        .subscribe((status) => {
          console.log('[REALTIME] Channel status:', status);
          if (status === 'SUBSCRIBED') {
            console.log('[REALTIME] ✅ Successfully subscribed to couples changes');
          } else if (status === 'CHANNEL_ERROR') {
            console.error('[REALTIME] ❌ Channel error');
          }
        });

      const cyclesChannel = supabase
        .channel(`cycles-${user.id}-${Date.now()}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'weekly_cycles' }, async (payload: any) => {
          console.log('[REALTIME] Cycles change:', payload.eventType, 'cycle id:', payload.new?.id);
          const oldData = payload.old;
          const newData = payload.new;
          
          const partnerOneInputChanged = newData?.partner_one_input && !oldData?.partner_one_input;
          const partnerTwoInputChanged = newData?.partner_two_input && !oldData?.partner_two_input;
          const synthesisReady = newData?.synthesized_output && !oldData?.synthesized_output;
          const bothNowComplete = newData?.partner_one_input && newData?.partner_two_input;
          
          if (partnerOneInputChanged || partnerTwoInputChanged) {
            // Fetch the cycle using the couple_id from the payload to avoid stale closure
            if (newData?.couple_id) {
              console.log('[REALTIME] Partner input changed, refreshing cycle for couple:', newData.couple_id);
              await fetchCycle(newData.couple_id);
              
              // If both partners just completed and no output yet, trigger synthesis
              if (bothNowComplete && !newData?.synthesized_output) {
                console.log('[REALTIME] Both partners complete, triggering synthesis...');
                // Trigger synthesis via the idempotent endpoint
                supabase.functions.invoke('trigger-synthesis', {
                  body: { cycleId: newData.id }
                }).then(result => {
                  console.log('[REALTIME] Synthesis trigger result:', result.data?.status);
                }).catch(err => {
                  console.error('[REALTIME] Synthesis trigger failed:', err);
                });
              }
            }
          }
          
          if (synthesisReady) {
            console.log('[REALTIME] Synthesis ready! Refreshing cycle and navigating to /picker');
            // Refresh cycle first to ensure state is updated
            if (newData?.couple_id) {
              await fetchCycle(newData.couple_id);
            }
            // Small delay to let state settle
            setTimeout(() => {
              navigate('/picker');
            }, 100);
          }
        })
        .subscribe();

      // Return cleanup function that handles both timeout and realtime subscriptions
      return () => {
        console.log('[DIAG] Cleaning up user data fetch effect');
        clearTimeout(coupleLoadingSafetyTimeout);
        console.log('[REALTIME] Cleaning up channels');
        supabase.removeChannel(couplesChannel);
        supabase.removeChannel(cyclesChannel);
      };
    } else {
      // Clear userProfile when logged out
      setUserProfile(null);
    }
  }, [user, couple?.id]);

  const refreshCouple = async () => {
    console.log('[CONTEXT] refreshCouple called');
    if (user) await fetchCouple(user.id);
  };

  const refreshCycle = useCallback(async (): Promise<WeeklyCycle | null> => {
    if (couple) {
      return await fetchCycle(couple.id);
    }
    return null;
  }, [couple?.id]);

  /**
   * Trigger synthesis using the idempotent endpoint.
   * Safe to call multiple times - will only run once per cycle.
   */
  const triggerSynthesis = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (!currentCycle?.id) {
      return { success: false, error: 'No current cycle' };
    }

    try {
      console.log('[CONTEXT] Triggering synthesis for cycle:', currentCycle.id);
      
      const { data, error } = await supabase.functions.invoke('trigger-synthesis', {
        body: { cycleId: currentCycle.id }
      });

      if (error) {
        console.error('[CONTEXT] Synthesis trigger error:', error);
        return { success: false, error: error.message };
      }

      if (data?.status === 'ready') {
        await refreshCycle();
        return { success: true };
      } else if (data?.status === 'generating') {
        return { success: true }; // In progress is also success
      } else if (data?.status === 'failed') {
        return { success: false, error: data.error || 'Synthesis failed' };
      } else if (data?.status === 'waiting') {
        return { success: false, error: 'Waiting for partner' };
      }

      return { success: false, error: 'Unknown response' };
    } catch (error) {
      console.error('[CONTEXT] Synthesis trigger exception:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }, [currentCycle?.id, refreshCycle]);

  // Derive the current cycle state
  const isPartnerOne = couple?.partner_one === user?.id;
  const cycleState = deriveCycleState(currentCycle, user?.id, isPartnerOne);

  const leaveCouple = async (): Promise<{ success: boolean; error?: string }> => {
    if (!couple || !user) {
      return { success: false, error: "No couple to leave" };
    }
    
    try {
      const isPartnerOne = couple.partner_one === user.id;
      
      if (isPartnerOne) {
        const { error } = await supabase
          .from('couples')
          .delete()
          .eq('id', couple.id);
        
        if (error) {
          console.error('Delete error:', error);
          throw error;
        }
      } else {
        const { error } = await supabase
          .from('couples')
          .update({ partner_two: null })
          .eq('id', couple.id);
        
        if (error) {
          console.error('Update error:', error);
          throw error;
        }
      }
      
      setCouple(null);
      setPartnerProfile(null);
      setCurrentCycle(null);
      navigate('/');
      return { success: true };
    } catch (error: any) {
      console.error('Error leaving couple:', error);
      return { success: false, error: error.message || 'Failed to leave couple' };
    }
  };

  const isFullyLoaded = !loading && !coupleLoading;
  
  // Diagnostic logging for isFullyLoaded calculation
  useEffect(() => {
    console.log('[DIAG] isFullyLoaded calculation:', {
      loading,
      coupleLoading,
      isFullyLoaded,
      contextLoading: !isFullyLoaded,
    });
  }, [loading, coupleLoading, isFullyLoaded]);

  return (
    <CoupleContext.Provider value={{
      user,
      session,
      couple,
      partnerProfile,
      userProfile,
      currentCycle,
      cycleState,
      loading: !isFullyLoaded,
      hasKnownSession,
      refreshCouple,
      refreshCycle,
      leaveCouple,
      triggerSynthesis,
    }}>
      {children}
    </CoupleContext.Provider>
  );
};

export const useCouple = () => {
  const context = useContext(CoupleContext);
  if (!context) throw new Error('useCouple must be used within CoupleProvider');
  return context;
};
