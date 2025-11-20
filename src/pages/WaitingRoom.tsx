import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Heart, Sparkles, Users, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ViewCoupleCodeDialog } from "@/components/ViewCoupleCodeDialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ritualLogo from "@/assets/ritual-logo.png";
import confetti from "canvas-confetti";

const WaitingRoom = () => {
  const [couple, setCouple] = useState<any>(null);
  const [cycle, setCycle] = useState<any>(null);
  const [showViewCode, setShowViewCode] = useState(false);
  const [bothSubmitted, setBothSubmitted] = useState(false);
  const [generatingRituals, setGeneratingRituals] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      // Get couple
      const { data: coupleData } = await supabase
        .from('couples')
        .select('*')
        .or(`partner_one.eq.${user.id},partner_two.eq.${user.id}`)
        .maybeSingle();

      if (!coupleData) {
        toast.error("Please create or join a couple first");
        navigate("/");
        return;
      }

      setCouple(coupleData);

      // Get current week's cycle
      const weekStart = new Date();
      weekStart.setHours(0, 0, 0, 0);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());

      const { data: cycleData } = await supabase
        .from('weekly_cycles')
        .select('*')
        .eq('couple_id', coupleData.id)
        .eq('week_start_date', weekStart.toISOString().split('T')[0])
        .maybeSingle();

      if (cycleData) {
        setCycle(cycleData);
        const bothDone = !!(cycleData.partner_one_input && cycleData.partner_two_input);
        setBothSubmitted(bothDone);

        // If rituals already exist, go to rituals page
        if (cycleData.synthesized_output) {
          navigate("/rituals");
          return;
        }

        // If both submitted but no rituals yet, trigger generation
        if (bothDone && !cycleData.synthesized_output) {
          triggerRitualGeneration(cycleData, coupleData);
        }
      }
    };

    fetchData();
  }, [navigate]);

  const triggerRitualGeneration = async (cycleData: any, coupleData: any) => {
    setGeneratingRituals(true);
    
    // Celebration confetti
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });

    toast.success("Both partners submitted! Generating your rituals...", { 
      duration: 5000,
      icon: "🎉" 
    });

    try {
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 45000)
      );

      const invokePromise = supabase.functions.invoke('synthesize-rituals', {
        body: {
          partnerOneInput: cycleData.partner_one_input,
          partnerTwoInput: cycleData.partner_two_input,
          coupleId: coupleData.id
        }
      });

      const { data: synthesisData, error: synthesisError } = await Promise.race([
        invokePromise,
        timeoutPromise
      ]) as any;

      if (synthesisError) throw synthesisError;

      if (synthesisData?.error) {
        toast.error(synthesisData.error);
        return;
      }

      // Save synthesized rituals
      await supabase
        .from('weekly_cycles')
        .update({
          synthesized_output: synthesisData.rituals,
          generated_at: new Date().toISOString(),
        })
        .eq('id', cycleData.id);

      // More confetti!
      confetti({
        particleCount: 200,
        spread: 100,
        origin: { y: 0.6 }
      });

      toast.success("Your weekly rituals are ready! 🎉", { duration: 3000 });
      
      setTimeout(() => {
        navigate("/rituals");
      }, 2000);
    } catch (error: any) {
      console.error('Generation error:', error);
      toast.error("Failed to generate rituals. Please try refreshing.");
      setGeneratingRituals(false);
    }
  };

  // Real-time subscription for partner submission
  useEffect(() => {
    if (!cycle) return;

    const channel = supabase
      .channel('weekly-cycle-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'weekly_cycles',
          filter: `id=eq.${cycle.id}`
        },
        (payload) => {
          const updated = payload.new as any;
          setCycle(updated);
          
          const bothDone = !!(updated.partner_one_input && updated.partner_two_input);
          
          if (bothDone && !bothSubmitted && !updated.synthesized_output) {
            setBothSubmitted(true);
            triggerRitualGeneration(updated, couple);
          } else if (updated.synthesized_output) {
            navigate("/rituals");
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [cycle, bothSubmitted, couple, navigate]);

  if (!couple || !cycle) {
    return (
      <div className="min-h-screen bg-gradient-calm flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-calm flex flex-col">
      {/* Header */}
      <header className="w-full px-6 py-4 flex items-center justify-between bg-white/80 backdrop-blur-sm border-b border-border/30">
        <div className="flex items-center gap-3">
          <img src={ritualLogo} alt="Ritual" className="h-8" />
          <span className="text-sm font-medium text-muted-foreground">
            {generatingRituals ? "Creating Your Rituals..." : "Waiting Room"}
          </span>
        </div>
        <Button
          onClick={() => setShowViewCode(true)}
          variant="outline"
          size="sm"
          className="gap-2"
        >
          <Share2 className="w-4 h-4" />
          Share Code
        </Button>
      </header>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-lg w-full text-center space-y-8"
        >
          {/* Icon Animation */}
          <motion.div
            animate={generatingRituals ? { 
              scale: [1, 1.2, 1],
              rotate: [0, 360]
            } : {
              scale: [1, 1.1, 1]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="flex justify-center"
          >
            {generatingRituals ? (
              <Sparkles className="w-24 h-24 text-primary" />
            ) : bothSubmitted ? (
              <Heart className="w-24 h-24 text-primary fill-current" />
            ) : (
              <Users className="w-24 h-24 text-primary" />
            )}
          </motion.div>

          {/* Status Message */}
          <div className="space-y-4">
            <h1 className="text-3xl font-bold text-foreground">
              {generatingRituals 
                ? "Creating Your Rituals..."
                : bothSubmitted 
                ? "Both Partners Submitted! 🎉"
                : "Waiting for Your Partner..."}
            </h1>
            
            <p className="text-lg text-muted-foreground">
              {generatingRituals 
                ? "Our AI is crafting personalized rituals just for you two. This magic takes a moment..."
                : bothSubmitted
                ? "Both of you have shared your preferences. We're generating your perfect week together!"
                : "You've submitted your weekly input. We'll notify you when your partner submits theirs!"}
            </p>
          </div>

          {/* Submission Status */}
          <div className="flex gap-4 justify-center items-center">
            <div className="flex flex-col items-center gap-2">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                cycle.partner_one_input 
                  ? 'bg-primary/20 text-primary' 
                  : 'bg-muted text-muted-foreground'
              }`}>
                <Users className="w-8 h-8" />
              </div>
              <span className="text-sm font-medium">Partner 1</span>
              {cycle.partner_one_input && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="text-primary"
                >
                  ✓
                </motion.div>
              )}
            </div>

            <Heart className="w-6 h-6 text-primary" />

            <div className="flex flex-col items-center gap-2">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                cycle.partner_two_input 
                  ? 'bg-primary/20 text-primary' 
                  : 'bg-muted text-muted-foreground'
              }`}>
                <Users className="w-8 h-8" />
              </div>
              <span className="text-sm font-medium">Partner 2</span>
              {cycle.partner_two_input && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="text-primary"
                >
                  ✓
                </motion.div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 justify-center pt-4">
            <Button
              onClick={() => navigate("/")}
              variant="outline"
              size="lg"
            >
              Back to Home
            </Button>
            
            {!bothSubmitted && (
              <Button
                onClick={() => setShowViewCode(true)}
                size="lg"
                className="gap-2"
              >
                <Share2 className="w-4 h-4" />
                Share Code with Partner
              </Button>
            )}
          </div>
        </motion.div>
      </div>

      <ViewCoupleCodeDialog 
        open={showViewCode} 
        onOpenChange={setShowViewCode} 
        coupleCode={couple.couple_code} 
      />
    </div>
  );
};

export default WaitingRoom;
