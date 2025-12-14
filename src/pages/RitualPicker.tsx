import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCouple } from '@/contexts/CoupleContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Clock, DollarSign, Calendar as CalendarIcon, Star, RefreshCw } from 'lucide-react';
import { RitualSpinner } from '@/components/RitualSpinner';
import ritualIcon from '@/assets/ritual-icon.png';
import { motion, AnimatePresence } from 'framer-motion';
import { AgreementGame } from '@/components/AgreementGame';
import { cn } from '@/lib/utils';
import { useSEO } from '@/hooks/useSEO';
import { NotificationContainer } from '@/components/InlineNotification';
import { usePremium } from '@/hooks/usePremium';
import { BlurredRitualCard, LockedRitualsPrompt } from '@/components/BlurredRitualCard';
import { UpgradeModal } from '@/components/UpgradeModal';

interface Ritual {
  id: string | number;
  title: string;
  description: string;
  time_estimate: string;
  budget_band: string;
  category?: string;
  why?: string;
}

export default function RitualPicker() {
  const { user, couple, currentCycle, refreshCycle } = useCouple();
  const navigate = useNavigate();
  const [rituals, setRituals] = useState<Ritual[]>([]);
  const [selectedRanks, setSelectedRanks] = useState<{ [key: number]: Ritual | null }>({ 1: null, 2: null, 3: null });
  const [proposedDate, setProposedDate] = useState<Date | undefined>(undefined);
  const [proposedTime, setProposedTime] = useState('19:00');
  const [step, setStep] = useState<'rank' | 'schedule' | 'waiting' | 'agreement' | 'generating'>('rank');
  const [partnerPreferences, setPartnerPreferences] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { isPremium, ritualsToShow } = usePremium();

  // SEO for ritual picker page
  useSEO({
    title: 'Pick Your Rituals',
    description: 'Rank your top 3 ritual preferences and propose a time. Work with your partner to find the perfect shared activity.',
  });

  // Manual refresh handler
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshCycle();
      // Re-check for rituals
      const { data } = await supabase
        .from('weekly_cycles')
        .select('synthesized_output')
        .eq('id', currentCycle?.id)
        .single();
      
      if (data?.synthesized_output) {
        const synthesized = data.synthesized_output as any;
        if (synthesized?.rituals?.length > 0) {
          setRituals(synthesized.rituals);
          setStep('rank');
        }
      }
    } catch (error) {
      console.error('[RitualPicker] Refresh error:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (!user || !couple) {
      navigate('/');
      return;
    }

    // If no currentCycle at all, go home
    if (!currentCycle) {
      console.log('[RitualPicker] No current cycle, redirecting to home');
      navigate('/');
      return;
    }

    const loadData = async () => {
      try {
        console.log('[RitualPicker] Loading data for cycle:', currentCycle.id);
        
        // Load rituals from current cycle
        const synthesized = currentCycle.synthesized_output as any;
        
        if (!synthesized?.rituals || synthesized.rituals.length === 0) {
          // No rituals yet - show generating state
          console.log('[RitualPicker] No rituals found, showing generating state');
          setStep('generating');
          setLoading(false);
          return;
        }
        
        setRituals(synthesized.rituals);

        // Check if user already submitted preferences and restore their selections
        const { data: myPrefs } = await supabase
          .from('ritual_preferences')
          .select('*')
          .eq('weekly_cycle_id', currentCycle.id)
          .eq('user_id', user.id)
          .order('rank', { ascending: true });

        if (myPrefs && myPrefs.length > 0) {
          // Restore user's selections from database
          const restoredRanks: { [key: number]: Ritual | null } = { 1: null, 2: null, 3: null };
          myPrefs.forEach((pref: any) => {
            if (pref.rank >= 1 && pref.rank <= 3 && pref.ritual_data) {
              restoredRanks[pref.rank] = pref.ritual_data as Ritual;
            }
          });
          setSelectedRanks(restoredRanks);
          
          // Restore date/time from first preference
          if (myPrefs[0]?.proposed_date) {
            setProposedDate(new Date(myPrefs[0].proposed_date));
          }
          if (myPrefs[0]?.proposed_time) {
            setProposedTime(myPrefs[0].proposed_time);
          }
          
          // Already submitted, check partner status
          setStep('waiting');
        }

        // Check if partner submitted
        const partnerId = couple.partner_one === user.id ? couple.partner_two : couple.partner_one;
        if (partnerId) {
          const { data: partnerPrefs } = await supabase
            .from('ritual_preferences')
            .select('*')
            .eq('weekly_cycle_id', currentCycle.id)
            .eq('user_id', partnerId);

          if (partnerPrefs && partnerPrefs.length > 0) {
            setPartnerPreferences(partnerPrefs);
            if (myPrefs && myPrefs.length > 0) {
              // Both submitted, move to agreement
              setStep('agreement');
            }
          }
        }

        // Listen for partner submissions
        const channel = supabase
          .channel(`ritual-preferences-${currentCycle.id}`)
          .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'ritual_preferences',
            filter: `weekly_cycle_id=eq.${currentCycle.id}`
          }, async (payload: any) => {
            if (payload.new.user_id !== user.id) {
              // Partner submitted
              const { data: partnerPrefs } = await supabase
                .from('ritual_preferences')
                .select('*')
                .eq('weekly_cycle_id', currentCycle.id)
                .eq('user_id', payload.new.user_id);
              
              setPartnerPreferences(partnerPrefs);
              setStep('agreement');
            }
          })
          .subscribe();

        return () => {
          supabase.removeChannel(channel);
        };
      } catch (error) {
        console.error('[RitualPicker] Error loading data:', error);
        setNotification({ type: 'error', message: 'Failed to load rituals' });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user, couple, currentCycle, navigate, refreshCycle]);

  // Listen for synthesis completion when in generating state
  useEffect(() => {
    if (step !== 'generating' || !currentCycle?.id) return;

    console.log('[RitualPicker] Setting up synthesis listener');

    const channel = supabase
      .channel(`synthesis-picker-${currentCycle.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'weekly_cycles',
        filter: `id=eq.${currentCycle.id}`
      }, async (payload: any) => {
        console.log('[RitualPicker] Synthesis update received:', payload);
        if (payload.new.synthesized_output?.rituals?.length > 0) {
          setRituals(payload.new.synthesized_output.rituals);
          setStep('rank');
        }
      })
      .subscribe();

    // Also poll every 5 seconds
    const pollInterval = setInterval(async () => {
      const { data } = await supabase
        .from('weekly_cycles')
        .select('synthesized_output')
        .eq('id', currentCycle.id)
        .single();
      
      if (data?.synthesized_output) {
        const synthesized = data.synthesized_output as any;
        if (synthesized?.rituals?.length > 0) {
          setRituals(synthesized.rituals);
          setStep('rank');
        }
      }
    }, 5000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, [step, currentCycle?.id]);

  const handleSelectRitual = (ritual: Ritual, rank: number) => {
    // Check if already selected at this exact rank - if so, deselect
    if (selectedRanks[rank]?.title === ritual.title) {
      setSelectedRanks(prev => ({
        ...prev,
        [rank]: null
      }));
      return;
    }

    // Check if already selected at another rank
    const currentRankForThis = Object.entries(selectedRanks).find(([_, r]) => r?.title === ritual.title)?.[0];
    
    if (currentRankForThis) {
      // Swap ranks
      setSelectedRanks(prev => ({
        ...prev,
        [currentRankForThis]: null,
        [rank]: ritual
      }));
    } else {
      // Fresh selection
      setSelectedRanks(prev => ({
        ...prev,
        [rank]: ritual
      }));
    }
  };

  const handleSubmitRankings = async () => {
    if (!selectedRanks[1] || !selectedRanks[2] || !selectedRanks[3]) {
      setNotification({ type: 'error', message: 'Please select all 3 preferences' });
      return;
    }

    setStep('schedule');
  };

  const handleSubmitSchedule = async () => {
    if (!proposedDate) {
      setNotification({ type: 'error', message: 'Please pick a date' });
      return;
    }

    try {
      // Delete existing preferences first
      await supabase
        .from('ritual_preferences')
        .delete()
        .eq('weekly_cycle_id', currentCycle!.id)
        .eq('user_id', user!.id);

      // Insert all 3 preferences
      const preferences = [1, 2, 3].map(rank => ({
        weekly_cycle_id: currentCycle!.id,
        user_id: user!.id,
        ritual_title: selectedRanks[rank]!.title,
        ritual_data: selectedRanks[rank] as any,
        rank,
        proposed_date: proposedDate.toISOString().split('T')[0],
        proposed_time: rank === 1 ? proposedTime : null
      }));

      const { error } = await supabase
        .from('ritual_preferences')
        .insert(preferences);

      if (error) throw error;

      setNotification({ type: 'success', message: 'Preferences submitted! ⭐' });
      setTimeout(() => setStep('waiting'), 1000);
    } catch (error) {
      console.error('Error submitting:', error);
      setNotification({ type: 'error', message: 'Failed to submit preferences' });
    }
  };

  const renderRankingStep = () => (
    <div className="h-full flex flex-col">
      {/* Fixed header */}
      <div className="flex-none px-4 py-3">
        {notification && (
          <div className="mb-3">
            <NotificationContainer
              notification={notification}
              onDismiss={() => setNotification(null)}
            />
          </div>
        )}
        <div className="text-center mb-3">
          <h2 className="text-xl font-bold mb-1">Pick Your Top 3</h2>
          <p className="text-sm text-muted-foreground">
            Tap to rank: 1st choice, 2nd choice, 3rd choice
          </p>
        </div>

        {/* Selected Ranks Display */}
        <div className="grid grid-cols-3 gap-2 max-w-sm mx-auto">
          {[1, 2, 3].map(rank => (
            <div key={rank}>
              <div 
                className={cn(
                  "h-20 rounded-xl border-2 flex flex-col items-center justify-center cursor-pointer transition-all p-2",
                  selectedRanks[rank] 
                    ? "bg-primary/10 border-primary hover:bg-primary/20" 
                    : "bg-muted/30 border-dashed border-muted-foreground/30"
                )}
                onClick={() => {
                  if (selectedRanks[rank]) {
                    setSelectedRanks(prev => ({ ...prev, [rank]: null }));
                  }
                }}
              >
                {selectedRanks[rank] ? (
                  <>
                    <Star className="w-4 h-4 text-primary mb-1 flex-shrink-0" fill="currentColor" />
                    <p className="text-xs font-semibold text-center line-clamp-2 leading-tight">
                      {selectedRanks[rank]!.title}
                    </p>
                  </>
                ) : (
                  <>
                    <span className="text-lg font-bold text-muted-foreground/50">#{rank}</span>
                    <span className="text-xs text-muted-foreground/50">
                      {rank === 1 ? 'Top pick' : rank === 2 ? '2nd' : '3rd'}
                    </span>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Scrollable cards */}
      <div className="flex-1 overflow-y-auto min-h-0 px-4">
        <div className="space-y-2 pb-4">
          {rituals.map((ritual, idx) => {
            const isLocked = !isPremium && idx >= ritualsToShow;
            const currentRank = Object.entries(selectedRanks).find(([_, r]) => r?.title === ritual.title)?.[0];
            return (
              <motion.div
                key={idx}
                whileTap={!isLocked ? { scale: 0.98 } : undefined}
                onClick={() => {
                  if (isLocked) {
                    setShowUpgradeModal(true);
                    return;
                  }
                  const nextRank = !currentRank ? 
                    (selectedRanks[1] ? (selectedRanks[2] ? 3 : 2) : 1) : 
                    parseInt(currentRank);
                  handleSelectRitual(ritual, nextRank);
                }}
              >
                <Card className={cn(
                  "transition-all",
                  isLocked ? "opacity-60 cursor-pointer" : "cursor-pointer active:scale-[0.98]",
                  currentRank ? "ring-2 ring-primary bg-primary/5" : "hover:bg-muted/30"
                )}>
                  <CardContent className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-sm mb-0.5 truncate">{ritual.title}</h3>
                        <p className="text-xs text-muted-foreground line-clamp-1 mb-1.5">{ritual.description}</p>
                        <div className="flex gap-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1 px-1.5 py-0.5 bg-muted rounded">
                            <Clock className="w-3 h-3" />
                            {ritual.time_estimate}
                          </span>
                          <span className="flex items-center gap-1 px-1.5 py-0.5 bg-muted rounded">
                            <DollarSign className="w-3 h-3" />
                            {ritual.budget_band}
                          </span>
                        </div>
                      </div>
                      {isLocked ? (
                        <div className="flex-none w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                          <span className="text-xs text-muted-foreground font-medium">PRO</span>
                        </div>
                      ) : currentRank ? (
                        <div className="flex-none w-10 h-10 rounded-full bg-gradient-ritual text-white flex items-center justify-center font-bold text-lg shadow-md">
                          {currentRank}
                        </div>
                      ) : (
                        <div className="flex-none w-10 h-10 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
                          <span className="text-xs text-muted-foreground">+</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
      
      {/* Upgrade Modal */}
      <UpgradeModal 
        open={showUpgradeModal} 
        onClose={() => setShowUpgradeModal(false)}
        highlightFeature="rituals"
      />

      {/* Fixed button */}
      <div className="flex-none px-4 py-3 bg-background/80 backdrop-blur-sm border-t border-border/50">
        <Button
          onClick={handleSubmitRankings}
          disabled={!selectedRanks[1] || !selectedRanks[2] || !selectedRanks[3]}
          className="w-full h-12 bg-gradient-ritual text-white"
        >
          Next: Pick a Time
        </Button>
      </div>
    </div>
  );

  const renderScheduleStep = () => (
    <div className="h-full flex flex-col">
      {/* Fixed header */}
      <div className="flex-none px-4 py-3 text-center">
        <h2 className="text-xl font-bold mb-2">When works for you?</h2>
        <p className="text-sm text-muted-foreground">
          For your top pick: {selectedRanks[1]?.title}
        </p>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto min-h-0 px-4">
        <div className="space-y-4 pb-4">
          <div>
            <label className="text-sm font-semibold mb-2 block">Pick a Date</label>
            <Calendar
              mode="single"
              selected={proposedDate}
              onSelect={setProposedDate}
              disabled={(date) => date < new Date()}
              className="rounded-md border w-full"
            />
          </div>

          <div>
            <label className="text-sm font-semibold mb-2 block">Preferred Time</label>
            <input
              type="time"
              value={proposedTime}
              onChange={(e) => setProposedTime(e.target.value)}
              className="w-full h-12 px-4 rounded-lg border bg-background text-[16px]"
            />
          </div>
        </div>
      </div>

      {/* Fixed buttons */}
      <div className="flex-none px-4 py-3 bg-background/80 backdrop-blur-sm border-t border-border/50">
        <div className="flex gap-2">
          <Button
            onClick={() => setStep('rank')}
            variant="outline"
            className="flex-1"
          >
            Back
          </Button>
          <Button
            onClick={handleSubmitSchedule}
            disabled={!proposedDate}
            className="flex-1 bg-gradient-ritual text-white"
          >
            Submit Preferences
          </Button>
        </div>
      </div>
    </div>
  );

  const renderWaitingStep = () => (
    <div className="h-full flex flex-col items-center justify-center px-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center space-y-6 max-w-sm"
      >
        <motion.div 
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-20 h-20 mx-auto rounded-full bg-gradient-ritual flex items-center justify-center"
        >
          <Star className="w-10 h-10 text-white" fill="currentColor" />
        </motion.div>
        <div>
          <h2 className="text-2xl font-bold mb-2">Your picks are in! 🎉</h2>
          <p className="text-muted-foreground">
            Waiting for your partner to choose their favorites...
          </p>
        </div>
        
        {/* Show what user picked */}
        <div className="space-y-2 text-left">
          <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Your Selections</p>
          {[1, 2, 3].map(rank => selectedRanks[rank] && (
            <div key={rank} className="flex items-center gap-3 p-3 bg-card rounded-lg border">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                {rank}
              </div>
              <span className="text-sm font-medium">{selectedRanks[rank]!.title}</span>
            </div>
          ))}
        </div>
        
        <p className="text-xs text-muted-foreground">
          You'll be notified when they're done
        </p>
      </motion.div>
    </div>
  );

  // Render generating state
  const renderGeneratingStep = () => (
    <div className="h-full flex flex-col items-center justify-center px-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center space-y-6 max-w-sm"
      >
        <motion.div 
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="relative w-20 h-20 mx-auto"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-0 rounded-full"
            style={{
              background: 'conic-gradient(from 0deg, hsl(175 65% 42%), hsl(270 55% 55%), hsl(175 65% 42%))',
              opacity: 0.3,
            }}
          />
          <div className="absolute inset-1 rounded-full bg-gradient-to-br from-primary/10 to-purple-200/20 flex items-center justify-center">
            <img src={ritualIcon} alt="" className="w-12 h-12 object-contain" />
          </div>
        </motion.div>
        
        <div>
          <h2 className="text-2xl font-bold mb-2">Generating Your Rituals</h2>
          <p className="text-muted-foreground">
            We're crafting personalized experiences based on both your preferences...
          </p>
        </div>

        <div className="pt-4 space-y-3">
          <Button
            variant="outline"
            onClick={handleRefresh}
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
                Refresh
              </>
            )}
          </Button>
          
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="w-full"
          >
            Go to Dashboard
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          This usually takes 10-20 seconds. Rituals will appear automatically.
        </p>
      </motion.div>
    </div>
  );

  if (loading) {
    return (
      <div className="h-full bg-gradient-warm flex items-center justify-center">
        <RitualSpinner size="lg" showText text="Loading rituals..." />
      </div>
    );
  }

  return (
    <div className="h-full bg-gradient-warm flex flex-col">
      <AnimatePresence mode="wait">
        {step === 'generating' && (
          <motion.div
            key="generating"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="h-full"
          >
            {renderGeneratingStep()}
          </motion.div>
        )}
        {step === 'rank' && (
          <motion.div
            key="rank"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="h-full"
          >
            {renderRankingStep()}
          </motion.div>
        )}
        {step === 'schedule' && (
          <motion.div
            key="schedule"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="h-full"
          >
            {renderScheduleStep()}
          </motion.div>
        )}
        {step === 'waiting' && (
          <motion.div
            key="waiting"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="h-full"
          >
            {renderWaitingStep()}
          </motion.div>
        )}
        {step === 'agreement' && partnerPreferences && (
          <motion.div
            key="agreement"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="h-full"
          >
            <AgreementGame
              myPreferences={[1, 2, 3].map(rank => ({
                rank,
                ritual: selectedRanks[rank]!,
                proposedDate: proposedDate,
                proposedTime: rank === 1 ? proposedTime : undefined
              }))}
              partnerPreferences={partnerPreferences}
              onAgreementReached={(ritual, date, time) => {
                refreshCycle();
                navigate('/rituals');
              }}
              cycleId={currentCycle?.id || ''}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}