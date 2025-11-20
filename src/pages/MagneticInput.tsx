import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCouple } from '@/contexts/CoupleContext';
import { supabase } from '@/integrations/supabase/client';
import { MagneticCanvas } from '@/components/MagneticCanvas';
import { StrictMobileViewport } from '@/components/StrictMobileViewport';
import { motion } from 'framer-motion';
import { Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

export default function MagneticInput() {
  const { user, couple, currentCycle, loading } = useCouple();
  const navigate = useNavigate();
  const [weeklyCycleId, setWeeklyCycleId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
      return;
    }

    if (!couple) {
      toast.error('Please create or join a couple first');
      navigate('/home');
      return;
    }

    // Get or create this week's cycle
    const initializeCycle = async () => {
      if (currentCycle?.id) {
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
        .single();

      if (existingCycle) {
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
          toast.error('Failed to create weekly cycle');
          navigate('/home');
          return;
        }

        setWeeklyCycleId(newCycle.id);
      }
    };

    initializeCycle();
  }, [user, couple, currentCycle, loading, navigate]);

  const handleComplete = async (canvasState: any) => {
    if (!weeklyCycleId || !couple) return;

    setIsGenerating(true);

    try {
      // Check if both partners have completed
      const { data: cycle } = await supabase
        .from('weekly_cycles')
        .select('canvas_state_one, canvas_state_two')
        .eq('id', weeklyCycleId)
        .single();

      const isPartnerOne = couple.partner_one === user?.id;
      const partnerState = isPartnerOne ? cycle?.canvas_state_two : cycle?.canvas_state_one;

      if (partnerState) {
        // Both completed - trigger synthesis
        const { data, error } = await supabase.functions.invoke('synthesize-rituals', {
          body: {
            action: 'canvas',
            weeklyCycleId,
            canvasStateOne: isPartnerOne ? canvasState : partnerState,
            canvasStateTwo: isPartnerOne ? partnerState : canvasState
          }
        });

        if (error) throw error;

        // Update with synthesized rituals
        await supabase
          .from('weekly_cycles')
          .update({
            synthesized_output: data.rituals,
            generated_at: new Date().toISOString(),
            sync_completed_at: new Date().toISOString()
          })
          .eq('id', weeklyCycleId);

        toast.success('✨ Your rituals have been created!');
        navigate('/rituals');
      } else {
        // Waiting for partner
        toast.success('Canvas saved! Waiting for your partner...');
        navigate('/home');
      }
    } catch (error) {
      console.error('Error generating rituals:', error);
      toast.error('Failed to generate rituals');
    } finally {
      setIsGenerating(false);
    }
  };

  if (loading || !weeklyCycleId) {
    return (
      <StrictMobileViewport>
        <div className="h-full bg-gradient-warm flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Preparing canvas...</p>
        </div>
      </StrictMobileViewport>
    );
  }

  if (isGenerating) {
    return (
      <StrictMobileViewport>
        <div className="h-full bg-gradient-warm flex flex-col items-center justify-center gap-4 px-4">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          >
            <Sparkles className="w-12 h-12 text-primary" />
          </motion.div>
          <div className="text-center space-y-1">
            <h2 className="text-lg font-bold">Weaving Rituals...</h2>
            <p className="text-xs text-muted-foreground">Creating moments from your intentions</p>
          </div>
        </div>
      </StrictMobileViewport>
    );
  }

  return (
    <StrictMobileViewport>
      <MagneticCanvas weeklyCycleId={weeklyCycleId} onComplete={handleComplete} />
    </StrictMobileViewport>
  );
}
