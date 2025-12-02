import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { motion } from 'framer-motion';
import { Clock, Heart, Sparkles, RotateCcw, Lightbulb } from 'lucide-react';
import { RitualCarousel } from './RitualCarousel';
import { useSampleRituals } from '@/hooks/useSampleRituals';
import { supabase } from '@/integrations/supabase/client';
import { useCouple } from '@/contexts/CoupleContext';
import { CelebrationScreen } from './CelebrationScreen';
import { NotificationContainer } from './InlineNotification';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';

interface WaitingForPartnerProps {
  partnerName: string;
  weeklyTheme?: string;
  currentCycleId: string;
  lastNudgedAt?: string | null;
}

export const WaitingForPartner = ({ 
  partnerName, 
  weeklyTheme,
  currentCycleId,
  lastNudgedAt 
}: WaitingForPartnerProps) => {
  const navigate = useNavigate();
  const { user, couple, refreshCycle } = useCouple();
  const [showSamples, setShowSamples] = useState(false);
  const [isNudging, setIsNudging] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const { rituals } = useSampleRituals();

  // Listen for partner completion in realtime
  useEffect(() => {
    const channel = supabase
      .channel(`cycle-updates-${currentCycleId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'weekly_cycles',
        filter: `id=eq.${currentCycleId}`
      }, async (payload: any) => {
        const isPartnerOne = couple?.partner_one === user?.id;
        const partnerSubmitted = isPartnerOne
          ? payload.new.partner_two_input
          : payload.new.partner_one_input;

        if (partnerSubmitted) {
          // Partner just completed! Show celebration
          setShowCelebration(true);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentCycleId, couple, user]);

  const handleNudge = async () => {
    setIsNudging(true);
    try {
      const { error } = await supabase.functions.invoke('nudge-partner', {
        body: { cycleId: currentCycleId }
      });

      if (error) throw error;

      setNotification({ type: 'success', message: `Nudge sent! ${partnerName} will see a reminder when they open the app` });
    } catch (error) {
      console.error('Error sending nudge:', error);
      setNotification({ type: 'error', message: 'Failed to send reminder' });
    } finally {
      setIsNudging(false);
    }
  };

  const canNudge = () => {
    if (!lastNudgedAt) return true;
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    return new Date(lastNudgedAt) < oneHourAgo;
  };

  const handleClearAnswers = async () => {
    if (!user || !couple) return;
    
    setIsClearing(true);
    try {
      const isPartnerOne = couple.partner_one === user.id;
      const updateField = isPartnerOne ? 'partner_one_input' : 'partner_two_input';
      const submittedField = isPartnerOne ? 'partner_one_submitted_at' : 'partner_two_submitted_at';

      const { error } = await supabase
        .from('weekly_cycles')
        .update({
          [updateField]: null,
          [submittedField]: null
        })
        .eq('id', currentCycleId);

      if (error) throw error;

      setNotification({ type: 'success', message: 'Your answers have been cleared. Ready to start fresh!' });
      await refreshCycle();
      setTimeout(() => navigate('/input'), 1500);
    } catch (error) {
      console.error('Error clearing answers:', error);
      setNotification({ type: 'error', message: 'Failed to clear answers. Please try again.' });
    } finally {
      setIsClearing(false);
      setShowClearDialog(false);
    }
  };

  if (showCelebration) {
    return (
      <CelebrationScreen
        message="Both vibes are in! ✨"
        onComplete={async () => {
          await refreshCycle();
          navigate('/picker');
        }}
      />
    );
  }

  if (showSamples) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex-none px-4 py-3 border-b border-border/50">
          <div className="text-center">
            <h2 className="text-lg font-bold">Sample Rituals</h2>
            <p className="text-xs text-muted-foreground">Preview while you wait</p>
          </div>
        </div>
        <div className="flex-1 overflow-hidden">
          <RitualCarousel
            rituals={rituals}
            completions={new Set()}
            onComplete={() => {}}
            variant="compact"
            isShowingSamples={true}
          />
        </div>
        <div className="flex-none px-4 pb-4 pt-2">
          <Button 
            onClick={() => setShowSamples(false)} 
            variant="outline" 
            className="w-full h-10 rounded-xl"
          >
            Back to Waiting
          </Button>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="h-full flex flex-col items-center justify-center px-6 py-8 gap-6"
    >
      {/* Notification */}
      {notification && (
        <div className="w-full max-w-sm">
          <NotificationContainer
            notification={notification}
            onDismiss={() => setNotification(null)}
          />
        </div>
      )}

      {/* Animated Icon */}
      <motion.div
        animate={{ 
          scale: [1, 1.1, 1],
          rotate: [0, 5, -5, 0]
        }}
        transition={{ 
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="relative"
      >
        <div className="w-24 h-24 rounded-full bg-gradient-ritual flex items-center justify-center">
          <Clock className="w-12 h-12 text-white" />
        </div>
        <motion.div
          animate={{ 
            scale: [1, 1.5, 1],
            opacity: [0.5, 0, 0.5]
          }}
          transition={{ 
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute inset-0 rounded-full bg-primary/30"
        />
      </motion.div>

      {/* Message */}
      <div className="text-center space-y-3">
        <h2 className="text-2xl font-bold">You're All Set! ✨</h2>
        <p className="text-muted-foreground">
          Waiting for <span className="font-semibold text-foreground">{partnerName}</span> to share their vibe
        </p>
        {weeklyTheme && (
          <p className="text-sm text-muted-foreground italic">
            "{weeklyTheme}"
          </p>
        )}
        
        {/* Inspiration tip */}
        <Card className="p-3 bg-primary/5 border-primary/20 max-w-sm mx-auto">
          <div className="flex items-start gap-2">
            <Lightbulb className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <div className="text-left">
              <p className="text-xs font-semibold text-primary mb-1">Did you know?</p>
              <p className="text-xs text-muted-foreground">
                Couples who share 2-3 rituals per week report 40% higher relationship satisfaction
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Actions */}
      <div className="w-full max-w-sm space-y-3">
        <Button
          onClick={handleNudge}
          disabled={!canNudge() || isNudging}
          className="w-full h-12 rounded-xl bg-gradient-ritual text-white hover:opacity-90 transition-opacity flex items-center gap-2"
        >
          <Heart className="w-4 h-4" />
          {isNudging ? 'Sending...' : `Give ${partnerName} a cheeky nudge 💕`}
        </Button>
        
        {!canNudge() && (
          <p className="text-xs text-center text-muted-foreground">
            You can send another reminder in an hour
          </p>
        )}

        <Button
          onClick={() => setShowSamples(true)}
          variant="outline"
          className="w-full h-12 rounded-xl flex items-center gap-2"
        >
          <Sparkles className="w-4 h-4" />
          Browse Sample Rituals
        </Button>

        <Button
          onClick={() => setShowClearDialog(true)}
          variant="ghost"
          className="w-full h-10 rounded-xl flex items-center gap-2 text-muted-foreground hover:text-foreground"
        >
          <RotateCcw className="w-4 h-4" />
          Clear & Redo My Answers
        </Button>
      </div>

      {/* Encouraging Message */}
      <Card className="p-4 bg-primary/5 border-primary/20 max-w-sm">
        <p className="text-sm text-center text-muted-foreground">
          Once {partnerName} completes their input, we'll synthesize your perfect rituals for the week 💫
        </p>
      </Card>

      {/* Clear Answers Confirmation Dialog */}
      <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear Your Answers?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove your submitted answers for this week. You'll be able to start fresh and resubmit. {partnerName} will still see that you haven't completed your input yet.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isClearing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearAnswers}
              disabled={isClearing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isClearing ? 'Clearing...' : 'Clear & Redo'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
};