import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { User } from '@supabase/supabase-js';
import type { Couple, Profile, WeeklyCycle } from '@/types/database';

interface CoupleContextType {
  user: User | null;
  session: any;
  couple: Couple | null;
  partnerProfile: Profile | null;
  currentCycle: WeeklyCycle | null;
  loading: boolean;
  refreshCouple: () => Promise<void>;
  refreshCycle: () => Promise<void>;
  leaveCouple: () => Promise<{ success: boolean; error?: string }>;
}

const CoupleContext = createContext<CoupleContextType | null>(null);

export const CoupleProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<any>(null);
  const [couple, setCouple] = useState<Couple | null>(null);
  const [partnerProfile, setPartnerProfile] = useState<Profile | null>(null);
  const [currentCycle, setCurrentCycle] = useState<WeeklyCycle | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchCouple = async (userId: string) => {
    try {
      // Step 1: Fetch couple (check both as partner_one and partner_two)
      const { data: asPartnerOne } = await supabase
        .from('couples')
        .select('*')
        .eq('partner_one', userId)
        .eq('is_active', true)
        .maybeSingle();

      const { data: asPartnerTwo } = await supabase
        .from('couples')
        .select('*')
        .eq('partner_two', userId)
        .eq('is_active', true)
        .maybeSingle();

      const coupleData = asPartnerOne || asPartnerTwo;
      
      if (!coupleData) {
        setCouple(null);
        setPartnerProfile(null);
        return null;
      }

      // Step 2: Fetch partner's profile separately
      const partnerId = coupleData.partner_one === userId 
        ? coupleData.partner_two 
        : coupleData.partner_one;
      
      if (partnerId) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', partnerId)
          .maybeSingle();
        
        setPartnerProfile(profile);
      } else {
        setPartnerProfile(null);
      }

      setCouple(coupleData);
      return coupleData;
    } catch (error) {
      console.error('Error fetching couple:', error);
      return null;
    }
  };

  const fetchCycle = async (coupleId: string) => {
    try {
      // First, try to find the most recent incomplete cycle
      // (where partners haven't finished or no synthesis/agreement yet)
      const { data: incompleteCycle, error: incompleteError } = await supabase
        .from('weekly_cycles')
        .select('*')
        .eq('couple_id', coupleId)
        .or('synthesized_output.is.null,agreement_reached.eq.false')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (incompleteError) throw incompleteError;

      // If we found an incomplete cycle, use it
      if (incompleteCycle) {
        setCurrentCycle(incompleteCycle);
        return incompleteCycle;
      }

      // Otherwise, check for current week's cycle
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
      console.error('Error fetching cycle:', error);
      return null;
    }
  };

  useEffect(() => {
    console.log('[AUTH] Initializing auth state...');
    
    // SAFETY NET: Force loading=false after 5 seconds no matter what
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
      fetchCouple(user.id).then((coupleData) => {
        if (coupleData) {
          fetchCycle(coupleData.id);
        }
      });

      // Realtime subscriptions
      const couplesChannel = supabase
        .channel('couples-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'couples' }, async (payload: any) => {
          // Check if partner just joined
          if (payload.eventType === 'UPDATE' && payload.new.partner_two && !payload.old?.partner_two) {
            await fetchCouple(user.id);
            // Redirect both users to /input
            navigate('/input');
          } else {
            await fetchCouple(user.id);
          }
        })
        .subscribe();

      const cyclesChannel = supabase
        .channel('cycles-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'weekly_cycles' }, (payload: any) => {
          const oldData = payload.old;
          const newData = payload.new;
          
          // Detect when partner submits input
          const partnerOneInputChanged = newData?.partner_one_input && !oldData?.partner_one_input;
          const partnerTwoInputChanged = newData?.partner_two_input && !oldData?.partner_two_input;
          const synthesisReady = newData?.synthesized_output && !oldData?.synthesized_output;
          
          if (partnerOneInputChanged || partnerTwoInputChanged) {
            if (couple) fetchCycle(couple.id);
          }
          
          if (synthesisReady) {
            navigate('/rituals');
          }
        })
        .subscribe();

      return () => {
        supabase.removeChannel(couplesChannel);
        supabase.removeChannel(cyclesChannel);
      };
    }
  }, [user, couple?.id]);

  const refreshCouple = async () => {
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
        // Partner one deletes the couple entirely
        const { error } = await supabase
          .from('couples')
          .delete()
          .eq('id', couple.id);
        
        if (error) {
          console.error('Delete error:', error);
          throw error;
        }
      } else {
        // Partner two removes themselves
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
      navigate('/home');
      return { success: true };
    } catch (error: any) {
      console.error('Error leaving couple:', error);
      return { success: false, error: error.message || 'Failed to leave couple' };
    }
  };

  return (
    <CoupleContext.Provider value={{
      user,
      session,
      couple,
      partnerProfile,
      currentCycle,
      loading,
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