/**
 * CardDrawInput Component
 * 
 * A gamified mood card selection interface replacing the old QuickInput questions.
 * Users tap cards to select their preferences (max 5).
 * Shows partner's progress in real-time.
 * 
 * @created 2025-12-11
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Sparkles, User } from 'lucide-react';
import { MOOD_CARDS, MAX_CARD_SELECTIONS, type MoodCard } from '@/data/moodCards';
import { supabase } from '@/integrations/supabase/client';
import { useCouple } from '@/contexts/CoupleContext';

interface CardDrawInputProps {
  onComplete: (selectedCards: string[]) => void;
  cycleId: string;
}

export function CardDrawInput({ onComplete, cycleId }: CardDrawInputProps) {
  const { user, couple } = useCouple();
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [partnerCount, setPartnerCount] = useState<number | null>(null);

  const isPartnerOne = couple?.partner_one === user?.id;

  // Fetch initial partner progress
  useEffect(() => {
    if (!cycleId || !couple || !user) return;

    const fetchInitialProgress = async () => {
      try {
        const { data, error } = await supabase
          .from('weekly_cycles')
          .select('partner_one_input, partner_two_input')
          .eq('id', cycleId)
          .single();

        if (error) {
          console.error('[CardDrawInput] Error fetching progress:', error);
          return;
        }

        if (data) {
          const partnerInput = isPartnerOne ? data.partner_two_input : data.partner_one_input;
          if (partnerInput && typeof partnerInput === 'object' && 'cards' in (partnerInput as object)) {
            const cards = (partnerInput as { cards: string[] }).cards;
            setPartnerCount(cards?.length || 0);
          }
        }
      } catch (error) {
        console.error('[CardDrawInput] Error in fetchInitialProgress:', error);
      }
    };

    fetchInitialProgress();
  }, [cycleId, couple, isPartnerOne, user]);

  // Real-time subscription for partner's progress updates (stable channel name)
  useEffect(() => {
    if (!cycleId || !couple || !user) return;

    const channel = supabase
      .channel(`cycle-progress-${cycleId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'weekly_cycles',
          filter: `id=eq.${cycleId}`,
        },
        (payload) => {
          try {
            const newData = payload.new as Record<string, unknown>;
            const partnerInput = isPartnerOne
              ? newData.partner_two_input
              : newData.partner_one_input;

            if (partnerInput && typeof partnerInput === 'object' && 'cards' in (partnerInput as object)) {
              const cards = (partnerInput as { cards: string[] }).cards;
              setPartnerCount(cards?.length || 0);
            }
          } catch (error) {
            console.error('[CardDrawInput] Error processing realtime update:', error);
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[CardDrawInput] ✅ Realtime subscription active');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[CardDrawInput] Realtime channel error');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [cycleId, couple, isPartnerOne, user]);

  const toggleCard = (cardId: string) => {
    setSelectedCards((prev) => {
      if (prev.includes(cardId)) {
        return prev.filter((id) => id !== cardId);
      }
      if (prev.length >= MAX_CARD_SELECTIONS) {
        return prev;
      }
      return [...prev, cardId];
    });
  };

  const handleContinue = () => {
    if (selectedCards.length > 0) {
      onComplete(selectedCards);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">How are you feeling?</h2>
        <p className="text-muted-foreground">
          Tap up to {MAX_CARD_SELECTIONS} cards that resonate with you
        </p>
      </div>

      {/* Partner progress indicator */}
      <AnimatePresence>
        {partnerCount !== null && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center justify-center gap-2 text-sm text-muted-foreground bg-secondary/50 rounded-full px-4 py-2 mx-auto w-fit"
          >
            <User className="w-4 h-4" />
            <span>Partner picked {partnerCount} card{partnerCount !== 1 ? 's' : ''}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Selection counter */}
      <div className="flex items-center justify-center gap-2">
        {[...Array(MAX_CARD_SELECTIONS)].map((_, i) => (
          <motion.div
            key={i}
            animate={{
              scale: i < selectedCards.length ? 1.2 : 1,
              backgroundColor: i < selectedCards.length ? 'hsl(var(--primary))' : 'hsl(var(--muted))',
            }}
            className="w-2.5 h-2.5 rounded-full"
          />
        ))}
        <span className="text-sm text-muted-foreground ml-2">
          {selectedCards.length}/{MAX_CARD_SELECTIONS}
        </span>
      </div>

      {/* Card grid */}
      <div className="grid grid-cols-2 gap-3">
        {MOOD_CARDS.map((card, index) => (
          <MoodCardButton
            key={card.id}
            card={card}
            isSelected={selectedCards.includes(card.id)}
            isDisabled={selectedCards.length >= MAX_CARD_SELECTIONS && !selectedCards.includes(card.id)}
            onClick={() => toggleCard(card.id)}
            delay={index * 0.05}
          />
        ))}
      </div>

      {/* Continue button */}
      <AnimatePresence>
        {selectedCards.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            <button
              onClick={handleContinue}
              className="w-full py-4 rounded-xl bg-gradient-ritual text-white font-semibold text-lg shadow-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            >
              <Sparkles className="w-5 h-5" />
              Continue with {selectedCards.length} card{selectedCards.length !== 1 ? 's' : ''}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Individual mood card button
interface MoodCardButtonProps {
  card: MoodCard;
  isSelected: boolean;
  isDisabled: boolean;
  onClick: () => void;
  delay: number;
}

function MoodCardButton({ card, isSelected, isDisabled, onClick, delay }: MoodCardButtonProps) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      disabled={isDisabled}
      className={`
        relative p-4 rounded-2xl border-2 overflow-hidden transition-all duration-200
        ${isSelected
          ? 'border-primary bg-primary/10 shadow-lg shadow-primary/20'
          : isDisabled
            ? 'border-border/50 bg-muted/30 opacity-50 cursor-not-allowed'
            : 'border-border bg-card hover:border-primary/50 hover:shadow-md'
        }
      `}
    >
      {/* Gradient background when selected - inset accounts for border width */}
      {isSelected && (
        <motion.div
          layoutId={`card-bg-${card.id}`}
          className={`absolute inset-0 rounded-xl bg-gradient-to-br ${card.gradient} opacity-20`}
          initial={false}
        />
      )}

      {/* Check indicator */}
      <AnimatePresence>
        {isSelected && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-primary flex items-center justify-center"
          >
            <Check className="w-3.5 h-3.5 text-primary-foreground" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Card content */}
      <div className="relative z-10 flex flex-col items-center gap-2">
        <motion.span
          animate={{ scale: isSelected ? 1.2 : 1 }}
          className="text-3xl"
        >
          {card.emoji}
        </motion.span>
        <span className={`text-sm font-medium text-center ${isSelected ? 'text-primary' : 'text-foreground'}`}>
          {card.label}
        </span>
      </div>
    </motion.button>
  );
}
