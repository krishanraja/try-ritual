import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCouple } from '@/contexts/CoupleContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { RitualCarousel } from '@/components/RitualCarousel';
import { RitualLogo } from '@/components/RitualLogo';
import { StrictMobileViewport } from '@/components/StrictMobileViewport';
import { useSampleRituals } from '@/hooks/useSampleRituals';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';
import { usePresence } from '@/hooks/usePresence';
import { UserCircle } from 'lucide-react';

interface AgreedRitual {
  agreed_ritual?: any;
  agreed_date?: string;
  agreed_time?: string;
}

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
      <StrictMobileViewport>
        <div className="h-full bg-gradient-warm flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </StrictMobileViewport>
    );
  }

  if (rituals.length === 0) {
    return (
      <StrictMobileViewport>
        <div className="h-full bg-gradient-warm flex flex-col items-center justify-center px-4 gap-4">
          <RitualLogo size="md" />
          <div className="text-center space-y-2">
            <h2 className="text-lg font-bold">No Rituals Yet</h2>
            <p className="text-sm text-muted-foreground">Complete weekly input to generate</p>
          </div>
          <Button onClick={() => navigate('/input')} className="bg-gradient-ritual text-white h-12 rounded-xl px-6">
            Start Input
          </Button>
        </div>
      </StrictMobileViewport>
    );
  }

  return (
    <StrictMobileViewport>
      <div className="h-full bg-gradient-warm flex flex-col">
        {/* Header - Compact */}
        <div className="flex-none px-4 pt-3 pb-2">
          <div className="flex items-center justify-between mb-2">
            <RitualLogo size="xs" />
            {isPartnerOnline && (
              <div className="flex items-center gap-1.5 text-xs text-green-600">
                <UserCircle className="w-3 h-3" />
                <span>Partner online</span>
              </div>
            )}
          </div>
          <div className="text-center">
            <h1 className="text-lg font-bold mb-0.5">This Week's Rituals</h1>
            <p className="text-xs text-muted-foreground">
              {isShowingSamples ? 'Sample rituals' : 'Swipe to explore'}
            </p>
          </div>
        </div>

        {/* Carousel - Fills remaining space */}
        <div className="flex-1 overflow-hidden">
          <RitualCarousel
            rituals={rituals}
            completions={completions}
            onComplete={handleComplete}
            variant="full"
            isShowingSamples={isShowingSamples}
            agreedDate={(currentCycle as any)?.agreed_date}
            agreedTime={(currentCycle as any)?.agreed_time}
          />
        </div>

      </div>
    </StrictMobileViewport>
  );
}
