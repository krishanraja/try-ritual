/**
 * RitualResults Component
 * 
 * Displays the computed ritual match result using the "proposer wins" decision model.
 * This component is deterministic - it computes the result rather than letting
 * users race to make a decision.
 * 
 * Algorithm:
 * 1. Find rituals ranked by BOTH partners (overlap)
 * 2. If overlap exists: pick the one with best combined rank
 * 3. If no overlap: PROPOSER's #1 pick wins
 * 
 * Time resolution:
 * 1. Find overlapping time window between partners' ranges
 * 2. If no overlap: use PROPOSER's time range
 * 
 * @created 2025-12-25 - Ritual Flow Overhaul
 */

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Calendar, Clock, Download, Share2, Check, Heart, Users, Crown } from 'lucide-react';
import { downloadICS, generateGoogleCalendarUrl, generateAppleCalendarUrl } from '@/utils/calendarUtils';
import { shareToWhatsApp } from '@/utils/shareUtils';
import { NotificationContainer } from './InlineNotification';
import { format } from 'date-fns';
import {
  safePreferences,
  findBestRitual,
  getTopPick,
  calculateTimeOverlap,
  safeFormatDate,
  safeFormatTimeRange,
  type SafePreference,
  type SafeRitual,
  type TimeRange,
} from '@/utils/guards';

interface RitualResultsProps {
  myPreferences: SafePreference[];
  partnerPreferences: SafePreference[];
  proposerUserId: string | null;
  currentUserId: string;
  cycleId: string;
  onConfirm: (ritual: SafeRitual, date: string, timeStart: string, timeEnd: string) => void;
}

export function RitualResults({
  myPreferences,
  partnerPreferences,
  proposerUserId,
  currentUserId,
  cycleId,
  onConfirm,
}: RitualResultsProps) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [showCalendarOptions, setShowCalendarOptions] = useState(false);

  // Determine if current user is the proposer
  const isProposer = proposerUserId === currentUserId;

  // Compute the result deterministically
  const result = useMemo(() => {
    // Find best overlapping ritual
    const overlapResult = findBestRitual(myPreferences, partnerPreferences);
    
    // Get top picks
    const myTop = getTopPick(myPreferences);
    const partnerTop = getTopPick(partnerPreferences);

    let chosenRitual: SafeRitual | null = null;
    let decisionMethod: 'perfect_match' | 'overlap' | 'proposer';
    
    if (overlapResult?.isOverlap) {
      // Both partners ranked this ritual
      chosenRitual = overlapResult.ritual;
      
      // Check if it's a perfect match (both ranked #1)
      if (myTop?.ritual.title === partnerTop?.ritual.title) {
        decisionMethod = 'perfect_match';
      } else {
        decisionMethod = 'overlap';
      }
    } else {
      // No overlap - proposer's pick wins
      if (isProposer && myTop) {
        chosenRitual = myTop.ritual;
      } else if (!isProposer && partnerTop) {
        chosenRitual = partnerTop.ritual;
      } else if (myTop) {
        // Fallback
        chosenRitual = myTop.ritual;
      }
      decisionMethod = 'proposer';
    }

    // Compute time overlap
    const myTimeRange: TimeRange | null = myTop?.proposed_time_start && myTop?.proposed_time_end
      ? { start: myTop.proposed_time_start, end: myTop.proposed_time_end }
      : null;
    
    const partnerTimeRange: TimeRange | null = partnerTop?.proposed_time_start && partnerTop?.proposed_time_end
      ? { start: partnerTop.proposed_time_start, end: partnerTop.proposed_time_end }
      : null;

    let finalTimeRange: TimeRange | null = calculateTimeOverlap(myTimeRange, partnerTimeRange);
    let timeMethod: 'overlap' | 'proposer';

    if (finalTimeRange) {
      timeMethod = 'overlap';
    } else {
      // No time overlap - use proposer's time
      const proposerTimeRange = isProposer ? myTimeRange : partnerTimeRange;
      finalTimeRange = proposerTimeRange || myTimeRange || { start: '19:00', end: '21:00' };
      timeMethod = 'proposer';
    }

    // Get date from the preference that has the ritual
    const prefWithRitual = myPreferences.find(p => p.ritual.title === chosenRitual?.title)
      || partnerPreferences.find(p => p.ritual.title === chosenRitual?.title);
    const chosenDate = prefWithRitual?.proposed_date || myTop?.proposed_date || '';

    return {
      ritual: chosenRitual,
      date: chosenDate,
      timeRange: finalTimeRange,
      decisionMethod,
      timeMethod,
    };
  }, [myPreferences, partnerPreferences, isProposer]);

  const handleConfirm = async () => {
    if (!result.ritual || !result.date || !result.timeRange) {
      setNotification({ type: 'error', message: 'Could not determine ritual selection' });
      return;
    }

    setIsConfirming(true);

    try {
      // Update cycle with agreement
      const { error } = await supabase
        .from('weekly_cycles')
        .update({
          agreement_reached: true,
          agreed_ritual: result.ritual,
          agreed_date: result.date,
          agreed_time: result.timeRange.start, // Legacy field
          agreed_time_start: result.timeRange.start,
          agreed_time_end: result.timeRange.end,
        })
        .eq('id', cycleId);

      if (error) throw error;

      setIsConfirmed(true);
      confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });

      // Notify parent after short delay for celebration
      setTimeout(() => {
        onConfirm(
          result.ritual!,
          result.date,
          result.timeRange!.start,
          result.timeRange!.end
        );
      }, 2000);

    } catch (error) {
      console.error('[RitualResults] Error confirming:', error);
      setNotification({ type: 'error', message: 'Failed to save agreement. Please try again.' });
    } finally {
      setIsConfirming(false);
    }
  };

  const handleAddToCalendar = (type: 'download' | 'google' | 'apple') => {
    if (!result.ritual || !result.date) return;
    
    const dateObj = new Date(result.date);
    const timeStr = result.timeRange?.start || '19:00';
    
    if (type === 'download') {
      downloadICS(result.ritual, dateObj, timeStr);
      setNotification({ type: 'success', message: 'Calendar event downloaded!' });
    } else if (type === 'google') {
      const url = generateGoogleCalendarUrl(result.ritual, dateObj, timeStr);
      window.open(url, '_blank');
    } else if (type === 'apple') {
      const url = generateAppleCalendarUrl(result.ritual, dateObj, timeStr);
      window.open(url, '_blank');
    }
    setShowCalendarOptions(false);
  };

  const handleShare = () => {
    if (!result.ritual) return;
    shareToWhatsApp(result.ritual);
  };

  // Confirmed state UI
  if (isConfirmed && result.ritual) {
    return (
      <div className="h-full overflow-y-auto p-4">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="space-y-4 max-w-sm mx-auto"
        >
          {notification && (
            <NotificationContainer
              notification={notification}
              onDismiss={() => setNotification(null)}
            />
          )}
          
          <div className="text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
              className="w-20 h-20 mx-auto rounded-full bg-gradient-ritual flex items-center justify-center mb-4"
            >
              <Heart className="w-10 h-10 text-white" fill="currentColor" />
            </motion.div>
            <h2 className="text-2xl font-bold mb-1">It's Locked In! 🎉</h2>
            <p className="text-sm text-muted-foreground">Your ritual is confirmed</p>
          </div>
          
          {/* Ritual Card */}
          <Card className="bg-gradient-ritual text-white border-0 overflow-hidden">
            <CardContent className="p-5 space-y-3">
              <h3 className="font-bold text-xl">{result.ritual.title}</h3>
              <p className="text-sm opacity-90 line-clamp-2">{result.ritual.description}</p>
              <div className="flex items-center gap-4 text-sm pt-2 border-t border-white/20">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>{safeFormatDate(result.date)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>{safeFormatTimeRange(result.timeRange?.start, result.timeRange?.end)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Calendar Options */}
          <div className="space-y-2">
            <AnimatePresence>
              {showCalendarOptions ? (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="space-y-2 overflow-hidden"
                >
                  <Button
                    onClick={() => handleAddToCalendar('google')}
                    variant="outline"
                    className="w-full h-11 flex items-center gap-2"
                  >
                    <Calendar className="w-4 h-4" />
                    Add to Google Calendar
                  </Button>
                  <Button
                    onClick={() => handleAddToCalendar('apple')}
                    variant="outline"
                    className="w-full h-11 flex items-center gap-2"
                  >
                    <Calendar className="w-4 h-4" />
                    Add to Apple Calendar
                  </Button>
                  <Button
                    onClick={() => handleAddToCalendar('download')}
                    variant="outline"
                    className="w-full h-11 flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download .ics File
                  </Button>
                  <Button
                    onClick={() => setShowCalendarOptions(false)}
                    variant="ghost"
                    className="w-full text-sm"
                  >
                    Cancel
                  </Button>
                </motion.div>
              ) : (
                <Button
                  onClick={() => setShowCalendarOptions(true)}
                  variant="outline"
                  className="w-full h-12 flex items-center gap-2"
                >
                  <Calendar className="w-4 h-4" />
                  Add to Calendar
                </Button>
              )}
            </AnimatePresence>

            <Button
              onClick={handleShare}
              variant="outline"
              className="w-full h-12 flex items-center gap-2"
            >
              <Share2 className="w-4 h-4" />
              Share via WhatsApp
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Result display UI
  if (!result.ritual) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-muted-foreground">Unable to determine ritual match</p>
          <p className="text-xs text-muted-foreground mt-2">Please try refreshing the page</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-4">
      <div className="space-y-4 max-w-sm mx-auto">
        {notification && (
          <NotificationContainer
            notification={notification}
            onDismiss={() => setNotification(null)}
          />
        )}

        {/* Header based on decision method */}
        <div className="text-center">
          {result.decisionMethod === 'perfect_match' && (
            <>
              <motion.div 
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 1.5, repeat: 2 }}
                className="w-16 h-16 mx-auto rounded-full bg-gradient-ritual flex items-center justify-center mb-3"
              >
                <Sparkles className="w-8 h-8 text-white" />
              </motion.div>
              <h2 className="text-xl font-bold">Perfect Match! 🎉</h2>
              <p className="text-sm text-muted-foreground">You both picked the same #1!</p>
            </>
          )}
          
          {result.decisionMethod === 'overlap' && (
            <>
              <motion.div 
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 0.5, repeat: 2 }}
                className="w-16 h-16 mx-auto rounded-full bg-gradient-ritual flex items-center justify-center mb-3"
              >
                <Users className="w-8 h-8 text-white" />
              </motion.div>
              <h2 className="text-xl font-bold">Great Minds! ✨</h2>
              <p className="text-sm text-muted-foreground">You both ranked this ritual</p>
            </>
          )}
          
          {result.decisionMethod === 'proposer' && (
            <>
              <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-3">
                <Crown className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-xl font-bold">
                {isProposer ? "Your Pick Wins! 👑" : "Partner's Pick! 💕"}
              </h2>
              <p className="text-sm text-muted-foreground">
                {isProposer 
                  ? "You submitted first, so your preference wins"
                  : "Your partner submitted first, so their preference wins"}
              </p>
            </>
          )}
        </div>

        {/* Result card */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4 space-y-3">
            <h3 className="font-bold text-lg">{result.ritual.title}</h3>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {result.ritual.description}
            </p>
            <div className="flex flex-wrap gap-3 text-sm pt-2 border-t border-border/50">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>{safeFormatDate(result.date)}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>{safeFormatTimeRange(result.timeRange?.start, result.timeRange?.end)}</span>
              </div>
            </div>
            
            {result.timeMethod === 'overlap' && (
              <p className="text-xs text-primary bg-primary/10 rounded-lg px-2 py-1 inline-block">
                ✓ Times overlap - perfect!
              </p>
            )}
          </CardContent>
        </Card>

        {/* How we got here */}
        <div className="text-center text-xs text-muted-foreground space-y-1">
          {result.decisionMethod === 'proposer' && (
            <p>
              No overlapping choices, so {isProposer ? 'your' : "partner's"} top pick was selected
            </p>
          )}
          {result.timeMethod === 'proposer' && (
            <p>
              Time windows didn't overlap, using {isProposer ? 'your' : "partner's"} availability
            </p>
          )}
        </div>

        {/* Confirm button */}
        <Button
          onClick={handleConfirm}
          disabled={isConfirming}
          className="w-full h-12 bg-gradient-ritual text-white"
        >
          {isConfirming ? (
            <>Confirming...</>
          ) : (
            <>
              <Check className="w-4 h-4 mr-2" />
              Lock It In!
            </>
          )}
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          Both partners can confirm - the result is the same for both of you
        </p>
      </div>
    </div>
  );
}













