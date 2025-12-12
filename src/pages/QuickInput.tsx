/**
 * QuickInput Page
 * 
 * Weekly ritual input flow using card-based mood selection.
 * Partners select mood cards, then add optional desire text.
 * 
 * @updated 2025-12-11 - Replaced radio questions with CardDrawInput
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCouple } from '@/contexts/CoupleContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Loader2, Sparkles } from 'lucide-react';
import { SynthesisAnimation } from '@/components/SynthesisAnimation';
import { CardDrawInput } from '@/components/CardDrawInput';
import { useSEO } from '@/hooks/useSEO';
import { NotificationContainer } from '@/components/InlineNotification';
import { MOOD_CARDS } from '@/data/moodCards';

type Step = 'cards' | 'desire';

export default function QuickInput() {
  const { user, couple, currentCycle, loading, refreshCycle } = useCouple();
  const navigate = useNavigate();
  const [weeklyCycleId, setWeeklyCycleId] = useState<string | null>(null);
  const [step, setStep] = useState<Step>('cards');
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [desire, setDesire] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  useSEO({
    title: 'Weekly Ritual Input',
    description: 'Share your preferences for this week\'s rituals. Your input will be combined with your partner\'s to create personalized experiences.',
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
      return;
    }

    if (!couple) {
      setNotification({ type: 'error', message: 'Please create or join a couple first' });
      setTimeout(() => navigate('/'), 2000);
      return;
    }

    const initializeCycle = async () => {
      const isPartnerOne = couple.partner_one === user?.id;

      if (currentCycle?.id) {
        const userSubmitted = isPartnerOne 
          ? currentCycle.partner_one_input 
          : currentCycle.partner_two_input;
        
        const partnerSubmitted = isPartnerOne
          ? currentCycle.partner_two_input
          : currentCycle.partner_one_input;

        if (userSubmitted) {
          if (partnerSubmitted && currentCycle.synthesized_output) {
            navigate('/picker');
          } else {
            navigate('/');
          }
          return;
        }

        setWeeklyCycleId(currentCycle.id);
        return;
      }

      const today = new Date();
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay());
      const weekStartStr = weekStart.toISOString().split('T')[0];

      const { data: existingCycle } = await supabase
        .from('weekly_cycles')
        .select('*')
        .eq('couple_id', couple.id)
        .eq('week_start_date', weekStartStr)
        .maybeSingle();

      if (existingCycle) {
        const userSubmitted = isPartnerOne 
          ? existingCycle.partner_one_input 
          : existingCycle.partner_two_input;
        
        const partnerSubmitted = isPartnerOne
          ? existingCycle.partner_two_input
          : existingCycle.partner_one_input;

        if (userSubmitted) {
          if (partnerSubmitted && existingCycle.synthesized_output) {
            navigate('/picker');
          } else {
            navigate('/');
          }
          return;
        }

        setWeeklyCycleId(existingCycle.id);
      } else {
        const { data: newCycle, error } = await supabase
          .from('weekly_cycles')
          .insert({
            couple_id: couple.id,
            week_start_date: weekStartStr
          })
          .select()
          .single();

        if (error) {
          if (error.code === '23505') {
            const { data: retryCycle } = await supabase
              .from('weekly_cycles')
              .select('*')
              .eq('couple_id', couple.id)
              .eq('week_start_date', weekStartStr)
              .maybeSingle();
            
            if (retryCycle) {
              setWeeklyCycleId(retryCycle.id);
              return;
            }
          }
          setNotification({ type: 'error', message: 'Failed to create weekly cycle' });
          setTimeout(() => navigate('/'), 2000);
          return;
        }

        setWeeklyCycleId(newCycle.id);
      }
    };

    initializeCycle();
  }, [user, couple, currentCycle, loading, navigate]);

  const handleCardsComplete = (cards: string[]) => {
    setSelectedCards(cards);
    setStep('desire');
  };

  const handleBack = () => {
    setStep('cards');
  };

  const handleSubmit = async () => {
    if (!weeklyCycleId || !couple) return;

    setIsSubmitting(true);
    console.log('[SYNTHESIS] Starting submission flow...');

    try {
      const isPartnerOne = couple.partner_one === user?.id;
      const updateField = isPartnerOne ? 'partner_one_input' : 'partner_two_input';
      const submittedField = isPartnerOne ? 'partner_one_submitted_at' : 'partner_two_submitted_at';

      const inputData = {
        cards: selectedCards,
        desire: desire.trim() || null,
        inputType: 'cards',
      };

      console.log('[SYNTHESIS] Saving input for', isPartnerOne ? 'partner_one' : 'partner_two');

      const { error: saveError } = await supabase
        .from('weekly_cycles')
        .update({
          [updateField]: inputData,
          [submittedField]: new Date().toISOString()
        })
        .eq('id', weeklyCycleId);

      if (saveError) throw saveError;

      // Check if both partners completed
      const { data: cycle } = await supabase
        .from('weekly_cycles')
        .select('partner_one_input, partner_two_input')
        .eq('id', weeklyCycleId)
        .single();

      const partnerInput = isPartnerOne ? cycle?.partner_two_input : cycle?.partner_one_input;

      if (partnerInput) {
        // Both completed - trigger synthesis
        console.log('[SYNTHESIS] Both partners submitted, calling synthesize-rituals...');
        setIsSynthesizing(true);

        const { data, error } = await supabase.functions.invoke('synthesize-rituals', {
          body: {
            partnerOneInput: isPartnerOne ? inputData : partnerInput,
            partnerTwoInput: isPartnerOne ? partnerInput : inputData,
            coupleId: couple.id,
            userCity: couple.preferred_city || 'New York'
          }
        });

        console.log('[SYNTHESIS] Edge function response:', { data, error });

        if (error) throw error;
        if (!data?.rituals || !Array.isArray(data.rituals) || data.rituals.length === 0) {
          throw new Error('Synthesis returned no rituals');
        }

        console.log('[SYNTHESIS] Got', data.rituals.length, 'rituals, saving to DB...');

        const { error: updateError } = await supabase
          .from('weekly_cycles')
          .update({
            synthesized_output: { rituals: data.rituals },
            generated_at: new Date().toISOString(),
            sync_completed_at: new Date().toISOString()
          })
          .eq('id', weeklyCycleId);

        if (updateError) throw updateError;

        // CRITICAL: Verify the save worked
        const { data: verifyData } = await supabase
          .from('weekly_cycles')
          .select('synthesized_output')
          .eq('id', weeklyCycleId)
          .single();

        console.log('[SYNTHESIS] Verification:', verifyData?.synthesized_output ? 'SAVED' : 'FAILED');

        if (!verifyData?.synthesized_output) {
          throw new Error('Failed to save synthesized rituals to database');
        }

        await refreshCycle();
        navigate('/picker');
      } else {
        setNotification({ type: 'success', message: 'All set! We\'ll notify you when your partner is ready' });
        await refreshCycle();
        setTimeout(() => navigate('/'), 2000);
      }
    } catch (error) {
      console.error('[SYNTHESIS] Error:', error);
      setNotification({ type: 'error', message: error instanceof Error ? error.message : 'Failed to save. Please try again.' });
      setIsSubmitting(false);
      setIsSynthesizing(false);
    }
  };

  if (loading || !weeklyCycleId) {
    return (
      <div className="h-full bg-gradient-warm flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Setting up...</p>
      </div>
    );
  }

  if (isSynthesizing) {
    return <SynthesisAnimation />;
  }

  return (
    <div className="h-full bg-gradient-warm flex flex-col">
      {/* Progress Bar */}
      <div className="flex-none px-4 pt-4 pb-2">
        <div className="flex gap-1">
          <div className={`h-1 flex-1 rounded-full transition-all ${step === 'cards' || step === 'desire' ? 'bg-primary' : 'bg-primary/20'}`} />
          <div className={`h-1 flex-1 rounded-full transition-all ${step === 'desire' ? 'bg-primary' : 'bg-primary/20'}`} />
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Step {step === 'cards' ? '1' : '2'} of 2
        </p>
      </div>

      {/* Notification */}
      {notification && (
        <div className="flex-none px-4 pt-2">
          <NotificationContainer
            notification={notification}
            onDismiss={() => setNotification(null)}
          />
        </div>
      )}

      {/* Content */}
      <div className="flex-1 px-4 py-4 overflow-y-auto min-h-0">
        <AnimatePresence mode="wait">
          {step === 'cards' ? (
            <motion.div
              key="cards"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <CardDrawInput
                onComplete={handleCardsComplete}
                cycleId={weeklyCycleId}
              />
            </motion.div>
          ) : (
            <motion.div
              key="desire"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold">One more thing...</h2>
                <p className="text-muted-foreground">
                  What are you hoping for this week? (Optional)
                </p>
              </div>

              {/* Selected cards summary */}
              <div className="flex flex-wrap justify-center gap-2">
                {selectedCards.map((cardId) => {
                  const card = MOOD_CARDS.find((c) => c.id === cardId);
                  if (!card) return null;
                  return (
                    <span
                      key={cardId}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm"
                    >
                      <span>{card.emoji}</span>
                      <span>{card.label}</span>
                    </span>
                  );
                })}
              </div>

              <Textarea
                value={desire}
                onChange={(e) => setDesire(e.target.value)}
                placeholder="e.g., I'd love to try something new this weekend..."
                className="min-h-[120px] max-h-[160px] bg-white/80 border-2 resize-none"
                rows={4}
              />

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={handleBack}
                  className="flex-1"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="flex-1 bg-gradient-ritual"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Complete
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
