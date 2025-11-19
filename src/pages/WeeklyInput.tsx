import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const QUESTIONS = [
  {
    id: "energy",
    question: "How's your energy this week?",
    type: "choice",
    options: ["Low", "Steady", "High"]
  },
  {
    id: "availability",
    question: "When do you have time?",
    type: "choice",
    options: ["Weekday evenings", "Weekend mornings", "Weekend evenings", "Flexible"]
  },
  {
    id: "budget",
    question: "Budget comfort level?",
    type: "slider",
    min: 0,
    max: 3,
    labels: ["Free", "$", "$$", "$$$"]
  },
  {
    id: "craving",
    question: "What are you craving more of?",
    type: "choice",
    options: ["Connection", "Rest", "Fun", "Exploration", "Comfort", "Intimacy"]
  },
  {
    id: "desire",
    question: "One thing you'd love to do this week?",
    type: "text",
    placeholder: "Something you've been thinking about..."
  }
];

const WeeklyInput = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [direction, setDirection] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const currentQuestion = QUESTIONS[currentStep];
  const isLastQuestion = currentStep === QUESTIONS.length - 1;

  // Handle Enter key press
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey && answers[currentQuestion.id]) {
        handleNext();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentStep, answers]);

  const handleAnswer = (value: any) => {
    const newAnswers = { ...answers, [currentQuestion.id]: value };
    setAnswers(newAnswers);
    
    // Auto-advance for choice questions (not text or slider)
    if (currentQuestion.type === "choice") {
      setTimeout(() => {
        if (isLastQuestion) {
          handleSubmit(newAnswers);
        } else {
          setDirection(1);
          setCurrentStep(currentStep + 1);
        }
      }, 300);
    }
  };

  const handleSubmit = async (finalAnswers = answers) => {
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please sign in first");
        navigate("/auth");
        return;
      }

      // Get user's couple
      const { data: couple, error: coupleError } = await supabase
        .from('couples')
        .select('*')
        .or(`partner_one.eq.${user.id},partner_two.eq.${user.id}`)
        .maybeSingle();

      if (coupleError) throw coupleError;
      if (!couple) {
        toast.error("Please create or join a couple first");
        navigate("/");
        return;
      }

      const isPartnerOne = couple.partner_one === user.id;
      const weekStart = new Date();
      weekStart.setHours(0, 0, 0, 0);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of week (Sunday)

      // Check if there's an existing cycle for this week
      const { data: existingCycle } = await supabase
        .from('weekly_cycles')
        .select('*')
        .eq('couple_id', couple.id)
        .eq('week_start_date', weekStart.toISOString().split('T')[0])
        .maybeSingle();

      const inputData = {
        energy: finalAnswers.energy,
        time: finalAnswers.availability,
        budget: finalAnswers.budget,
        craving: finalAnswers.craving,
        desire: finalAnswers.desire,
      };

      if (existingCycle) {
        // Update existing cycle
        const { error: updateError } = await supabase
          .from('weekly_cycles')
          .update({
            [isPartnerOne ? 'partner_one_input' : 'partner_two_input']: inputData,
            [isPartnerOne ? 'partner_one_submitted_at' : 'partner_two_submitted_at']: new Date().toISOString(),
          })
          .eq('id', existingCycle.id);

        if (updateError) throw updateError;
      } else {
        // Create new cycle
        const { error: insertError } = await supabase
          .from('weekly_cycles')
          .insert({
            couple_id: couple.id,
            week_start_date: weekStart.toISOString().split('T')[0],
            [isPartnerOne ? 'partner_one_input' : 'partner_two_input']: inputData,
            [isPartnerOne ? 'partner_one_submitted_at' : 'partner_two_submitted_at']: new Date().toISOString(),
          });

        if (insertError) throw insertError;
      }

      toast.success("Input saved! Waiting for your partner...");
      navigate("/rituals");
    } catch (error: any) {
      console.error('Submit error:', error);
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleNext = () => {
    if (!answers[currentQuestion.id]) return;
    
    if (isLastQuestion) {
      handleSubmit();
    } else {
      setDirection(1);
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setDirection(-1);
      setCurrentStep(currentStep - 1);
    }
  };

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0
    }),
    center: {
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 300 : -300,
      opacity: 0
    })
  };

  return (
    <div className="min-h-screen bg-gradient-calm flex flex-col p-6">
      {/* Progress */}
      <div className="max-w-md mx-auto w-full space-y-2 mb-8">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Your weekly input</span>
          <span>{currentStep + 1} / {QUESTIONS.length}</span>
        </div>
        <div className="w-full bg-white/50 rounded-full h-2">
          <motion.div
            className="bg-gradient-ritual h-full rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${((currentStep + 1) / QUESTIONS.length) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Question Card */}
      <div className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-md">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentStep}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3 }}
              className="bg-white rounded-3xl shadow-card p-8 space-y-8"
            >
              <h2 className="text-2xl font-bold text-foreground text-center">
                {currentQuestion.question}
              </h2>

              {currentQuestion.type === "choice" && (
                <div className="space-y-3">
                  {currentQuestion.options?.map((option) => (
                    <Button
                      key={option}
                      onClick={() => handleAnswer(option)}
                      variant={answers[currentQuestion.id] === option ? "default" : "outline"}
                      className={`w-full h-14 text-lg rounded-2xl transition-all ${
                        answers[currentQuestion.id] === option
                          ? "bg-gradient-ritual text-white shadow-soft"
                          : "border-2 border-primary/30 hover:bg-lavender-light"
                      }`}
                    >
                      {option}
                    </Button>
                  ))}
                </div>
              )}

              {currentQuestion.type === "slider" && (
                <div className="space-y-6">
                  <Slider
                    value={[answers[currentQuestion.id] ?? 1]}
                    onValueChange={([value]) => handleAnswer(value)}
                    min={currentQuestion.min}
                    max={currentQuestion.max}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-sm text-muted-foreground">
                    {currentQuestion.labels?.map((label) => (
                      <span key={label}>{label}</span>
                    ))}
                  </div>
                </div>
              )}

              {currentQuestion.type === "text" && (
                <Textarea
                  value={answers[currentQuestion.id] ?? ""}
                  onChange={(e) => handleAnswer(e.target.value)}
                  placeholder={currentQuestion.placeholder}
                  className="min-h-32 rounded-2xl border-2 border-primary/30 text-lg resize-none"
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Navigation */}
      <div className="max-w-md mx-auto w-full flex gap-3 pt-6">
        {currentStep > 0 && (
          <Button
            onClick={handleBack}
            variant="outline"
            size="lg"
            className="border-2 border-primary/30 rounded-2xl"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
        )}
        
        <Button
          onClick={handleNext}
          disabled={!answers[currentQuestion.id] || submitting}
          size="lg"
          className="flex-1 bg-gradient-ritual text-white hover:opacity-90 rounded-2xl h-14 text-lg"
        >
          {submitting ? "Saving..." : isLastQuestion ? "Submit" : "Next"}
          {!isLastQuestion && !submitting && <ChevronRight className="w-5 h-5 ml-2" />}
        </Button>
      </div>
    </div>
  );
};

export default WeeklyInput;
