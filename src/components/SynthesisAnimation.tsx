/**
 * SynthesisAnimation Component
 * 
 * Shows a loading animation while rituals are being generated.
 * 
 * CRITICAL FIX (2025-12-15):
 * - Uses idempotent trigger-synthesis endpoint
 * - Has proper timeout and retry handling
 * - Never leaves users stuck indefinitely
 * - Can be safely retried multiple times
 * 
 * @updated 2025-12-15 - Fixed reliability issues
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Clock, AlertCircle, RefreshCw, Home } from 'lucide-react';
import ritualIcon from '@/assets/ritual-icon.png';
import confetti from 'canvas-confetti';
import { useCouple } from '@/contexts/CoupleContext';
import { supabase } from '@/integrations/supabase/client';
import { SAMPLE_RITUALS } from '@/data/sampleRituals';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { deriveCycleState } from '@/types/database';

const PHASES = [
  { message: "Reading your vibes...", duration: 4000 },
  { message: "Matching your energy...", duration: 5000 },
  { message: "Crafting perfect rituals...", duration: 6000 },
  { message: "Almost there! ✨", duration: 15000 },
];

const MAX_WAIT_TIME = 45000; // 45 seconds max before showing error
const SHOW_REFRESH_AFTER = 15000; // Show refresh button after 15s
const POLL_INTERVAL = 3000; // Poll every 3 seconds

export const SynthesisAnimation = () => {
  const navigate = useNavigate();
  const { currentCycle, refreshCycle, couple, user } = useCouple();
  const [phase, setPhase] = useState(0);
  const [currentRitualIndex, setCurrentRitualIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showRefreshButton, setShowRefreshButton] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [cycleId, setCycleId] = useState<string | null>(null);
  const hasNavigatedRef = useRef(false);
  const isCompleteRef = useRef(false);
  const hasErrorRef = useRef(false);
  const synthesisTriggerRef = useRef(false);

  // Get city-relevant rituals or mix
  const city = couple?.preferred_city || 'New York';
  const relevantRituals = SAMPLE_RITUALS.filter(r => r.city === city);
  const displayRituals = relevantRituals.length >= 4 ? relevantRituals : SAMPLE_RITUALS;

  const isPartnerOne = couple?.partner_one === user?.id;

  // Determine the cycle ID and trigger synthesis if needed
  useEffect(() => {
    const initializeSynthesis = async () => {
      // If we have it from context, use it
      if (currentCycle?.id) {
        console.log('[SYNTHESIS] Using cycle ID from context:', currentCycle.id);
        setCycleId(currentCycle.id);
        
        // Check if it already has synthesized output
        if (currentCycle.synthesized_output && !isCompleteRef.current) {
          console.log('[SYNTHESIS] Context cycle already has output, completing immediately');
          handleComplete();
          return;
        }

        // Trigger synthesis via idempotent endpoint (only once)
        if (!synthesisTriggerRef.current) {
          synthesisTriggerRef.current = true;
          triggerSynthesis(currentCycle.id);
        }
        return;
      }

      // Otherwise, try to fetch it directly
      if (!couple?.id) {
        console.log('[SYNTHESIS] No couple ID, cannot fetch cycle');
        setHasError(true);
        setErrorMessage('No couple found. Please go back and try again.');
        return;
      }

      console.log('[SYNTHESIS] Fetching cycle ID for couple:', couple.id);
      
      // Find the most recent incomplete cycle
      const { data, error } = await supabase
        .from('weekly_cycles')
        .select('id, synthesized_output, partner_one_input, partner_two_input')
        .eq('couple_id', couple.id)
        .or('synthesized_output.is.null,agreement_reached.eq.false')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !data) {
        console.error('[SYNTHESIS] Error fetching cycle:', error);
        setHasError(true);
        setErrorMessage('Could not find your ritual cycle. Please go back and try again.');
        return;
      }

      console.log('[SYNTHESIS] Found cycle:', data.id, 'has output:', !!data.synthesized_output);
      setCycleId(data.id);
      
      // If it already has synthesized output, complete immediately
      if (data.synthesized_output && !isCompleteRef.current) {
        console.log('[SYNTHESIS] Already has output, completing immediately');
        handleComplete();
        return;
      }

      // Check if both partners have submitted
      if (!data.partner_one_input || !data.partner_two_input) {
        console.log('[SYNTHESIS] Not both partners ready, redirecting');
        setHasError(true);
        setErrorMessage('Waiting for both partners to submit their inputs.');
        return;
      }

      // Trigger synthesis via idempotent endpoint (only once)
      if (!synthesisTriggerRef.current) {
        synthesisTriggerRef.current = true;
        triggerSynthesis(data.id);
      }
    };

    initializeSynthesis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentCycle?.id, currentCycle?.synthesized_output, couple?.id]);

  // Function to trigger synthesis via the idempotent endpoint
  const triggerSynthesis = async (targetCycleId: string) => {
    console.log('[SYNTHESIS] Triggering synthesis for cycle:', targetCycleId);
    
    try {
      const { data, error } = await supabase.functions.invoke('trigger-synthesis', {
        body: { cycleId: targetCycleId }
      });

      console.log('[SYNTHESIS] Trigger response:', data);

      if (error) {
        console.error('[SYNTHESIS] Trigger error:', error);
        // Don't fail immediately - polling will pick up the result
        return;
      }

      if (data?.status === 'ready') {
        // Synthesis complete!
        console.log('[SYNTHESIS] Synthesis completed via trigger');
        handleComplete();
      } else if (data?.status === 'generating') {
        // Already in progress - polling will pick it up
        console.log('[SYNTHESIS] Synthesis already in progress');
      } else if (data?.status === 'failed') {
        // Failed - but don't show error yet, polling might still work
        console.warn('[SYNTHESIS] Trigger reported failure:', data.error);
      }
    } catch (err) {
      console.error('[SYNTHESIS] Trigger exception:', err);
      // Don't fail - polling is the backup
    }
  };

  // Phase progression
  useEffect(() => {
    let totalTime = 0;
    const timers: NodeJS.Timeout[] = [];
    
    PHASES.forEach((p, idx) => {
      totalTime += p.duration;
      const timer = setTimeout(() => {
        setPhase(idx);
      }, totalTime - p.duration);
      timers.push(timer);
    });

    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  // Show refresh button after timeout (runs once on mount)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isCompleteRef.current && !hasErrorRef.current) {
        setShowRefreshButton(true);
      }
    }, SHOW_REFRESH_AFTER);

    return () => clearTimeout(timer);
  }, []);

  // Timeout after max wait time (runs once on mount)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isCompleteRef.current && !hasErrorRef.current) {
        console.log('[SYNTHESIS] Max wait time exceeded');
        hasErrorRef.current = true;
        setHasError(true);
        setErrorMessage('Taking longer than expected. Your rituals may still be generating in the background.');
      }
    }, MAX_WAIT_TIME);

    return () => clearTimeout(timer);
  }, []);

  // Rotate through sample rituals
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentRitualIndex(prev => (prev + 1) % displayRituals.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [displayRituals.length]);

  const handleComplete = useCallback(async () => {
    // Use refs for immediate check to prevent race conditions
    if (isCompleteRef.current || hasNavigatedRef.current) {
      console.log('[SYNTHESIS] Already completing/navigated, skipping');
      return;
    }
    
    isCompleteRef.current = true;
    hasNavigatedRef.current = true;
    
    console.log('[SYNTHESIS] Rituals detected, completing...');
    setIsComplete(true);
    
    try {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch (e) {
      console.warn('[SYNTHESIS] Confetti failed:', e);
    }
    
    // Refresh cycle but don't block navigation on it
    refreshCycle().catch(e => {
      console.warn('[SYNTHESIS] Refresh cycle failed:', e);
    });
    
    // Navigate with a short delay for visual feedback
    setTimeout(() => {
      console.log('[SYNTHESIS] Navigating to /picker');
      navigate('/picker');
    }, 800);
  }, [navigate, refreshCycle]);

  /**
   * Manual refresh handler with retry support
   * Uses the idempotent trigger-synthesis endpoint to safely retry
   */
  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    setHasError(false);
    setRetryCount(prev => prev + 1);
    console.log('[SYNTHESIS] Manual refresh triggered, attempt:', retryCount + 1);
    
    try {
      // Try to get cycle ID if we don't have it
      let targetCycleId = cycleId;
      
      if (!targetCycleId && couple?.id) {
        const { data: cycleData } = await supabase
          .from('weekly_cycles')
          .select('id, synthesized_output, partner_one_input, partner_two_input')
          .eq('couple_id', couple.id)
          .or('synthesized_output.is.null,agreement_reached.eq.false')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (cycleData) {
          targetCycleId = cycleData.id;
          setCycleId(cycleData.id);
          
          if (cycleData.synthesized_output) {
            console.log('[SYNTHESIS] Found output during refresh');
            await handleComplete();
            return;
          }

          // Check if both partners have submitted
          if (!cycleData.partner_one_input || !cycleData.partner_two_input) {
            setErrorMessage('Waiting for both partners to submit their preferences.');
            setHasError(true);
            return;
          }
        }
      }
      
      if (!targetCycleId) {
        setErrorMessage('Could not find your ritual cycle. Please go back and try again.');
        setHasError(true);
        return;
      }

      // First check if output already exists
      const { data: checkData } = await supabase
        .from('weekly_cycles')
        .select('synthesized_output')
        .eq('id', targetCycleId)
        .single();

      if (checkData?.synthesized_output) {
        console.log('[SYNTHESIS] Output already exists');
        await handleComplete();
        return;
      }

      // Use the idempotent trigger endpoint to retry synthesis
      const { data, error } = await supabase.functions.invoke('trigger-synthesis', {
        body: { 
          cycleId: targetCycleId,
          forceRetry: retryCount > 1 // Force retry if we've tried before
        }
      });

      console.log('[SYNTHESIS] Retry trigger response:', data);

      if (error) {
        console.error('[SYNTHESIS] Retry trigger error:', error);
        setErrorMessage('Failed to generate rituals. Please try again.');
        setHasError(true);
        return;
      }

      if (data?.status === 'ready') {
        console.log('[SYNTHESIS] Synthesis completed on retry');
        await handleComplete();
      } else if (data?.status === 'generating') {
        // Still generating - reset error state and keep waiting
        console.log('[SYNTHESIS] Synthesis in progress');
        setShowRefreshButton(true);
      } else if (data?.status === 'waiting') {
        setErrorMessage('Waiting for your partner to complete their input.');
        setHasError(true);
      } else if (data?.status === 'failed') {
        setErrorMessage(data.error || 'Generation failed. Please try again.');
        setHasError(true);
      }
    } catch (error) {
      console.error('[SYNTHESIS] Refresh error:', error);
      setErrorMessage('Something went wrong. Please try again.');
      setHasError(true);
    } finally {
      setIsRefreshing(false);
    }
  };

  // CONSOLIDATED: Realtime subscription moved to CoupleContext
  // This component now relies on currentCycle from context for updates
  // Check for synthesis completion from context changes
  useEffect(() => {
    if (!cycleId || isCompleteRef.current) return;
    
    // If currentCycle has synthesized_output, we're done
    if (currentCycle?.synthesized_output && currentCycle?.id === cycleId) {
      console.log('[SYNTHESIS] Detected synthesis complete from context');
      handleComplete();
    }
  }, [cycleId, currentCycle?.synthesized_output, currentCycle?.id, handleComplete]);

  const currentRitual = displayRituals[currentRitualIndex];
  const nextRitual = displayRituals[(currentRitualIndex + 1) % displayRituals.length];
  const prevRitual = displayRituals[(currentRitualIndex - 1 + displayRituals.length) % displayRituals.length];

  // Error state UI - improved with clearer messaging and retry options
  if (hasError) {
    const isWaitingForPartner = errorMessage.toLowerCase().includes('waiting');
    
    return (
      <div className="h-full flex flex-col bg-gradient-warm items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center space-y-6 max-w-sm"
        >
          <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center ${
            isWaitingForPartner ? 'bg-primary/10' : 'bg-destructive/10'
          }`}>
            {isWaitingForPartner ? (
              <Clock className="w-8 h-8 text-primary" />
            ) : (
              <AlertCircle className="w-8 h-8 text-destructive" />
            )}
          </div>
          
          <div>
            <h2 className="text-xl font-bold mb-2">
              {isWaitingForPartner ? "Almost there!" : "Something's taking too long"}
            </h2>
            <p className="text-muted-foreground text-sm">
              {errorMessage}
            </p>
          </div>

          <div className="space-y-3">
            {!isWaitingForPartner && (
              <Button
                onClick={handleManualRefresh}
                disabled={isRefreshing}
                className="w-full bg-gradient-ritual"
              >
                {isRefreshing ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    {retryCount > 1 ? 'Retrying...' : 'Checking...'}
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    {retryCount > 0 ? 'Try Again' : 'Check Again'}
                  </>
                )}
              </Button>
            )}
            
            <Button
              variant={isWaitingForPartner ? "default" : "outline"}
              onClick={() => navigate('/')}
              className={`w-full ${isWaitingForPartner ? 'bg-gradient-ritual' : ''}`}
            >
              <Home className="w-4 h-4 mr-2" />
              Go to Dashboard
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            {isWaitingForPartner 
              ? "You'll be notified when your partner is ready."
              : "Don't worry — your inputs are saved. Rituals may appear on your dashboard soon."}
          </p>

          {retryCount > 2 && !isWaitingForPartner && (
            <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
              Having trouble? Try refreshing the page or check back in a few minutes.
            </p>
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gradient-warm overflow-hidden">
      {/* Header with phase message */}
      <div className="flex-none px-6 pt-8 pb-4 text-center">
        <motion.div
          key={phase}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="space-y-2"
        >
          <motion.div
            animate={{ 
              rotate: isComplete ? 0 : 360,
              scale: isComplete ? [1, 1.3, 1] : [1, 1.05, 1]
            }}
            transition={{ 
              rotate: { duration: 2, repeat: isComplete ? 0 : Infinity, ease: 'linear' },
              scale: { duration: 1.5, repeat: Infinity }
            }}
            className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-primary/20 to-purple-200/30 flex items-center justify-center"
          >
            {isComplete ? (
              <Heart className="w-8 h-8 text-primary" fill="currentColor" />
            ) : (
              <img src={ritualIcon} alt="" className="w-12 h-12 object-contain" />
            )}
          </motion.div>
          
          <h2 className="text-xl font-bold">
            {isComplete ? "Rituals Ready! 🎉" : PHASES[phase].message}
          </h2>
          
          {!isComplete && (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>Usually takes ~15 seconds</span>
            </div>
          )}
        </motion.div>
      </div>

      {/* Cascading Ritual Cards */}
      <div className="flex-1 relative overflow-hidden px-4">
        <div className="absolute inset-0 flex items-center justify-center">
          <AnimatePresence mode="popLayout">
            {/* Previous card (fading out top) */}
            <motion.div
              key={`prev-${currentRitualIndex}`}
              initial={{ opacity: 0, y: -100, scale: 0.8 }}
              animate={{ opacity: 0.3, y: -120, scale: 0.75 }}
              exit={{ opacity: 0, y: -200, scale: 0.6 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="absolute w-full max-w-xs"
            >
              <Card className="bg-card/60 border-border/30 backdrop-blur-sm">
                <CardContent className="p-4">
                  <p className="font-semibold text-sm opacity-60">{prevRitual.title}</p>
                </CardContent>
              </Card>
            </motion.div>

            {/* Current card (center, prominent) */}
            <motion.div
              key={`current-${currentRitualIndex}`}
              initial={{ opacity: 0, y: 100, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0.3, y: -120, scale: 0.75 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="absolute w-full max-w-xs z-10"
            >
              <Card className="bg-card shadow-lg border-primary/20">
                <CardContent className="p-5 space-y-3">
                  <h3 className="font-bold text-lg">{currentRitual.title}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {currentRitual.description}
                  </p>
                  <div className="flex gap-3 text-xs text-muted-foreground">
                    <span className="px-2 py-1 bg-muted rounded-full">
                      {currentRitual.time_estimate}
                    </span>
                    <span className="px-2 py-1 bg-muted rounded-full">
                      {currentRitual.budget_band}
                    </span>
                    <span className="px-2 py-1 bg-primary/10 text-primary rounded-full">
                      {currentRitual.category}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Next card (coming from bottom) */}
            <motion.div
              key={`next-${currentRitualIndex}`}
              initial={{ opacity: 0, y: 200, scale: 0.6 }}
              animate={{ opacity: 0.4, y: 130, scale: 0.8 }}
              exit={{ opacity: 0, y: 100, scale: 0.9 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="absolute w-full max-w-xs"
            >
              <Card className="bg-card/60 border-border/30 backdrop-blur-sm">
                <CardContent className="p-4">
                  <p className="font-semibold text-sm opacity-60">{nextRitual.title}</p>
                </CardContent>
              </Card>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Footer with status and refresh button */}
      <div className="flex-none pb-8 px-6">
        <p className="text-center text-xs text-muted-foreground mb-4">
          Creating personalized rituals from your combined preferences
        </p>
        
        {showRefreshButton && !isComplete && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Button
              variant="outline"
              size="sm"
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="w-full"
            >
              {isRefreshing ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Checking...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Taking too long? Refresh
                </>
              )}
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
};