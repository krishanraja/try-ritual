/**
 * EnhancedPostRitualCheckin Component
 * 
 * Post-ritual check-in flow with photo capture and partner notification.
 * Flow: complete → rating → repeat → notes → photo → done
 * 
 * @updated 2025-12-11 - Added working photo upload and partner notification
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Star, Sparkles, X, Check, RotateCcw, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { usePremium } from '@/hooks/usePremium';
import { PhotoCapture } from './PhotoCapture';

interface Props {
  coupleId: string;
  cycleId: string;
  userId: string;
  ritualTitle: string;
  ritualDescription?: string;
  agreedDate: string;
  onComplete: () => void;
  onDismiss: () => void;
}

type Step = 'complete' | 'rating' | 'repeat' | 'notes' | 'photo' | 'done';
type CompletionStatus = 'yes' | 'not_yet' | 'skipped';

export function EnhancedPostRitualCheckin({
  coupleId,
  cycleId,
  userId,
  ritualTitle,
  ritualDescription,
  agreedDate,
  onComplete,
  onDismiss,
}: Props) {
  const [step, setStep] = useState<Step>('complete');
  const [didComplete, setDidComplete] = useState<CompletionStatus | null>(null);
  const [rating, setRating] = useState<number | null>(null);
  const [wouldRepeat, setWouldRepeat] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [memoryId, setMemoryId] = useState<string | null>(null);
  const { isPremium, maxNotesLength } = usePremium();

  const handleCompletionChoice = (status: CompletionStatus) => {
    setDidComplete(status);
    if (status === 'skipped') {
      setStep('notes');
    } else if (status === 'not_yet') {
      onDismiss();
    } else {
      setStep('rating');
    }
  };

  const handleRating = (value: number) => {
    setRating(value);
    setStep('repeat');
  };

  const handleRepeat = (value: string) => {
    setWouldRepeat(value);
    setStep('notes');
  };

  const handleNotesSubmit = () => {
    // Go to photo step for completed rituals
    if (didComplete === 'yes') {
      setStep('photo');
    } else {
      setStep('done');
      submitFeedback();
    }
  };

  const handlePhotoComplete = (url: string) => {
    setPhotoUrl(url);
  };

  const handlePhotoSkip = () => {
    setStep('done');
    submitFeedback();
  };

  const handlePhotoSave = () => {
    setStep('done');
    submitFeedback();
  };

  const submitFeedback = async () => {
    setSubmitting(true);
    try {
      // Save to ritual_feedback
      await supabase.from('ritual_feedback').insert({
        couple_id: coupleId,
        weekly_cycle_id: cycleId,
        user_id: userId,
        did_complete: didComplete === 'yes',
        connection_rating: rating,
        would_repeat: wouldRepeat,
        notes: notes || null,
      });

      // If completed, save to memories (save all ratings for feedback)
      if (didComplete === 'yes' && rating) {
        // Check if this ritual is already in memories
        const { data: existingMemory } = await supabase
          .from('ritual_memories')
          .select('id, tradition_count')
          .eq('couple_id', coupleId)
          .eq('ritual_title', ritualTitle)
          .single();

        let savedMemoryId: string | null = null;

        if (existingMemory) {
          // Update existing memory
          const newCount = (existingMemory.tradition_count || 1) + 1;
          await supabase
            .from('ritual_memories')
            .update({ 
              rating,
              notes: notes || null,
              photo_url: photoUrl || undefined,
              tradition_count: newCount,
              is_tradition: newCount >= 3 && rating >= 4,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingMemory.id);
          savedMemoryId = existingMemory.id;
        } else {
          // Create new memory
          const { data: newMemory } = await supabase
            .from('ritual_memories')
            .insert({
              couple_id: coupleId,
              ritual_title: ritualTitle,
              ritual_description: ritualDescription,
              completion_date: agreedDate,
              rating,
              notes: notes || null,
              photo_url: photoUrl || null,
              tradition_count: 1,
            })
            .select('id')
            .single();
          savedMemoryId = newMemory?.id || null;
        }

        setMemoryId(savedMemoryId);

        // Notify partner
        try {
          await supabase.functions.invoke('notify-partner-completion', {
            body: {
              coupleId,
              ritualTitle,
              memoryId: savedMemoryId,
            },
          });
          console.log('[PostRitualCheckin] Partner notified');
        } catch (notifyError) {
          console.warn('[PostRitualCheckin] Partner notification failed:', notifyError);
          // Don't fail the whole flow if notification fails
        }
      }

      setTimeout(() => onComplete(), 2500);
    } catch (error) {
      console.error('[PostRitualCheckin] Error saving feedback:', error);
      onComplete();
    } finally {
      setSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 'complete':
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6 text-center"
          >
            <div className="space-y-2">
              <div className="w-16 h-16 mx-auto bg-gradient-ritual rounded-full flex items-center justify-center">
                <Calendar className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold">Ritual Check-in</h3>
              <p className="text-muted-foreground">
                Did you complete <span className="font-semibold text-foreground">"{ritualTitle}"</span>?
              </p>
            </div>

            <div className="space-y-3">
              <Button
                onClick={() => handleCompletionChoice('yes')}
                className="w-full h-14 text-lg bg-gradient-ritual hover:opacity-90"
              >
                <Check className="w-5 h-5 mr-2" />
                Yes, we did it!
              </Button>
              <Button
                variant="outline"
                onClick={() => handleCompletionChoice('not_yet')}
                className="w-full h-12"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Not yet, remind me later
              </Button>
              <button
                onClick={() => handleCompletionChoice('skipped')}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                We skipped it this week
              </button>
            </div>
          </motion.div>
        );

      case 'rating':
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6 text-center"
          >
            <div className="space-y-2">
              <h3 className="text-xl font-bold">How connected did you feel?</h3>
              <p className="text-muted-foreground text-sm">
                Rate your experience together
              </p>
            </div>

            <div className="flex justify-center gap-3">
              {[1, 2, 3, 4, 5].map((value) => (
                <motion.button
                  key={value}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleRating(value)}
                  className="group"
                >
                  <Heart
                    className={`w-12 h-12 transition-all ${
                      rating !== null && value <= rating
                        ? 'text-primary fill-primary'
                        : 'text-muted-foreground/30 group-hover:text-primary/50'
                    }`}
                  />
                </motion.button>
              ))}
            </div>

            <p className="text-xs text-muted-foreground">
              Tap a heart to rate
            </p>
          </motion.div>
        );

      case 'repeat':
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6 text-center"
          >
            <div className="space-y-2">
              <h3 className="text-xl font-bold">Would you do this again?</h3>
              <p className="text-muted-foreground text-sm">
                Your answer helps us suggest better rituals
              </p>
            </div>

            <div className="space-y-3">
              <Button
                onClick={() => handleRepeat('definitely')}
                variant="outline"
                className="w-full h-12 border-2 hover:border-primary hover:bg-primary/5"
              >
                <Sparkles className="w-4 h-4 mr-2 text-primary" />
                Definitely! Make it a tradition
              </Button>
              <Button
                onClick={() => handleRepeat('maybe')}
                variant="outline"
                className="w-full h-12"
              >
                Maybe sometime
              </Button>
              <Button
                onClick={() => handleRepeat('no')}
                variant="ghost"
                className="w-full h-12 text-muted-foreground"
              >
                Not really our thing
              </Button>
            </div>
          </motion.div>
        );

      case 'notes':
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="space-y-2 text-center">
              <h3 className="text-xl font-bold">
                {didComplete === 'skipped' ? 'What happened?' : 'Add a memory note'}
              </h3>
              <p className="text-muted-foreground text-sm">
                {didComplete === 'skipped' 
                  ? 'Help us understand so we can suggest better next time'
                  : 'Capture a thought or moment (optional)'
                }
              </p>
            </div>

            <div className="space-y-2">
              <Textarea
                placeholder={didComplete === 'skipped' 
                  ? "What got in the way?"
                  : "What made this special..."
                }
                value={notes}
                onChange={(e) => {
                  if (!isPremium && e.target.value.length > maxNotesLength) {
                    return;
                  }
                  setNotes(e.target.value);
                }}
                className="min-h-[100px]"
              />
              {!isPremium && (
                <div className="text-xs text-muted-foreground text-right">
                  {notes.length}/{maxNotesLength}
                </div>
              )}
            </div>

            <Button
              onClick={handleNotesSubmit}
              className="w-full bg-gradient-ritual"
            >
              {didComplete === 'yes' ? 'Continue' : (notes.trim() ? 'Submit Feedback' : 'Skip')}
            </Button>
          </motion.div>
        );

      case 'photo':
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="space-y-2 text-center">
              <h3 className="text-xl font-bold">Capture this memory</h3>
              <p className="text-muted-foreground text-sm">
                Add a photo to remember this moment
              </p>
            </div>

            <PhotoCapture
              coupleId={coupleId}
              onUploadComplete={handlePhotoComplete}
              onError={(error) => console.error('[PostRitualCheckin] Photo error:', error)}
            />

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handlePhotoSkip}
                className="flex-1"
              >
                Skip
              </Button>
              <Button
                onClick={handlePhotoSave}
                disabled={submitting}
                className="flex-1 bg-gradient-ritual"
              >
                {photoUrl ? 'Save Memory' : 'Continue'}
              </Button>
            </div>
          </motion.div>
        );

      case 'done':
        return (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-8 space-y-4"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
              className="w-20 h-20 mx-auto bg-gradient-ritual rounded-full flex items-center justify-center"
            >
              <Star className="w-10 h-10 text-white" fill="currentColor" />
            </motion.div>
            <h3 className="text-xl font-bold">Memory saved! 💕</h3>
            <p className="text-muted-foreground text-sm">
              {photoUrl 
                ? "Your photo has been added to your memories"
                : rating && rating >= 4 
                  ? "We'll remember this for future suggestions ✨"
                  : "Your feedback helps us improve"
              }
            </p>
            {wouldRepeat === 'definitely' && (
              <p className="text-xs text-primary">
                This might become a tradition! 
              </p>
            )}
          </motion.div>
        );
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="w-full max-w-md bg-card rounded-2xl p-6 shadow-xl border relative"
      >
        {step !== 'done' && (
          <button
            onClick={onDismiss}
            className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        <AnimatePresence mode="wait">
          {renderStep()}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
