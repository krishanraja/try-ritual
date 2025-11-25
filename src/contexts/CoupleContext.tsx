import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface CoupleContextType {
  user: any;
  session: any;
  couple: any;
  partnerProfile: any;
  currentCycle: any;
  loading: boolean;
  refreshCouple: () => Promise<void>;
  refreshCycle: () => Promise<void>;
  createCouple: () => void;
  shareCode: () => void;
  joinCouple: () => void;
  leaveCouple: () => Promise<void>;
}

const CoupleContext = createContext<CoupleContextType | null>(null);

export const CoupleProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [couple, setCouple] = useState<any>(null);
  const [partnerProfile, setPartnerProfile] = useState<any>(null);
  const [currentCycle, setCurrentCycle] = useState<any>(null);
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
          .select('id, name, email')
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
      const weekStart = new Date();
      weekStart.setHours(0, 0, 0, 0);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());

      const { data, error } = await supabase
        .from('weekly_cycles')
        .select('*')
        .eq('couple_id', coupleId)
        .eq('week_start_date', weekStart.toISOString().split('T')[0])
        .maybeSingle();

      if (error) throw error;
      setCurrentCycle(data);
      return data;
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
            const coupleData = await fetchCouple(user.id);
            const partnerName = partnerProfile?.name || 'Your partner';
            toast.success(`🎉 ${partnerName} joined!`, {
              description: 'Time to create rituals together',
              duration: 5000
            });
          } else {
            await fetchCouple(user.id);
          }
        })
        .subscribe();

      const cyclesChannel = supabase
        .channel('cycles-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'weekly_cycles' }, (payload: any) => {
          if (payload.new?.synthesized_output && !payload.old?.synthesized_output) {
            const partnerName = partnerProfile?.name || 'Your partner';
            toast.success(`✨ ${partnerName} finished! Your rituals are ready`, { duration: 5000 });
            navigate('/rituals');
          }
          if (couple) fetchCycle(couple.id);
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

  const createCouple = () => {
    const event = new CustomEvent('openCreateDialog');
    window.dispatchEvent(event);
  };

  const shareCode = () => {
    const event = new CustomEvent('openShareDrawer');
    window.dispatchEvent(event);
  };

  const joinCouple = () => {
    const event = new CustomEvent('openJoinDrawer');
    window.dispatchEvent(event);
  };

  const leaveCouple = async () => {
    if (!couple || !user) {
      toast.error("No couple to leave");
      return;
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
      toast.success("Left couple successfully");
      navigate('/home');
    } catch (error: any) {
      console.error('Error leaving couple:', error);
      toast.error(`Failed to leave couple: ${error.message}`);
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
      createCouple,
      shareCode,
      joinCouple,
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