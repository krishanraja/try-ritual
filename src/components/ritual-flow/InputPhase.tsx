/**
 * InputPhase Component
 * 
 * Mood card selection for the input phase.
 * Users tap cards to select their preferences.
 * 
 * @created 2025-12-26
 */

import { useState } from 'react';
import type React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Sparkles, AlertCircle, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MOOD_CARDS, MAX_CARD_SELECTIONS, type MoodCard } from '@/data/moodCards';
import { cn } from '@/lib/utils';

interface InputPhaseProps {
  selectedCards: string[];
  desire: string;
  onSelectCard: (cardId: string) => void;
  onSetDesire: (desire: string) => void;
  onSubmit: () => Promise<void>;
  error: string | null;
  partnerProgress?: { inputDone: boolean };
}

export function InputPhase({
  selectedCards,
  desire,
  onSelectCard,
  onSetDesire,
  onSubmit,
  error,
  partnerProgress
}: InputPhaseProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDesireInput, setShowDesireInput] = useState(false);
  
  const handleSubmit = async (e?: React.MouseEvent<HTMLButtonElement>) => {
    // Prevent any default behavior
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    console.log('[InputPhase] handleSubmit called', {
      canSubmit,
      selectedCardsCount: selectedCards.length,
      isSubmitting,
      timestamp: new Date().toISOString(),
    });
    
    if (!canSubmit) {
      console.warn('[InputPhase] Submit blocked - canSubmit is false', {
        selectedCardsCount: selectedCards.length,
        minimumRequired: 3,
      });
      return;
    }
    
    if (isSubmitting) {
      console.warn('[InputPhase] Submit blocked - already submitting');
      return;
    }
    
    setIsSubmitting(true);
    try {
      console.log('[InputPhase] Calling onSubmit...');
      await onSubmit();
      console.log('[InputPhase] onSubmit completed successfully');
    } catch (error) {
      console.error('[InputPhase] Error in handleSubmit:', error);
      // Error should be handled by parent component via error prop
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit = selectedCards.length >= 3;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-none px-4 py-3">
        {error && (
          <div className="mb-3 flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-lg p-3">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
        
        <div className="text-center mb-3">
          <h2 className="text-xl font-bold mb-1">How are you feeling?</h2>
          <p className="text-sm text-muted-foreground">
            Select at least 3 cards (up to {MAX_CARD_SELECTIONS}) that resonate with you
          </p>
        </div>

        {/* Partner progress indicator */}
        {partnerProgress?.inputDone && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-center gap-2 text-sm text-green-600 bg-green-50 rounded-full px-4 py-2 mx-auto w-fit mb-3"
          >
            <Check className="w-4 h-4" />
            <span>Partner has submitted!</span>
          </motion.div>
        )}

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
      </div>

      {/* Scrollable card grid */}
      <div className="flex-1 overflow-y-auto min-h-0 px-4">
        <div className="grid grid-cols-2 gap-3 pb-4">
          {MOOD_CARDS.map((card, index) => (
            <MoodCardButton
              key={card.id}
              card={card}
              isSelected={selectedCards.includes(card.id)}
              isDisabled={selectedCards.length >= MAX_CARD_SELECTIONS && !selectedCards.includes(card.id)}
              onClick={() => onSelectCard(card.id)}
              delay={index * 0.03}
            />
          ))}
        </div>

        {/* Optional desire input */}
        <AnimatePresence>
          {canSubmit && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4"
            >
              {!showDesireInput ? (
                <button
                  onClick={() => setShowDesireInput(true)}
                  className="w-full p-3 rounded-xl border-2 border-dashed border-muted-foreground/30 text-muted-foreground text-sm flex items-center justify-center gap-2 hover:border-primary/50 transition-colors"
                >
                  <MessageSquare className="w-4 h-4" />
                  Add what you're craving (optional)
                </button>
              ) : (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Anything specific you're craving?</label>
                  <Textarea
                    value={desire}
                    onChange={(e) => onSetDesire(e.target.value)}
                    placeholder="e.g., A cozy night in, an adventure outdoors, trying something new..."
                    className="resize-none"
                    rows={3}
                  />
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Submit button */}
      <div className="flex-none px-4 py-3 pb-safe bg-background/95 backdrop-blur-sm border-t relative z-10">
        <Button
          onClick={handleSubmit}
          disabled={!canSubmit || isSubmitting}
          className="w-full h-12 bg-gradient-to-r from-primary to-purple-500 text-white relative z-10"
          type="button"
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Submitting...
            </span>
          ) : selectedCards.length < 3 ? (
            `Select ${3 - selectedCards.length} more card${3 - selectedCards.length > 1 ? 's' : ''}`
          ) : (
            <span className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Submit & Continue
            </span>
          )}
        </Button>
      </div>
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
      className={cn(
        "relative p-4 rounded-2xl border-2 overflow-hidden transition-all duration-200",
        isSelected
          ? "border-primary bg-primary/10 shadow-lg shadow-primary/20"
          : isDisabled
            ? "border-border/50 bg-muted/30 opacity-50 cursor-not-allowed"
            : "border-border bg-card hover:border-primary/50 hover:shadow-md"
      )}
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
        <span className={cn(
          "text-sm font-medium text-center",
          isSelected ? "text-primary" : "text-foreground"
        )}>
          {card.label}
        </span>
      </div>
    </motion.button>
  );
}

