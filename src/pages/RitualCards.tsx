import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCouple } from '@/contexts/CoupleContext';
import { usePresence } from '@/hooks/usePresence';
import { useSampleRituals } from '@/hooks/useSampleRituals';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';
import { RitualLogo } from '@/components/RitualLogo';
import { MobileViewport } from '@/components/MobileViewport';
import { RitualCarousel } from '@/components/RitualCarousel';

interface Ritual {
  id: string | number;
  title: string;
  description: string;
  time_estimate: string;
  budget_band: string;
  category?: string;
  is_sample?: boolean;
}

export default function RitualCards() {
  const { user, couple, currentCycle, refreshCycle } = useCouple();
  const { partnerPresence, isPartnerOnline } = usePresence('rituals-page', 'viewing rituals');
  const { rituals: fetchedRituals, isShowingSamples } = useSampleRituals();
  const [rituals, setRituals] = useState<Ritual[]>([]);
  const [completions, setCompletions] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    if (!couple) {
      navigate('/');
      return;
    }

    const loadRituals = async () => {
      try {
        // Use the hook's rituals (samples or real)
        setRituals(fetchedRituals);

        // Only load completions if we have a real cycle
        if (currentCycle?.id && !isShowingSamples) {
          const { data } = await supabase
            .from('completions')
            .select('ritual_title')
            .eq('weekly_cycle_id', currentCycle.id);

          if (data) {
            setCompletions(new Set(data.map(c => c.ritual_title)));
          }
        }
      } catch (error) {
        console.error('Error loading rituals:', error);
        toast.error('Failed to load rituals');
      } finally {
        setLoading(false);
      }
    };

    loadRituals();

    // Listen for completions
    const channel = supabase
      .channel('completions-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'completions' }, (payload: any) => {
        if (payload.new.weekly_cycle_id === currentCycle.id) {
          setCompletions(prev => new Set([...prev, payload.new.ritual_title]));
          confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
          toast.success('Ritual completed! 🎉');
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, couple, currentCycle, navigate, fetchedRituals, isShowingSamples]);

  const handleComplete = async (ritual: Ritual) => {
    if (isShowingSamples) {
      toast.info('Create real rituals with your partner to track completions!');
      return;
    }
    if (!currentCycle || completions.has(ritual.title)) return;

    try {
      await supabase.from('completions').insert({
        weekly_cycle_id: currentCycle.id,
        ritual_title: ritual.title,
      });

      setCompletions(prev => new Set([...prev, ritual.title]));
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      toast.success('Marked as complete! 🎉');

      // Update streak
      if (couple) {
        const { data: streak } = await supabase
          .from('ritual_streaks')
          .select('*')
          .eq('couple_id', couple.id)
          .maybeSingle();

        const today = new Date().toISOString().split('T')[0];
        
        if (streak) {
          const lastDate = streak.last_completion_date;
          const daysSince = lastDate ? Math.floor((new Date(today).getTime() - new Date(lastDate).getTime()) / (1000 * 60 * 60 * 24)) : 999;
          
          const newStreak = daysSince === 1 ? streak.current_streak + 1 : 1;
          
          await supabase
            .from('ritual_streaks')
            .update({
              current_streak: newStreak,
              longest_streak: Math.max(newStreak, streak.longest_streak),
              last_completion_date: today,
            })
            .eq('id', streak.id);
        } else {
          await supabase.from('ritual_streaks').insert({
            couple_id: couple.id,
            current_streak: 1,
            longest_streak: 1,
            last_completion_date: today,
          });
        }
      }
    } catch (error) {
      console.error('Error marking complete:', error);
      toast.error('Failed to mark as complete');
    }
  };

  if (loading) {
    return (
      <div className="h-screen-mobile bg-gradient-warm flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (rituals.length === 0) {
    return (
      <div className="h-screen-mobile bg-gradient-warm flex flex-col items-center justify-center p-6 gap-6">
        <RitualLogo size="lg" />
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold">No Rituals Yet</h2>
          <p className="text-muted-foreground">Complete your weekly input to generate rituals!</p>
        </div>
        <Button onClick={() => navigate('/')} size="lg" className="rounded-xl">
          Go Home
        </Button>
      </div>
    );
  }

  return (
    <MobileViewport
      className="bg-gradient-warm"
      header={
        <div className="flex items-center justify-between px-4 py-3 bg-gradient-warm/80 backdrop-blur-sm">
          <RitualLogo size="sm" />
          <h1 className="text-lg font-bold flex-1 text-center">
            {isShowingSamples ? 'Sample Rituals' : 'Your Rituals'}
          </h1>
          {isPartnerOnline && partnerPresence && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-card/60 backdrop-blur-sm px-2 py-1 rounded-full">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            </div>
          )}
        </div>
      }
      footer={
        <div className="p-4 bg-gradient-warm/80 backdrop-blur-sm border-t">
          <Button 
            onClick={() => navigate('/')} 
            variant="outline" 
            className="w-full h-12 rounded-xl"
          >
            <Home className="w-4 h-4 mr-2" />
            Go Home
          </Button>
        </div>
      }
    >
      <RitualCarousel
        rituals={rituals}
        completions={completions}
        onComplete={handleComplete}
        variant="full"
        isShowingSamples={isShowingSamples}
      />
    </MobileViewport>
  );
}
