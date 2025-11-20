import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, Share2, CheckCircle2, Clock, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useCouple } from '@/contexts/CoupleContext';
import { usePresence } from '@/hooks/usePresence';
import { shareToWhatsApp } from '@/utils/shareUtils';
import { downloadICS } from '@/utils/calendarUtils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';
import ritualLogo from '@/assets/ritual-logo.png';

interface Ritual {
  id: string | number;
  title: string;
  description: string;
  time_estimate: string;
  budget_band: string;
  category?: string;
}

export default function RitualCards() {
  const { user, couple, currentCycle, refreshCycle } = useCouple();
  const { partnerPresence, isPartnerOnline } = usePresence('rituals-page', 'viewing rituals');
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

    if (!currentCycle?.synthesized_output) {
      navigate('/');
      return;
    }

    const loadRituals = async () => {
      try {
        const output = currentCycle.synthesized_output as any;
        setRituals(output.rituals || []);

        // Load completions
        const { data } = await supabase
          .from('completions')
          .select('ritual_title')
          .eq('weekly_cycle_id', currentCycle.id);

        if (data) {
          setCompletions(new Set(data.map(c => c.ritual_title)));
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
  }, [user, couple, currentCycle, navigate]);

  const handleComplete = async (ritual: Ritual) => {
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
      <div className="min-h-screen-mobile bg-gradient-warm flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen-mobile bg-gradient-warm p-6 pb-24 space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-3">
        <img src={ritualLogo} alt="Ritual" className="w-16 h-16 mx-auto" />
        <h1 className="text-3xl font-bold">Your Rituals</h1>
        {isPartnerOnline && partnerPresence?.activity && (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 rounded-full">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-sm text-muted-foreground">{partnerPresence.activity}</span>
          </motion.div>
        )}
      </motion.div>

      <div className="grid gap-6">
        {rituals.map((ritual, index) => {
          const isComplete = completions.has(ritual.title);
          
          return (
            <motion.div
              key={ritual.id || index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className={`p-6 space-y-4 ${isComplete ? 'bg-green-50 border-green-200' : 'bg-white/90'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-xl font-bold">{ritual.title}</h3>
                      {isComplete && <CheckCircle2 className="w-5 h-5 text-green-600" />}
                    </div>
                    {ritual.category && (
                      <Badge variant="secondary" className="text-xs">
                        {ritual.category}
                      </Badge>
                    )}
                  </div>
                </div>

                <p className="text-muted-foreground leading-relaxed">{ritual.description}</p>

                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>{ritual.time_estimate}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Sparkles className="w-4 h-4" />
                    <span>{ritual.budget_band}</span>
                  </div>
                </div>

                <div className="flex gap-2 flex-wrap">
                  {!isComplete && (
                    <Button
                      onClick={() => handleComplete(ritual)}
                      className="bg-gradient-ritual text-white hover:opacity-90"
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Mark as Done
                    </Button>
                  )}
                  
                  <Button
                    onClick={() => shareToWhatsApp(ritual)}
                    variant="outline"
                    size="sm"
                  >
                    <Share2 className="w-4 h-4 mr-2" />
                    WhatsApp
                  </Button>
                  
                  <Button
                    onClick={() => downloadICS(ritual)}
                    variant="outline"
                    size="sm"
                  >
                    <Calendar className="w-4 h-4 mr-2" />
                    Calendar
                  </Button>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {rituals.length === 0 && (
        <Card className="p-12 text-center bg-white/90">
          <p className="text-muted-foreground">No rituals generated yet</p>
          <Button onClick={() => navigate('/')} className="mt-4">
            Go Home
          </Button>
        </Card>
      )}
    </div>
  );
}
