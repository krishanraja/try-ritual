import { useState, useEffect, useCallback } from 'react';
import { useCouple } from '@/contexts/CoupleContext';
import { usePremium } from '@/hooks/usePremium';
import { supabase } from '@/integrations/supabase/client';

interface SurpriseRitual {
  id: string;
  ritual_data: {
    title: string;
    description: string;
    time_estimate: string;
    category: string;
  };
  delivered_at: string;
  opened_at: string | null;
  completed_at: string | null;
  month: string;
}

export function useSurpriseRitual() {
  const { couple } = useCouple();
  const { isPremium } = usePremium();
  const [surprise, setSurprise] = useState<SurpriseRitual | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSurprise = useCallback(async () => {
    if (!couple?.id || !isPremium) {
      setSurprise(null);
      setIsLoading(false);
      return;
    }

    try {
      // Get current month's surprise
      const currentMonth = new Date();
      const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
        .toISOString()
        .split('T')[0];

      const { data, error } = await supabase
        .from('surprise_rituals')
        .select('*')
        .eq('couple_id', couple.id)
        .eq('month', monthStart)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching surprise ritual:', error);
      }

      setSurprise(data as unknown as SurpriseRitual | null);
    } catch (error) {
      console.error('Error in useSurpriseRitual:', error);
    } finally {
      setIsLoading(false);
    }
  }, [couple?.id, isPremium]);

  useEffect(() => {
    fetchSurprise();
  }, [fetchSurprise]);

  const refresh = useCallback(() => {
    fetchSurprise();
  }, [fetchSurprise]);

  return {
    surprise,
    isLoading,
    hasUnopened: surprise && !surprise.opened_at,
    hasUncompleted: surprise && surprise.opened_at && !surprise.completed_at,
    refresh
  };
}
