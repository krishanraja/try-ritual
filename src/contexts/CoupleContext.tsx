import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { User } from '@supabase/supabase-js';
import type { Couple, PartnerProfile, WeeklyCycle } from '@/types/database';

// Version tracking for deployment verification
const CONTEXT_VERSION = '2024-12-13-v5';

// Check localStorage for existing Supabase session token (instant, synchronous)
const checkCachedSession = (): boolean => {
  try {
    const storageKey = `sb-gdojuuzlxpxftsfkmneu-auth-token`;
    const cached = localStorage.getItem(storageKey);
    return !!cached;
  } catch {
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
  loading: boolean;
  hasKnownSession: boolean;
  refreshCouple: () => Promise<void>;
  refreshCycle: () => Promise<void>;
  leaveCouple: () => Promise<{ success: boolean; error?: string }>;
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
  const [loading, setLoading] = useState(true);
  const [coupleLoading, setCoupleLoading] = useState(false);
  const navigate = useNavigate();

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', userId)
        .single();
      if (data) setUserProfile(data);
    } catch (error) {
      console.error('[PROFILE] Error fetching user profile:', error);
    }
  };

  const fetchCouple = async (userId: string) => {
    console.log('[COUPLE] fetchCouple called for user:', userId);
    try {
      // Step 1: Fetch couple (check both as partner_one and partner_two)
      const { data: asPartnerOne, error: err1 } = await supabase
        .from('couples')
        .select('*')
        .eq('partner_one', userId)
        .eq('is_active', true)
        .maybeSingle();

      const { data: asPartnerTwo, error: err2 } = await supabase
        .from('couples')
        .select('*')
        .eq('partner_two', userId)
        .eq('is_active', true)
        .maybeSingle();

      console.log('[COUPLE] Query results - asPartnerOne:', asPartnerOne?.id, 'asPartnerTwo:', asPartnerTwo?.id);
      if (err1) console.error('[COUPLE] Error fetching as partner_one:', err1);
      if (err2) console.error('[COUPLE] Error fetching as partner_two:', err2);

      const coupleData = asPartnerOne || asPartnerTwo;
      
      if (!coupleData) {
        console.log('[COUPLE] No active couple found for user');
        setCouple(null);
        setPartnerProfile(null);
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
        const { data: partnerName } = await supabase
          .rpc('get_partner_name', { partner_id: partnerId });
        
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
      return coupleData;
    } catch (error) {
      console.error('[COUPLE] Error fetching couple:', error);
      return null;
    }
  };

  const fetchCycle = async (coupleId: string) => {
    try {
      const { data: incompleteCycle, error: incompleteError } = await supabase
        .from('weekly_cycles')
        .select('*')
        .eq('couple_id', coupleId)
        .or('synthesized_output.is.null,agreement_reached.eq.false')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (incompleteError) throw incompleteError;

      if (incompleteCycle) {
        setCurrentCycle(incompleteCycle);
        return incompleteCycle;
      }

      const weekStart = new Date();
      weekStart.setHours(0, 0, 0, 0);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());

      const { data: currentWeekCycle, error: weekError } = await supabase
        .from('weekly_cycles')
        .select('*')
        .eq('couple_id', coupleId)
        .eq('week_start_date', weekStart.toISOString().split('T')[0])
        .maybeSingle();

      if (weekError) throw weekError;
      setCurrentCycle(currentWeekCycle);
      return currentWeekCycle;
    } catch (error) {
      console.error('[CYCLE] Error fetching cycle:', error);
      return null;
    }
  };

  useEffect(() => {
    console.log('[AUTH] Initializing auth state, context version:', CONTEXT_VERSION);
    
    const safetyTimeout = setTimeout(() => {
      console.log('[AUTH] ⚠️ Safety timeout triggered - forcing loading=false');
      setLoading(false);
    }, 5000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('[AUTH] onAuthStateChange event:', _event, 'has session:', !!session);
      clearTimeout(safetyTimeout);
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('[AUTH] getSession result - has session:', !!session);
      clearTimeout(safetyTimeout);
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    }).catch((error) => {
      console.error('[AUTH] getSession error:', error);
      clearTimeout(safetyTimeout);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
      clearTimeout(safetyTimeout);
    };
  }, []);

  useEffect(() => {
    if (user) {
      setCoupleLoading(true);
      console.log('[CONTEXT] Starting couple fetch for user:', user.id);
      
      // Fetch user profile and couple data in parallel
      Promise.all([
        fetchUserProfile(user.id),
        fetchCouple(user.id)
      ]).then(([_, coupleData]) => {
        console.log('[CONTEXT] Couple fetch complete, hasCouple:', !!coupleData);
        if (coupleData) {
          return fetchCycle(coupleData.id);
        }
      }).finally(() => {
        setCoupleLoading(false);
      });

      // Realtime subscriptions with improved sync and detailed logging
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
          
          if (partnerOneInputChanged || partnerTwoInputChanged) {
            // Fetch the cycle using the couple_id from the payload to avoid stale closure
            if (newData?.couple_id) {
              console.log('[REALTIME] Partner input changed, refreshing cycle for couple:', newData.couple_id);
              await fetchCycle(newData.couple_id);
            }
          }
          
          if (synthesisReady) {
            console.log('[REALTIME] Synthesis ready! Navigating to /picker');
            // Small delay to let state settle
            setTimeout(() => {
              navigate('/picker');
            }, 100);
          }
        })
        .subscribe();

      return () => {
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

  const refreshCycle = async () => {
    if (couple) await fetchCycle(couple.id);
  };

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

  return (
    <CoupleContext.Provider value={{
      user,
      session,
      couple,
      partnerProfile,
      userProfile,
      currentCycle,
      loading: !isFullyLoaded,
      hasKnownSession,
      refreshCouple,
      refreshCycle,
      leaveCouple,
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
