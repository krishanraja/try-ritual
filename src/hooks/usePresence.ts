import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCouple } from '@/contexts/CoupleContext';

interface PresenceState {
  user_id: string;
  online_at: string;
  activity?: string;
}

export const usePresence = (channelName: string, activity?: string) => {
  const { user, couple } = useCouple();
  const [partnerPresence, setPartnerPresence] = useState<PresenceState | null>(null);
  const [isPartnerOnline, setIsPartnerOnline] = useState(false);

  useEffect(() => {
    if (!user || !couple) return;

    const channel = supabase.channel(channelName);

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const presences = Object.values(state).flat() as any[];
        
        const partnerId = couple.partner_one === user.id ? couple.partner_two : couple.partner_one;
        const partner = presences.find((p: any) => p.user_id === partnerId);
        
        setPartnerPresence(partner || null);
        setIsPartnerOnline(!!partner);
      })
      .on('presence', { event: 'join' }, () => {
        const state = channel.presenceState();
        const presences = Object.values(state).flat() as any[];
        const partnerId = couple.partner_one === user.id ? couple.partner_two : couple.partner_one;
        const partner = presences.find((p: any) => p.user_id === partnerId);
        setIsPartnerOnline(!!partner);
      })
      .on('presence', { event: 'leave' }, () => {
        const state = channel.presenceState();
        const presences = Object.values(state).flat() as any[];
        const partnerId = couple.partner_one === user.id ? couple.partner_two : couple.partner_one;
        const partner = presences.find((p: any) => p.user_id === partnerId);
        setIsPartnerOnline(!!partner);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: user.id,
            online_at: new Date().toISOString(),
            activity: activity || 'online',
          });
        }
      });

    return () => {
      channel.untrack();
      supabase.removeChannel(channel);
    };
  }, [user, couple, channelName, activity]);

  return { partnerPresence, isPartnerOnline };
};