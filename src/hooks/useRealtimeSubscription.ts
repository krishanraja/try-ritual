/**
 * Realtime Subscription Manager Hook
 * 
 * Centralized management of Supabase Realtime subscriptions to:
 * - Track all active subscriptions
 * - Ensure proper cleanup
 * - Prevent duplicate subscriptions
 * - Handle reconnection logic
 */

import { useEffect, useRef, useCallback } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface SubscriptionOptions {
  channelName: string;
  table: string;
  filter?: string;
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  schema?: string;
  onEvent: (payload: any) => void | Promise<void>;
  onStatusChange?: (status: string) => void;
}

/**
 * Hook to manage a single Realtime subscription with automatic cleanup
 */
export function useRealtimeSubscription({
  channelName,
  table,
  filter,
  event = '*',
  schema = 'public',
  onEvent,
  onStatusChange,
}: SubscriptionOptions) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const isSubscribedRef = useRef(false);

  useEffect(() => {
    // Don't create subscription if already exists
    if (isSubscribedRef.current && channelRef.current) {
      return;
    }

    console.log(`[RealtimeSubscription] Setting up subscription: ${channelName}`);

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event,
          schema,
          table,
          ...(filter && { filter }),
        },
        async (payload) => {
          try {
            await onEvent(payload);
          } catch (error) {
            console.error(`[RealtimeSubscription] Error in event handler for ${channelName}:`, error);
          }
        }
      )
      .subscribe((status) => {
        console.log(`[RealtimeSubscription] ${channelName} status:`, status);
        onStatusChange?.(status);
        
        if (status === 'SUBSCRIBED') {
          isSubscribedRef.current = true;
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          isSubscribedRef.current = false;
        }
      });

    channelRef.current = channel;
    isSubscribedRef.current = true;

    return () => {
      console.log(`[RealtimeSubscription] Cleaning up subscription: ${channelName}`);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
        isSubscribedRef.current = false;
      }
    };
  }, [channelName, table, filter, event, schema, onEvent, onStatusChange]);

  return {
    channel: channelRef.current,
    isSubscribed: isSubscribedRef.current,
  };
}

/**
 * Hook to manage multiple subscriptions with a single cleanup
 */
export function useRealtimeSubscriptions(subscriptions: SubscriptionOptions[]) {
  const channelsRef = useRef<RealtimeChannel[]>([]);

  useEffect(() => {
    console.log(`[RealtimeSubscriptions] Setting up ${subscriptions.length} subscriptions`);

    const channels = subscriptions.map(({ channelName, table, filter, event = '*', schema = 'public', onEvent, onStatusChange }) => {
      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event,
            schema,
            table,
            ...(filter && { filter }),
          },
          async (payload) => {
            try {
              await onEvent(payload);
            } catch (error) {
              console.error(`[RealtimeSubscriptions] Error in event handler for ${channelName}:`, error);
            }
          }
        )
        .subscribe((status) => {
          console.log(`[RealtimeSubscriptions] ${channelName} status:`, status);
          onStatusChange?.(status);
        });

      return channel;
    });

    channelsRef.current = channels;

    return () => {
      console.log(`[RealtimeSubscriptions] Cleaning up ${channels.length} subscriptions`);
      channels.forEach((channel) => {
        supabase.removeChannel(channel);
      });
      channelsRef.current = [];
    };
  }, [subscriptions]);

  return channelsRef.current;
}

