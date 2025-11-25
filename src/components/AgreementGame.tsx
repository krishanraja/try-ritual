import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';
import { motion } from 'framer-motion';
import { Sparkles, Calendar, Clock } from 'lucide-react';

interface Preference {
  rank: number;
  ritual: any;
  proposedDate?: Date;
  proposedTime?: string;
}

interface AgreementGameProps {
  myPreferences: Preference[];
  partnerPreferences: any[];
  onAgreementReached: (ritual: any, date: string, time: string) => void;
  cycleId: string;
}

export const AgreementGame = ({
  myPreferences,
  partnerPreferences,
  onAgreementReached,
  cycleId
}: AgreementGameProps) => {
  const [stage, setStage] = useState<'compare' | 'resolve' | 'done'>('compare');
  const [selectedOption, setSelectedOption] = useState<'mine' | 'theirs' | null>(null);

  // Find overlaps
  const myTop = myPreferences.find(p => p.rank === 1)?.ritual;
  const partnerTop = partnerPreferences.find((p: any) => p.rank === 1);

  const perfectMatch = myTop?.title === partnerTop?.ritual_data?.title;
  
  // Check if there's any overlap in top 3
  const myTitles = myPreferences.map(p => p.ritual.title);
  const partnerTitles = partnerPreferences.map((p: any) => p.ritual_data.title);
  const overlap = myTitles.filter(t => partnerTitles.includes(t));

  const handleResolve = async (choice: 'mine' | 'theirs' | 'coin') => {
    try {
      let finalRitual: any;
      let finalDate: string;
      let finalTime: string;

      if (choice === 'coin') {
        // Fun coin flip
        const flip = Math.random() > 0.5;
        finalRitual = flip ? myTop : partnerTop.ritual_data;
        finalDate = flip ? 
          myPreferences.find(p => p.rank === 1)?.proposedDate?.toISOString().split('T')[0]! :
          partnerTop.proposed_date;
        finalTime = flip ?
          myPreferences.find(p => p.rank === 1)?.proposedTime! :
          partnerTop.proposed_time || '19:00';
        
        toast.info(flip ? '🪙 Your pick won!' : '🪙 Their pick won!');
      } else if (choice === 'mine') {
        finalRitual = myTop;
        finalDate = myPreferences.find(p => p.rank === 1)?.proposedDate?.toISOString().split('T')[0]!;
        finalTime = myPreferences.find(p => p.rank === 1)?.proposedTime!;
      } else {
        finalRitual = partnerTop.ritual_data;
        finalDate = partnerTop.proposed_date;
        finalTime = partnerTop.proposed_time || '19:00';
      }

      // Update cycle with agreement
      const { error } = await supabase
        .from('weekly_cycles')
        .update({
          agreement_reached: true,
          agreed_ritual: finalRitual,
          agreed_date: finalDate,
          agreed_time: finalTime
        })
        .eq('id', cycleId);

      if (error) throw error;

      confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
      toast.success('Agreement reached! 🎉');
      setStage('done');
      
      setTimeout(() => {
        onAgreementReached(finalRitual, finalDate, finalTime);
      }, 2000);

    } catch (error) {
      console.error('Error reaching agreement:', error);
      toast.error('Failed to save agreement');
    }
  };

  if (perfectMatch) {
    return (
      <div className="p-4">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center space-y-4"
        >
          <div className="w-20 h-20 mx-auto rounded-full bg-gradient-ritual flex items-center justify-center">
            <Sparkles className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold">Perfect Match! 🎉</h2>
          <p className="text-muted-foreground">
            You both picked the same ritual as your #1 choice!
          </p>
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4">
              <h3 className="font-bold text-lg mb-2">{myTop.title}</h3>
              <p className="text-sm text-muted-foreground mb-3">{myTop.description}</p>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span>{myPreferences.find(p => p.rank === 1)?.proposedDate?.toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>{myPreferences.find(p => p.rank === 1)?.proposedTime}</span>
                </div>
              </div>
            </CardContent>
          </Card>
          <Button
            onClick={() => handleResolve('mine')}
            className="w-full h-12 bg-gradient-ritual text-white"
          >
            Confirm & Continue
          </Button>
        </motion.div>
      </div>
    );
  }

  if (overlap.length > 0) {
    return (
      <div className="p-4">
        <div className="text-center space-y-4">
          <h2 className="text-xl font-bold">Great Minds! ✨</h2>
          <p className="text-sm text-muted-foreground">
            You both have {overlap.length === 1 ? 'this ritual' : 'these rituals'} in your top 3
          </p>
          <div className="space-y-3">
            {overlap.map((title, idx) => {
              const myPref = myPreferences.find(p => p.ritual.title === title);
              const partnerPref = partnerPreferences.find((p: any) => p.ritual_data.title === title);
              return (
                <Card key={idx} className="bg-accent/5">
                  <CardContent className="p-4">
                    <h3 className="font-bold mb-1">{title}</h3>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Your pick: #{myPref?.rank}</span>
                      <span>Their pick: #{partnerPref?.rank}</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          <Button
            onClick={() => {
              const topOverlap = overlap.reduce((best, title) => {
                const myRank = myPreferences.find(p => p.ritual.title === title)?.rank || 999;
                const partnerRank = partnerPreferences.find((p: any) => p.ritual_data.title === title)?.rank || 999;
                const bestRank = myPreferences.find(p => p.ritual.title === best)?.rank || 999;
                const bestPartnerRank = partnerPreferences.find((p: any) => p.ritual_data.title === best)?.rank || 999;
                return (myRank + partnerRank < bestRank + bestPartnerRank) ? title : best;
              });
              const choice = myPreferences.find(p => p.ritual.title === topOverlap);
              if (choice) handleResolve('mine');
            }}
            className="w-full h-12 bg-gradient-ritual text-white"
          >
            Go with {overlap[0]}
          </Button>
        </div>
      </div>
    );
  }

  // No overlap - need resolution
  if (stage === 'compare') {
    return (
      <div className="p-4 space-y-4">
        <div className="text-center mb-4">
          <h2 className="text-xl font-bold mb-2">Different Picks!</h2>
          <p className="text-sm text-muted-foreground">
            No worries - let's find a fun way to decide
          </p>
        </div>

        <div className="space-y-3">
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4">
              <p className="text-xs text-primary font-semibold mb-2">Your Top Pick</p>
              <h3 className="font-bold">{myTop?.title}</h3>
              <p className="text-xs text-muted-foreground mt-1">{myTop?.description}</p>
            </CardContent>
          </Card>

          <Card className="bg-accent/5 border-accent/20">
            <CardContent className="p-4">
              <p className="text-xs text-accent font-semibold mb-2">Their Top Pick</p>
              <h3 className="font-bold">{partnerTop?.ritual_data?.title}</h3>
              <p className="text-xs text-muted-foreground mt-1">{partnerTop?.ritual_data?.description}</p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-2">
          <Button
            onClick={() => handleResolve('coin')}
            className="w-full h-12 bg-gradient-ritual text-white"
          >
            🪙 Flip a Coin
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={() => handleResolve('mine')}
              variant="outline"
            >
              Pick Mine
            </Button>
            <Button
              onClick={() => handleResolve('theirs')}
              variant="outline"
            >
              Pick Theirs
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-full">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="text-center"
      >
        <Sparkles className="w-16 h-16 mx-auto mb-4 text-primary" />
        <h2 className="text-2xl font-bold">Agreement Reached! 🎉</h2>
      </motion.div>
    </div>
  );
};