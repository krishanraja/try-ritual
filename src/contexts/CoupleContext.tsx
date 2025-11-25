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
      const { data, error } = await supabase
        .from('couples')
        .select(`
          *,
          partner_one_profile:profiles!couples_partner_one_fkey(id, name, email),
          partner_two_profile:profiles!couples_partner_two_fkey(id, name, email)
        `)
        .or(`partner_one.eq.${userId},partner_two.eq.${userId}`)
        .eq('is_active', true)
        .maybeSingle();
      
      if (error) throw error;
      setCouple(data);
      
      // Set partner profile (the other person in the couple)
      if (data) {
        const isPartnerOne = data.partner_one === userId;
        const partner = isPartnerOne ? data.partner_two_profile : data.partner_one_profile;
        setPartnerProfile(partner);
      } else {
        setPartnerProfile(null);
      }
      
      return data;
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
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
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
        .on('postgres_changes', { event: '*', schema: 'public', table: 'couples' }, (payload: any) => {
          // Celebrate when partner joins (only when partner_two is first added)
          if (
            payload.eventType === 'UPDATE' && 
            payload.new.partner_two && 
            !payload.old?.partner_two
          ) {
            toast.success("🎉 Your partner joined! Time to create rituals together!", { 
              duration: 5000
            });
            // Refetch to get partner profile data
            fetchCouple(user.id);
          }
        })
        .subscribe();

      const cyclesChannel = supabase
        .channel('cycles-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'weekly_cycles' }, (payload: any) => {
          if (payload.new?.synthesized_output && !payload.old?.synthesized_output) {
            toast.success("Your weekly rituals are ready! 🎉", { duration: 5000 });
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