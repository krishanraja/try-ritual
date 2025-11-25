import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCouple } from '@/contexts/CoupleContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { RitualLogo } from '@/components/RitualLogo';
import { StrictMobileViewport } from '@/components/StrictMobileViewport';
import { Calendar } from '@/components/ui/calendar';
import { toast } from 'sonner';
import { Clock, DollarSign, Calendar as CalendarIcon, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AgreementGame } from '@/components/AgreementGame';
import { cn } from '@/lib/utils';

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
  const [step, setStep] = useState<'rank' | 'schedule' | 'waiting' | 'agreement'>('rank');
  const [partnerPreferences, setPartnerPreferences] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !couple || !currentCycle) {
      navigate('/');
      return;
    }

    const loadData = async () => {
      try {
        // Load rituals from current cycle
        const synthesized = currentCycle.synthesized_output as any;
        if (synthesized?.rituals) {
          setRituals(synthesized.rituals);
        }

        // Check if user already submitted preferences
        const { data: myPrefs } = await supabase
          .from('ritual_preferences')
          .select('*')
          .eq('weekly_cycle_id', currentCycle.id)
          .eq('user_id', user.id);

        if (myPrefs && myPrefs.length > 0) {
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
          .channel('ritual-preferences-changes')
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
        console.error('Error loading data:', error);
        toast.error('Failed to load rituals');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user, couple, currentCycle, navigate]);

  const handleSelectRitual = (ritual: Ritual, rank: number) => {
    // Check if already selected at another rank
    const currentRankForThis = Object.entries(selectedRanks).find(([_, r]) => r?.title === ritual.title)?.[0];
    
    if (currentRankForThis) {
      // Swap or deselect
      setSelectedRanks(prev => ({
        ...prev,
        [currentRankForThis]: null,
        [rank]: ritual
      }));
    } else {
      setSelectedRanks(prev => ({
        ...prev,
        [rank]: ritual
      }));
    }
  };

  const handleSubmitRankings = async () => {
    if (!selectedRanks[1] || !selectedRanks[2] || !selectedRanks[3]) {
      toast.error('Please select all 3 preferences');
      return;
    }

    setStep('schedule');
  };

  const handleSubmitSchedule = async () => {
    if (!proposedDate) {
      toast.error('Please pick a date');
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

      toast.success('Preferences submitted! ⭐');
      setStep('waiting');
    } catch (error) {
      console.error('Error submitting:', error);
      toast.error('Failed to submit preferences');
    }
  };

  const renderRankingStep = () => (
    <div className="p-4 space-y-4">
      <div className="text-center mb-4">
        <h2 className="text-xl font-bold mb-2">Pick Your Top 3</h2>
        <p className="text-sm text-muted-foreground">
          Tap to rank: 1st choice, 2nd choice, 3rd choice
        </p>
      </div>

      {/* Selected Ranks Display */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {[1, 2, 3].map(rank => (
          <div key={rank} className="text-center">
            <div className={cn(
              "h-16 rounded-lg border-2 flex items-center justify-center",
              selectedRanks[rank] ? "bg-primary/10 border-primary" : "bg-muted/50 border-dashed border-muted"
            )}>
              {selectedRanks[rank] ? (
                <div className="px-2">
                  <Star className="w-4 h-4 mx-auto mb-1 text-primary" fill="currentColor" />
                  <p className="text-xs font-semibold line-clamp-2">{selectedRanks[rank]!.title}</p>
                </div>
              ) : (
                <span className="text-muted-foreground text-sm">#{rank}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Ritual Cards */}
      <div className="space-y-3">
        {rituals.map((ritual, idx) => {
          const currentRank = Object.entries(selectedRanks).find(([_, r]) => r?.title === ritual.title)?.[0];
          return (
            <motion.div
              key={idx}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                const nextRank = !currentRank ? 
                  (selectedRanks[1] ? (selectedRanks[2] ? 3 : 2) : 1) : 
                  parseInt(currentRank);
                handleSelectRitual(ritual, nextRank);
              }}
            >
              <Card className={cn(
                "cursor-pointer transition-all",
                currentRank && "ring-2 ring-primary bg-primary/5"
              )}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <h3 className="font-bold mb-1">{ritual.title}</h3>
                      <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{ritual.description}</p>
                      <div className="flex gap-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {ritual.time_estimate}
                        </span>
                        <span className="flex items-center gap-1">
                          <DollarSign className="w-3 h-3" />
                          {ritual.budget_band}
                        </span>
                      </div>
                    </div>
                    {currentRank && (
                      <div className="flex-none w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                        {currentRank}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <Button
        onClick={handleSubmitRankings}
        disabled={!selectedRanks[1] || !selectedRanks[2] || !selectedRanks[3]}
        className="w-full h-12 bg-gradient-ritual text-white"
      >
        Next: Pick a Time
      </Button>
    </div>
  );

  const renderScheduleStep = () => (
    <div className="p-4 space-y-4">
      <div className="text-center mb-4">
        <h2 className="text-xl font-bold mb-2">When works for you?</h2>
        <p className="text-sm text-muted-foreground">
          For your top pick: {selectedRanks[1]?.title}
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-sm font-semibold mb-2 block">Pick a Date</label>
          <Calendar
            mode="single"
            selected={proposedDate}
            onSelect={setProposedDate}
            disabled={(date) => date < new Date()}
            className="rounded-md border"
          />
        </div>

        <div>
          <label className="text-sm font-semibold mb-2 block">Preferred Time</label>
          <input
            type="time"
            value={proposedTime}
            onChange={(e) => setProposedTime(e.target.value)}
            className="w-full h-12 px-4 rounded-lg border bg-background"
          />
        </div>
      </div>

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
  );

  const renderWaitingStep = () => (
    <div className="flex items-center justify-center h-full px-4">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
          <Star className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-xl font-bold">Preferences Submitted! ⭐</h2>
        <p className="text-sm text-muted-foreground">
          Waiting for your partner to pick their favorites...
        </p>
      </div>
    </div>
  );

  if (loading) {
    return (
      <StrictMobileViewport>
        <div className="h-full bg-gradient-warm flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </StrictMobileViewport>
    );
  }

  return (
    <StrictMobileViewport>
      <div className="h-full bg-gradient-warm flex flex-col">
        <div className="flex-none px-4 pt-3 pb-2">
          <RitualLogo size="xs" />
        </div>

        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            {step === 'rank' && (
              <motion.div
                key="rank"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                {renderRankingStep()}
              </motion.div>
            )}
            {step === 'schedule' && (
              <motion.div
                key="schedule"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                {renderScheduleStep()}
              </motion.div>
            )}
            {step === 'waiting' && (
              <motion.div
                key="waiting"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                {renderWaitingStep()}
              </motion.div>
            )}
            {step === 'agreement' && currentCycle && (
              <motion.div
                key="agreement"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <AgreementGame
                  myPreferences={Object.entries(selectedRanks).map(([rank, ritual]) => ({
                    rank: parseInt(rank),
                    ritual: ritual!,
                    proposedDate,
                    proposedTime
                  }))}
                  partnerPreferences={partnerPreferences}
                  onAgreementReached={(agreedRitual, agreedDate, agreedTime) => {
                    navigate('/rituals');
                  }}
                  cycleId={currentCycle.id}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </StrictMobileViewport>
  );
}