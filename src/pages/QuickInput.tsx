/**
 * QuickInput Page
 * 
 * Weekly ritual input flow using card-based mood selection.
 * Partners select mood cards, then add optional desire text.
 * 
 * CRITICAL FIX (2025-12-15):
 * - Decoupled submission from synthesis to prevent infinite loading
 * - Uses idempotent trigger-synthesis endpoint
 * - Always redirects after saving input (never blocks on synthesis)
 * - Synthesis runs in background, user sees status on dashboard
 * 
 * @updated 2025-12-15 - Fixed two-partner flow reliability
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCouple } from '@/contexts/CoupleContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Loader2, Sparkles, AlertCircle, RefreshCw } from 'lucide-react';
import { CardDrawInput } from '@/components/CardDrawInput';
import { useSEO } from '@/hooks/useSEO';
import { NotificationContainer } from '@/components/InlineNotification';
import { MOOD_CARDS } from '@/data/moodCards';
import { logger } from '@/utils/logger';

type Step = 'cards' | 'desire' | 'submitting';

// Local storage key for draft persistence
const getDraftKey = (userId: string, cycleId: string) => `ritual-input-draft-${userId}-${cycleId}`;

interface DraftData {
  selectedCards: string[];
  desire: string;
  step: Step;
  timestamp: number;
}

/**
 * Save draft to localStorage
 */
function saveDraft(userId: string, cycleId: string, data: Omit<DraftData, 'timestamp'>): void {
  try {
    const draft: DraftData = { ...data, timestamp: Date.now() };
    localStorage.setItem(getDraftKey(userId, cycleId), JSON.stringify(draft));
    logger.debug('[INPUT] Draft saved');
  } catch (e) {
    logger.warn('[INPUT] Failed to save draft:', e);
  }
}

/**
 * Load draft from localStorage
 * Returns null if no valid draft exists or if it's older than 24 hours
 */
function loadDraft(userId: string, cycleId: string): DraftData | null {
  try {
    const stored = localStorage.getItem(getDraftKey(userId, cycleId));
    if (!stored) return null;
    
    const draft: DraftData = JSON.parse(stored);
    
    // Discard drafts older than 24 hours
    const maxAge = 24 * 60 * 60 * 1000;
    if (Date.now() - draft.timestamp > maxAge) {
      localStorage.removeItem(getDraftKey(userId, cycleId));
      return null;
    }
    
    // Validate draft has required fields
    if (!Array.isArray(draft.selectedCards)) {
      return null;
    }
    
    return draft;
  } catch (e) {
    logger.warn('[INPUT] Failed to load draft:', e);
    return null;
  }
}

/**
 * Clear draft from localStorage
 */
function clearDraft(userId: string, cycleId: string): void {
  try {
    localStorage.removeItem(getDraftKey(userId, cycleId));
    logger.debug('[INPUT] Draft cleared');
  } catch (e) {
    // Ignore
  }
}

export default function QuickInput() {
  const { user, couple, currentCycle, loading, refreshCycle } = useCouple();
  const navigate = useNavigate();
  const [weeklyCycleId, setWeeklyCycleId] = useState<string | null>(null);
  const [step, setStep] = useState<Step>('cards');
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [desire, setDesire] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [hasDraft, setHasDraft] = useState(false);
  const [draftLoaded, setDraftLoaded] = useState(false);

  // Check for and restore draft when cycle ID is set
  useEffect(() => {
    if (weeklyCycleId && user?.id && !draftLoaded) {
      const draft = loadDraft(user.id, weeklyCycleId);
      if (draft && draft.selectedCards.length > 0) {
        setHasDraft(true);
        // Auto-restore if user had made significant progress
        if (draft.step === 'desire') {
          setSelectedCards(draft.selectedCards);
          setDesire(draft.desire || '');
          setStep(draft.step);
          setNotification({ type: 'info', message: 'Restored your previous progress' });
        } else if (draft.selectedCards.length >= 2) {
          // Show restore prompt for partial progress
          setNotification({ 
            type: 'info', 
            message: `You had ${draft.selectedCards.length} cards selected. Tap to restore.` 
          });
        }
      }
      setDraftLoaded(true);
    }
  }, [weeklyCycleId, user?.id, draftLoaded]);

  // Debounced draft save on changes (inline to avoid callback instability)
  useEffect(() => {
    if (!draftLoaded) return;
    if (!user?.id || !weeklyCycleId) return;
    if (selectedCards.length === 0 && !desire.trim()) return;
    
    const timer = setTimeout(() => {
      saveDraft(user.id, weeklyCycleId, {
        selectedCards,
        desire,
        step,
      });
    }, 500);
    return () => clearTimeout(timer);
  }, [selectedCards, desire, step, draftLoaded, user?.id, weeklyCycleId]);

  // Restore draft handler
  const handleRestoreDraft = () => {
    if (user?.id && weeklyCycleId) {
      const draft = loadDraft(user.id, weeklyCycleId);
      if (draft) {
        setSelectedCards(draft.selectedCards);
        setDesire(draft.desire || '');
        if (draft.step === 'desire') {
          setStep(draft.step);
        }
        setNotification({ type: 'success', message: 'Progress restored!' });
        setHasDraft(false);
      }
    }
  };

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

    // Ensure partner has joined
    if (!couple.partner_two) {
      setNotification({ type: 'info', message: 'Waiting for your partner to join first' });
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

        // If user already submitted, redirect appropriately
        if (userSubmitted) {
          if (partnerSubmitted && currentCycle.synthesized_output) {
            navigate('/picker');
          } else if (partnerSubmitted) {
            // Both submitted but no output yet - go to synthesis status page
            navigate('/');
          } else {
            // Waiting for partner
            navigate('/');
          }
          return;
        }

        setWeeklyCycleId(currentCycle.id);
        return;
      }

      // FIX #3: Use couple's preferred_city for timezone-aware week calculation
      const { data: coupleData } = await supabase
        .from('couples')
        .select('preferred_city')
        .eq('id', couple.id)
        .single();
      
      const preferredCity = (coupleData?.preferred_city || 'New York') as 'London' | 'Sydney' | 'Melbourne' | 'New York';
      const { getWeekStartDate } = await import('@/utils/timezoneUtils');
      const weekStartStr = getWeekStartDate(preferredCity);

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
    if (step === 'desire') {
      setStep('cards');
    }
  };

  /**
   * Submit handler - CRITICAL FIX
   * 
   * This function:
   * 1. Saves the user's input (never blocks)
   * 2. If partner has also submitted, triggers synthesis in background
   * 3. ALWAYS redirects to dashboard - synthesis status is shown there
   * 
   * This prevents users from getting stuck on infinite loading screens.
   */
  const handleSubmit = async () => {
    if (!weeklyCycleId || !couple || !user) return;

    setIsSubmitting(true);
    setSubmitError(null);
    setStep('submitting');
    logger.log('[INPUT] Starting submission flow...');

    try {
      const isPartnerOne = couple.partner_one === user.id;
      const updateField = isPartnerOne ? 'partner_one_input' : 'partner_two_input';
      const submittedField = isPartnerOne ? 'partner_one_submitted_at' : 'partner_two_submitted_at';

      const inputData = {
        cards: selectedCards,
        desire: desire.trim() || null,
        inputType: 'cards',
      };

      logger.log('[INPUT] Saving input for', isPartnerOne ? 'partner_one' : 'partner_two');

      // Step 1: Save the user's input (this must succeed)
      const { error: saveError } = await supabase
        .from('weekly_cycles')
        .update({
          [updateField]: inputData,
          [submittedField]: new Date().toISOString()
        })
        .eq('id', weeklyCycleId);

      if (saveError) {
        throw new Error(`Failed to save your input: ${saveError.message}`);
      }

      // FIX #8: Session Recovery - Save critical state to localStorage
      if (user?.id) {
        try {
          const stateToSave = {
            cycleId: weeklyCycleId,
            submittedAt: new Date().toISOString(),
            timestamp: Date.now(),
          };
          localStorage.setItem(`ritual-state-${user.id}`, JSON.stringify(stateToSave));
        } catch (e) {
          logger.warn('[INPUT] Failed to save state to localStorage:', e);
        }
      }

      logger.log('[INPUT] Input saved successfully');

      // Step 2: Check if partner has also submitted
      const { data: cycle, error: fetchError } = await supabase
        .from('weekly_cycles')
        .select('partner_one_input, partner_two_input, synthesized_output')
        .eq('id', weeklyCycleId)
        .single();

      if (fetchError) {
        logger.warn('[INPUT] Could not check partner status:', fetchError);
        // Still redirect - input was saved
      }

      const partnerInput = isPartnerOne ? cycle?.partner_two_input : cycle?.partner_one_input;
      const alreadyHasOutput = !!cycle?.synthesized_output;

      // Step 3: If both partners have submitted and no output yet, trigger synthesis
      // NOTE: A database trigger (auto_trigger_synthesis_on_both_complete) is the PRIMARY method
      // for triggering synthesis automatically when both partners submit. This client-side call
      // serves as a FALLBACK in case the database trigger fails or isn't configured.
      if (partnerInput && !alreadyHasOutput) {
        logger.log('[INPUT] Both partners submitted, triggering synthesis in background...');
        
        // Trigger synthesis but DON'T wait for it - let it run in background
        // Use the idempotent trigger-synthesis endpoint
        // FALLBACK: Database trigger should handle this automatically
        supabase.functions.invoke('trigger-synthesis', {
          body: { cycleId: weeklyCycleId }
        }).then(result => {
          logger.log('[INPUT] Background synthesis triggered:', result.data?.status);
        }).catch(err => {
          logger.error('[INPUT] Background synthesis trigger failed:', err);
          // This is fine - it will be retried when user views dashboard
        });
      }

      // Step 4: Clear draft and redirect to dashboard
      // The dashboard will show appropriate status based on cycle state
      if (user?.id && weeklyCycleId) {
        clearDraft(user.id, weeklyCycleId);
      }
      await refreshCycle();
      
      logger.log('[INPUT] Redirecting to dashboard');
      navigate('/');

    } catch (error) {
      logger.error('[INPUT] Error:', error);
      setSubmitError(error instanceof Error ? error.message : 'Failed to save. Please try again.');
      setStep('desire'); // Go back to allow retry
      setIsSubmitting(false);
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

  // Submitting state - show simple feedback
  if (step === 'submitting') {
    return (
      <div className="h-full bg-gradient-warm flex flex-col items-center justify-center gap-4 px-6">
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="w-20 h-20 rounded-full bg-gradient-ritual flex items-center justify-center"
        >
          <Sparkles className="w-10 h-10 text-white" />
        </motion.div>
        <div className="text-center space-y-2">
          <h2 className="text-xl font-bold">Saving your vibes...</h2>
          <p className="text-sm text-muted-foreground">Just a moment</p>
        </div>
      </div>
    );
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
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <NotificationContainer
                notification={notification}
                onDismiss={() => setNotification(null)}
              />
            </div>
            {hasDraft && step === 'cards' && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleRestoreDraft}
                className="flex-shrink-0"
              >
                <RefreshCw className="w-4 h-4 mr-1" />
                Restore
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Error notification */}
      {submitError && (
        <div className="flex-none px-4 pt-2">
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-destructive font-medium">Failed to save</p>
              <p className="text-xs text-destructive/80">{submitError}</p>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSubmitError(null)}
              className="text-xs h-auto py-1 px-2"
            >
              Dismiss
            </Button>
          </div>
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
          ) : step === 'desire' ? (
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
                  disabled={isSubmitting}
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
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}
