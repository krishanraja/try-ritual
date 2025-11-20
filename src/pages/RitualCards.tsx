import { useState, useEffect } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import { Clock, DollarSign, Sparkles, RotateCcw, Share2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ViewCoupleCodeDialog } from "@/components/ViewCoupleCodeDialog";
import { JoinCoupleDialog } from "@/components/JoinCoupleDialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import ritualLogo from "@/assets/ritual-logo.png";

const MOCK_RITUALS = [
  {
    id: 1,
    title: "Sunset Picnic at the Park",
    category: "Connection",
    description: "Pack your favorite snacks and find a cozy spot to watch the sunset together. Bring a blanket and maybe a portable speaker for soft music.",
    time_estimate: "2 hours",
    budget_band: "$",
  },
  {
    id: 2,
    title: "Morning Coffee & Journaling",
    category: "Rest",
    description: "Start your day together with coffee and 15 minutes of quiet journaling. Share one insight each before continuing your day.",
    time_estimate: "30 min",
    budget_band: "Free",
  },
  {
    id: 3,
    title: "Try a New Recipe Together",
    category: "Fun",
    description: "Pick a cuisine neither of you has cooked before. Make it a mini competition or a collaborative adventure.",
    time_estimate: "1.5 hours",
    budget_band: "$$",
  },
  {
    id: 4,
    title: "Evening Walk & Stargazing",
    category: "Exploration",
    description: "Take a walk to somewhere you haven't been before in your neighborhood. Bring a blanket and spend 20 minutes looking at the stars.",
    time_estimate: "1 hour",
    budget_band: "Free",
  },
];

const RitualCards = () => {
  const [cards, setCards] = useState(MOCK_RITUALS);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [couple, setCouple] = useState<any>(null);
  const [showViewCode, setShowViewCode] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [swapping, setSwapping] = useState(false);
  const [weeklyInputs, setWeeklyInputs] = useState<any>(null);
  const navigate = useNavigate();

  const currentCard = cards[currentIndex];

  // Fetch couple and rituals
  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          toast.error("Please sign in first");
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

        const { data: cycle } = await supabase
          .from('weekly_cycles')
          .select('*')
          .eq('couple_id', coupleData.id)
          .eq('week_start_date', weekStart.toISOString().split('T')[0])
          .maybeSingle();

        if (cycle?.synthesized_output) {
          setCards(cycle.synthesized_output as any[]);
          setWeeklyInputs(cycle);
        } else if (cycle) {
          // Check if waiting for partner
          const hasPartnerOne = !!cycle.partner_one_input;
          const hasPartnerTwo = !!cycle.partner_two_input;
          
          if (hasPartnerOne && hasPartnerTwo) {
            toast.info("Rituals are being generated...");
          } else {
            const isPartnerOne = coupleData.partner_one === user.id;
            const userSubmitted = isPartnerOne ? hasPartnerOne : hasPartnerTwo;
            
            if (userSubmitted) {
              toast.info("Waiting for your partner to submit their input...");
            } else {
              toast.info("Submit your weekly input to get started!");
            }
          }
          navigate("/input");
        } else {
          toast.info("No rituals for this week yet. Submit your weekly inputs!");
          navigate("/input");
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load rituals");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  const handleSwap = async () => {
    if (!weeklyInputs || swapping) return;
    
    setSwapping(true);
    try {
      const { data, error } = await supabase.functions.invoke('synthesize-rituals', {
        body: {
          action: 'swap',
          weeklyInputs: {
            currentRitual: currentCard,
            inputs: {
              partner_one_input: weeklyInputs.partner_one_input,
              partner_two_input: weeklyInputs.partner_two_input,
            }
          }
        }
      });

      if (error) throw error;

      if (data.error) {
        if (data.error.includes('rate limit')) {
          toast.error("Too many requests. Please wait a moment and try again.");
        } else if (data.error.includes('credits')) {
          toast.error("AI credits depleted. Please add credits to continue.");
        } else {
          toast.error(data.error);
        }
        return;
      }

      const newCards = [...cards];
      newCards[currentIndex] = { ...data.ritual, id: Date.now() };
      setCards(newCards);
      toast.success("New ritual generated!");
    } catch (error: any) {
      console.error("Swap error:", error);
      toast.error("Failed to generate new ritual");
    } finally {
      setSwapping(false);
    }
  };

  const handleKeep = () => {
    if (currentIndex < cards.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-25, 25]);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0, 1, 1, 1, 0]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-calm flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your rituals...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-warm flex flex-col">
      {/* Professional Header */}
      <header className="w-full px-6 py-4 flex items-center justify-between bg-white/80 backdrop-blur-sm border-b border-border/30">
        <div className="flex items-center gap-3">
          <img src={ritualLogo} alt="Ritual" className="h-8" />
          <span className="text-sm font-medium text-muted-foreground">Your Rituals</span>
        </div>
        <div className="flex items-center gap-2">
          {couple && (
            <>
              <Button
                onClick={() => setShowJoin(true)}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <UserPlus className="w-4 h-4" />
                Join
              </Button>
              <Button
                onClick={() => setShowViewCode(true)}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <Share2 className="w-4 h-4" />
              Share
            </Button>
            </>
          )}
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 flex flex-col p-6">
        <div className="max-w-md mx-auto w-full py-4 mb-4">
          <p className="text-center text-muted-foreground">
            Swipe to keep or swap rituals
          </p>
        </div>

        {/* Card Stack */}
        <div className="flex-1 flex items-center justify-center relative px-4">
        <div className="w-full max-w-md h-[500px] relative">
          {/* Background stacked cards */}
          {cards.slice(currentIndex + 1, currentIndex + 3).map((ritual, index) => (
            <div
              key={ritual.id}
              className="absolute inset-0 pointer-events-none"
              style={{
                transform: `translateY(${(index + 1) * 12}px) scale(${1 - (index + 1) * 0.03})`,
                opacity: 0.5 - index * 0.2,
                zIndex: -(index + 1)
              }}
            >
              <Card className="h-full bg-card rounded-3xl shadow-card border-none p-8" />
            </div>
          ))}
          
          <AnimatePresence mode="wait">
            {currentCard && (
              <motion.div
                key={currentCard.id}
                style={{
                  x,
                  rotate,
                }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                onDragEnd={(_, info) => {
                  if (Math.abs(info.offset.x) > 100) {
                    if (info.offset.x > 0) {
                      handleKeep();
                    } else {
                      handleSwap();
                    }
                  }
                }}
                className="absolute inset-0 z-10"
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="h-full bg-card rounded-3xl shadow-card border-none p-8 flex flex-col">
                  {/* Category Badge */}
                  <div className="inline-flex items-center gap-2 self-start mb-4">
                    <div className="w-2 h-2 rounded-full bg-gradient-ritual" />
                    <span className="text-sm font-medium text-primary">
                      {currentCard.category}
                    </span>
                  </div>

                  {/* Title */}
                  <h2 className="text-2xl font-bold text-foreground mb-4">
                    {currentCard.title}
                  </h2>

                  {/* Description */}
                  <p className="text-muted-foreground flex-1 leading-relaxed">
                    {currentCard.description}
                  </p>

                  {/* Meta Info */}
                  <div className="flex gap-4 mt-6 pt-6 border-t border-border">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      {currentCard.time_estimate}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <DollarSign className="w-4 h-4" />
                      {currentCard.budget_band}
                    </div>
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="max-w-md mx-auto w-full flex gap-4 pt-6">
        <Button
          onClick={handleSwap}
          disabled={swapping}
          size="lg"
          variant="outline"
          className="flex-1 border-2 border-primary/30 rounded-2xl h-14 text-lg disabled:opacity-50"
        >
          <RotateCcw className={`w-5 h-5 mr-2 ${swapping ? 'animate-spin' : ''}`} />
          {swapping ? "Generating..." : "Swap"}
        </Button>
        
        <Button
          onClick={handleKeep}
          disabled={swapping}
          size="lg"
          className="flex-1 bg-gradient-ritual text-white hover:opacity-90 rounded-2xl h-14 text-lg disabled:opacity-50"
        >
          <Sparkles className="w-5 h-5 mr-2" />
          Keep
        </Button>
      </div>

      {/* Progress */}
      <div className="max-w-md mx-auto w-full text-center pt-4 text-sm text-muted-foreground">
        {currentIndex + 1} of {cards.length} rituals
      </div>
      
      {couple && (
        <>
          <ViewCoupleCodeDialog 
            open={showViewCode} 
            onOpenChange={setShowViewCode} 
            coupleCode={couple.couple_code} 
          />
          <JoinCoupleDialog 
            open={showJoin} 
            onOpenChange={setShowJoin}
          />
        </>
      )}
      </div>
    </div>
  );
};

export default RitualCards;
