/**
 * MemoryReactions Component
 * 
 * Displays and manages emoji reactions on ritual memories.
 * Partners can react to each other's completed rituals.
 * Real-time updates via Supabase subscription.
 * 
 * @created 2025-12-11
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useCouple } from '@/contexts/CoupleContext';

const REACTIONS = ['❤️', '🔥', '😍', '🥹', '👏'] as const;
type Reaction = typeof REACTIONS[number];

interface MemoryReaction {
  id: string;
  memory_id: string;
  user_id: string;
  reaction: string;
  created_at: string;
}

interface MemoryReactionsProps {
  memoryId: string;
  className?: string;
}

export function MemoryReactions({ memoryId, className }: MemoryReactionsProps) {
  const { user } = useCouple();
  const [reactions, setReactions] = useState<MemoryReaction[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [userReaction, setUserReaction] = useState<string | null>(null);
  const isMountedRef = useRef(true);
  
  // Track mounted state for async callbacks
  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  // Memoized fetch function with proper dependencies
  const fetchReactions = useCallback(async () => {
    const { data, error } = await supabase
      .from('memory_reactions')
      .select('*')
      .eq('memory_id', memoryId);

    if (!isMountedRef.current) return; // Guard against unmounted state updates
    
    if (error) {
      console.error('[MemoryReactions] Error fetching:', error);
      return;
    }

    setReactions(data || []);
    const myReaction = data?.find((r) => r.user_id === user?.id);
    setUserReaction(myReaction?.reaction || null);
  }, [memoryId, user?.id]);

  // Fetch initial reactions
  useEffect(() => {
    fetchReactions();
  }, [fetchReactions]);

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel(`reactions-${memoryId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'memory_reactions',
          filter: `memory_id=eq.${memoryId}`,
        },
        () => {
          fetchReactions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [memoryId, fetchReactions]);

  const handleReaction = async (reaction: Reaction) => {
    if (!user) return;

    try {
      if (userReaction === reaction) {
        // Remove reaction
        await supabase
          .from('memory_reactions')
          .delete()
          .eq('memory_id', memoryId)
          .eq('user_id', user.id);
        setUserReaction(null);
      } else if (userReaction) {
        // Update existing reaction
        await supabase
          .from('memory_reactions')
          .update({ reaction })
          .eq('memory_id', memoryId)
          .eq('user_id', user.id);
        setUserReaction(reaction);
      } else {
        // Add new reaction
        await supabase
          .from('memory_reactions')
          .insert({
            memory_id: memoryId,
            user_id: user.id,
            reaction,
          });
        setUserReaction(reaction);
      }
    } catch (error) {
      console.error('[MemoryReactions] Error updating reaction:', error);
    }

    setShowPicker(false);
  };

  // Get partner's reaction (not current user's)
  const partnerReaction = reactions.find((r) => r.user_id !== user?.id);

  return (
    <div className={`relative ${className}`}>
      {/* Display reactions */}
      <div className="flex items-center gap-1">
        {/* Partner's reaction bubble */}
        {partnerReaction && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-sm"
          >
            {partnerReaction.reaction}
          </motion.div>
        )}

        {/* User's reaction or add button */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => setShowPicker(!showPicker)}
          className={`w-7 h-7 rounded-full flex items-center justify-center text-sm transition-colors ${
            userReaction
              ? 'bg-primary/20 border border-primary/30'
              : 'bg-secondary/50 hover:bg-secondary'
          }`}
        >
          {userReaction || '+'}
        </motion.button>
      </div>

      {/* Reaction picker */}
      <AnimatePresence>
        {showPicker && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 10 }}
            className="absolute bottom-full mb-2 left-0 bg-card border rounded-full px-2 py-1.5 flex items-center gap-1 shadow-lg z-10"
          >
            {REACTIONS.map((reaction) => (
              <motion.button
                key={reaction}
                whileHover={{ scale: 1.2 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => handleReaction(reaction)}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-lg transition-colors ${
                  userReaction === reaction ? 'bg-primary/20' : 'hover:bg-secondary'
                }`}
              >
                {reaction}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
