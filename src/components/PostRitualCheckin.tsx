import { useState } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { motion } from 'framer-motion';
import { Heart, X, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PostRitualCheckinProps {
  coupleId: string;
  cycleId: string;
  ritualTitle: string;
  onComplete: () => void;
  onDismiss: () => void;
}

export const PostRitualCheckin = ({
  coupleId,
  cycleId,
  ritualTitle,
  onComplete,
  onDismiss
}: PostRitualCheckinProps) => {
  const [step, setStep] = useState<'complete' | 'rating' | 'repeat' | 'done'>('complete');
  const [didComplete, setDidComplete] = useState<boolean | null>(null);
  const [rating, setRating] = useState<number | null>(null);
  const [wouldRepeat, setWouldRepeat] = useState<string | null>(null);

  const handleSubmit = async () => {
    try {
      const { error } = await supabase
        .from('ritual_feedback')
        .insert({
          couple_id: coupleId,
          weekly_cycle_id: cycleId,
          did_complete: didComplete,
          connection_rating: rating,
          would_repeat: wouldRepeat
        });

      if (error) throw error;

      toast.success('Thanks for sharing! 💕');
      setStep('done');
      setTimeout(() => {
        onComplete();
      }, 1500);
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast.error('Failed to save feedback');
    }
  };

  if (step === 'complete') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="fixed inset-x-0 bottom-20 px-4 z-50"
      >
        <Card className="p-4 bg-background/95 backdrop-blur-sm border-primary/20 shadow-lg">
          <div className="flex items-start justify-between mb-3">
            <h3 className="font-bold text-lg">How'd it go? 💕</h3>
            <button onClick={onDismiss} className="text-muted-foreground hover:text-foreground">
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Did you do <span className="font-semibold text-foreground">{ritualTitle}</span>?
          </p>
          <div className="flex gap-2">
            <Button
              onClick={() => {
                setDidComplete(true);
                setStep('rating');
              }}
              className="flex-1 bg-gradient-ritual text-white"
            >
              Yes! ✨
            </Button>
            <Button
              onClick={() => {
                setDidComplete(false);
                handleSubmit();
              }}
              variant="outline"
              className="flex-1"
            >
              Not yet
            </Button>
          </div>
        </Card>
      </motion.div>
    );
  }

  if (step === 'rating') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="fixed inset-x-0 bottom-20 px-4 z-50"
      >
        <Card className="p-4 bg-background/95 backdrop-blur-sm border-primary/20 shadow-lg">
          <h3 className="font-bold text-lg mb-3">How connected did you feel?</h3>
          <div className="flex justify-center gap-2 mb-4">
            {[1, 2, 3, 4, 5].map((num) => (
              <button
                key={num}
                onClick={() => {
                  setRating(num);
                  setStep('repeat');
                }}
                className="transition-transform hover:scale-110"
              >
                <Heart
                  className={`w-10 h-10 ${
                    rating && rating >= num
                      ? 'text-primary fill-current'
                      : 'text-muted-foreground'
                  }`}
                />
              </button>
            ))}
          </div>
        </Card>
      </motion.div>
    );
  }

  if (step === 'repeat') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="fixed inset-x-0 bottom-20 px-4 z-50"
      >
        <Card className="p-4 bg-background/95 backdrop-blur-sm border-primary/20 shadow-lg">
          <h3 className="font-bold text-lg mb-3">Would you do this again?</h3>
          <div className="flex gap-2">
            <Button
              onClick={() => {
                setWouldRepeat('yes');
                handleSubmit();
              }}
              className="flex-1 bg-gradient-ritual text-white"
            >
              Yes! 💕
            </Button>
            <Button
              onClick={() => {
                setWouldRepeat('maybe');
                handleSubmit();
              }}
              variant="outline"
              className="flex-1"
            >
              Maybe
            </Button>
            <Button
              onClick={() => {
                setWouldRepeat('no');
                handleSubmit();
              }}
              variant="outline"
              className="flex-1"
            >
              Nope
            </Button>
          </div>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.8, opacity: 0 }}
      className="fixed inset-x-0 bottom-20 px-4 z-50"
    >
      <Card className="p-4 bg-background/95 backdrop-blur-sm border-primary/20 shadow-lg">
        <div className="text-center">
          <Check className="w-12 h-12 mx-auto mb-2 text-green-600" />
          <p className="font-semibold">Thanks for sharing! 💕</p>
        </div>
      </Card>
    </motion.div>
  );
};
