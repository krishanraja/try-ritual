import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface CoupleContextType {
  user: any;
  session: any;
  couple: any;
  currentCycle: any;
  loading: boolean;
  refreshCouple: () => Promise<void>;
  refreshCycle: () => Promise<void>;
  shareCode: () => void;
  joinCouple: () => void;
  leaveCouple: () => Promise<void>;
}

const CoupleContext = createContext<CoupleContextType | null>(null);

export const CoupleProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [couple, setCouple] = useState<any>(null);
  const [currentCycle, setCurrentCycle] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchCouple = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('couples')
        .select('*')
        .or(`partner_one.eq.${userId},partner_two.eq.${userId}`)
        .maybeSingle();
      
      if (error) throw error;
      setCouple(data);
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
        .on('postgres_changes', { event: '*', schema: 'public', table: 'couples' }, () => {
          fetchCouple(user.id);
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

  const shareCode = () => {
    const event = new CustomEvent('openShareDrawer');
    window.dispatchEvent(event);
  };

  const joinCouple = () => {
    const event = new CustomEvent('openJoinDrawer');
    window.dispatchEvent(event);
  };

  const leaveCouple = async () => {
    if (!couple || !user) return;
    
    try {
      const isPartnerOne = couple.partner_one === user.id;
      
      if (isPartnerOne) {
        // If partner one leaves, delete the couple
        await supabase.from('couples').delete().eq('id', couple.id);
      } else {
        // If partner two leaves, just remove them
        await supabase.from('couples').update({ partner_two: null }).eq('id', couple.id);
      }
      
      setCouple(null);
      setCurrentCycle(null);
      toast.success('Left couple successfully');
      navigate('/');
    } catch (error) {
      console.error('Error leaving couple:', error);
      toast.error('Failed to leave couple');
    }
  };

  return (
    <CoupleContext.Provider value={{
      user,
      session,
      couple,
      currentCycle,
      loading,
      refreshCouple,
      refreshCycle,
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