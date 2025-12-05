import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, Sparkles, Heart, PartyPopper } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import confetti from 'canvas-confetti';

interface SurpriseRitual {
  id: string;
  ritual_data: {
    title: string;
    description: string;
    time_estimate: string;
    category: string;
  };
  opened_at: string | null;
  completed_at: string | null;
}

interface SurpriseRitualCardProps {
  surprise: SurpriseRitual;
  onOpen: () => void;
  onComplete: () => void;
}

export function SurpriseRitualCard({ surprise, onOpen, onComplete }: SurpriseRitualCardProps) {
  const [isRevealed, setIsRevealed] = useState(!!surprise.opened_at);
  const [isCompleting, setIsCompleting] = useState(false);

  const handleReveal = async () => {
    // Trigger confetti
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });

    // Update database
    await supabase
      .from('surprise_rituals')
      .update({ opened_at: new Date().toISOString() })
      .eq('id', surprise.id);

    setIsRevealed(true);
    onOpen();
  };

  const handleComplete = async () => {
    setIsCompleting(true);
    
    // Trigger celebration
    confetti({
      particleCount: 150,
      spread: 100,
      origin: { y: 0.5 }
    });

    await supabase
      .from('surprise_rituals')
      .update({ completed_at: new Date().toISOString() })
      .eq('id', surprise.id);

    setIsCompleting(false);
    onComplete();
  };

  const ritual = surprise.ritual_data;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative overflow-hidden rounded-2xl"
    >
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 via-rose-500/20 to-purple-500/20 animate-pulse" />
      
      <div className="relative bg-card/80 backdrop-blur-sm border border-amber-500/30 rounded-2xl p-6">
        {/* Premium badge */}
        <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 bg-amber-500/20 rounded-full">
          <Sparkles className="w-3 h-3 text-amber-400" />
          <span className="text-xs font-medium text-amber-400">Premium</span>
        </div>

        <AnimatePresence mode="wait">
          {!isRevealed ? (
            <motion.div
              key="wrapped"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0, rotateY: 90 }}
              transition={{ duration: 0.3 }}
              className="text-center py-8"
            >
              <motion.div
                animate={{ 
                  scale: [1, 1.1, 1],
                  rotate: [0, -5, 5, 0]
                }}
                transition={{ 
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="inline-block mb-4"
              >
                <Gift className="w-16 h-16 text-amber-400" />
              </motion.div>
              
              <h3 className="text-xl font-bold text-foreground mb-2">
                🎁 Surprise Ritual!
              </h3>
              <p className="text-muted-foreground mb-6">
                A special ritual just for you two this month
              </p>
              
              <Button
                onClick={handleReveal}
                className="bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white"
              >
                <PartyPopper className="w-4 h-4 mr-2" />
                Reveal Surprise
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key="revealed"
              initial={{ opacity: 0, rotateY: -90 }}
              animate={{ opacity: 1, rotateY: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <span className="text-sm font-medium text-amber-400">
                  Monthly Surprise
                </span>
              </div>

              <h3 className="text-xl font-bold text-foreground mb-2">
                {ritual.title}
              </h3>
              
              <p className="text-muted-foreground mb-4">
                {ritual.description}
              </p>

              <div className="flex items-center gap-4 text-sm text-muted-foreground mb-6">
                <span className="px-2 py-1 bg-muted rounded-full">
                  {ritual.time_estimate}
                </span>
                <span className="px-2 py-1 bg-muted rounded-full">
                  {ritual.category}
                </span>
              </div>

              {!surprise.completed_at ? (
                <Button
                  onClick={handleComplete}
                  disabled={isCompleting}
                  className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white"
                >
                  <Heart className="w-4 h-4 mr-2" />
                  {isCompleting ? 'Completing...' : 'Mark as Complete'}
                </Button>
              ) : (
                <div className="text-center py-3 bg-emerald-500/10 rounded-lg">
                  <span className="text-emerald-400 font-medium">
                    ✓ Completed!
                  </span>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
