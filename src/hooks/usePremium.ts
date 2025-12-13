import { useState, useEffect, useCallback } from 'react';
import { useCouple } from '@/contexts/CoupleContext';
import { supabase } from '@/integrations/supabase/client';

export interface PremiumStatus {
  isPremium: boolean;
  isLoading: boolean;
  expiresAt: Date | null;
  subscriptionId: string | null;
  // Feature limits
  canSwap: boolean;
  swapsRemaining: number;
  canNudge: boolean;
  nudgesUsedThisWeek: number;
  canUploadPhotos: boolean;
  maxNotesLength: number;
  ritualsToShow: number;
  // Actions
  refresh: () => Promise<void>;
}

const FREE_LIMITS = {
  swaps: 1,
  nudgesPerWeek: 2,
  maxNotesLength: 250,
  ritualsToShow: 3,
};

const PREMIUM_LIMITS = {
  swaps: 3,
  nudgesPerWeek: Infinity,
  maxNotesLength: Infinity,
  ritualsToShow: 5,
};

export function usePremium(): PremiumStatus {
  const { couple, currentCycle } = useCouple();
  const [isLoading, setIsLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(false);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [subscriptionId, setSubscriptionId] = useState<string | null>(null);
  const [nudgesUsedThisWeek, setNudgesUsedThisWeek] = useState(0);
  const [swapsUsed, setSwapsUsed] = useState(0);

  const refresh = useCallback(async () => {
    if (!couple?.id) {
      setIsLoading(false);
      return;
    }

    try {
      // Fetch couple's premium status (dev accounts should use Stripe for permanent premium)
      const { data: coupleData, error } = await supabase
        .from('couples')
        .select('premium_expires_at, subscription_id')
        .eq('id', couple.id)
        .single();

      if (error) throw error;

      const now = new Date();
      const expires = coupleData?.premium_expires_at 
        ? new Date(coupleData.premium_expires_at) 
        : null;
      
      const premium = expires ? expires > now : false;
      
      setIsPremium(premium);
      setExpiresAt(expires);
      setSubscriptionId(coupleData?.subscription_id || null);

      // Fetch current cycle limits
      if (currentCycle?.id) {
        const { data: cycleData } = await supabase
          .from('weekly_cycles')
          .select('swaps_used, nudge_count')
          .eq('id', currentCycle.id)
          .single();

        if (cycleData) {
          setSwapsUsed(cycleData.swaps_used || 0);
          setNudgesUsedThisWeek(cycleData.nudge_count || 0);
        }
      }
    } catch (error) {
      console.error('Error fetching premium status:', error);
    } finally {
      setIsLoading(false);
    }
  }, [couple?.id, currentCycle?.id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Auto-refresh every minute
  useEffect(() => {
    const interval = setInterval(refresh, 60000);
    return () => clearInterval(interval);
  }, [refresh]);

  const limits = isPremium ? PREMIUM_LIMITS : FREE_LIMITS;

  return {
    isPremium,
    isLoading,
    expiresAt,
    subscriptionId,
    canSwap: swapsUsed < limits.swaps,
    swapsRemaining: Math.max(0, limits.swaps - swapsUsed),
    canNudge: isPremium || nudgesUsedThisWeek < limits.nudgesPerWeek,
    nudgesUsedThisWeek,
    canUploadPhotos: true, // All users can upload photos - premium just gets higher quality
    maxNotesLength: limits.maxNotesLength,
    ritualsToShow: limits.ritualsToShow,
    refresh,
  };
}

// Constants for use in other components
export const STRIPE_PRICE_ID = 'price_1SaqzE4w6vAdI2o5c5BQrdNt';
export const PREMIUM_PRICE = '$3.99/month';
