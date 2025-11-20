import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCouple } from '@/contexts/CoupleContext';
import { supabase } from '@/integrations/supabase/client';
import { StrictMobileViewport } from '@/components/StrictMobileViewport';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { SynthesisAnimation } from '@/components/SynthesisAnimation';

const QUESTIONS = [
  {
    id: 'energy',
    question: 'How\'s your energy this week?',
    options: ['Exhausted', 'Steady', 'Energized', 'Restless']
  },
  {
    id: 'availability',
    question: 'How much time do you have?',
    options: ['30 min', '1 hour', '1-2 hours', '2+ hours']
  },
  {
    id: 'budget',
    question: 'What\'s your budget comfort?',
    options: ['Free', '$', '$$', '$$$']
  },
  {
    id: 'craving',
    question: 'What are you craving?',
    options: ['Connection', 'Adventure', 'Rest', 'Play']
  }
];

export default function QuickInput() {
  const { user, couple, currentCycle, loading } = useCouple();
  const navigate = useNavigate();
  const [weeklyCycleId, setWeeklyCycleId] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState({
    energy: '',
    availability: '',
    budget: '',
    craving: '',
    desire: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSynthesizing, setIsSynthesizing] = useState(false);

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

  const handleAnswer = (value: string) => {
    const key = QUESTIONS[currentStep].id;
    setAnswers(prev => ({ ...prev, [key]: value }));
  };

  const handleNext = () => {
    if (currentStep < QUESTIONS.length) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSubmit = async () => {
    if (!weeklyCycleId || !couple) return;

    setIsSubmitting(true);

    try {
      const isPartnerOne = couple.partner_one === user?.id;
      const updateField = isPartnerOne ? 'partner_one_input' : 'partner_two_input';
      const submittedField = isPartnerOne ? 'partner_one_submitted_at' : 'partner_two_submitted_at';

      await supabase
        .from('weekly_cycles')
        .update({
          [updateField]: answers,
          [submittedField]: new Date().toISOString()
        })
        .eq('id', weeklyCycleId);

      // Check if both partners completed
      const { data: cycle } = await supabase
        .from('weekly_cycles')
        .select('partner_one_input, partner_two_input')
        .eq('id', weeklyCycleId)
        .single();

      const partnerInput = isPartnerOne ? cycle?.partner_two_input : cycle?.partner_one_input;

      if (partnerInput) {
        // Both completed - trigger synthesis
        setIsSynthesizing(true);

        const { data, error } = await supabase.functions.invoke('synthesize-rituals', {
          body: {
            partnerOneInput: isPartnerOne ? answers : partnerInput,
            partnerTwoInput: isPartnerOne ? partnerInput : answers,
            coupleId: couple.id
          }
        });

        if (error) throw error;

        await supabase
          .from('weekly_cycles')
          .update({
            synthesized_output: { rituals: data.rituals },
            generated_at: new Date().toISOString(),
            sync_completed_at: new Date().toISOString()
          })
          .eq('id', weeklyCycleId);

        // Navigate will happen from SynthesisAnimation
      } else {
        toast.success('Answers saved! Waiting for your partner...');
        navigate('/home');
      }
    } catch (error) {
      console.error('Error submitting answers:', error);
      toast.error('Failed to save answers');
      setIsSubmitting(false);
      setIsSynthesizing(false);
    }
  };

  if (loading || !weeklyCycleId) {
    return (
      <StrictMobileViewport>
        <div className="h-full bg-gradient-warm flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Setting up...</p>
        </div>
      </StrictMobileViewport>
    );
  }

  if (isSynthesizing) {
    return <SynthesisAnimation />;
  }

  const currentQuestion = QUESTIONS[currentStep];
  const isLastQuestion = currentStep === QUESTIONS.length;
  const canProceed = currentStep < QUESTIONS.length 
    ? answers[currentQuestion.id as keyof typeof answers] 
    : answers.desire.trim().length > 0;

  return (
    <StrictMobileViewport>
      <div className="h-full bg-gradient-warm flex flex-col">
        {/* Progress Bar */}
        <div className="flex-none px-6 pt-6 pb-4">
          <div className="flex gap-1">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full transition-all ${
                  i <= currentStep ? 'bg-primary' : 'bg-primary/20'
                }`}
              />
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Question {currentStep + 1} of 5
          </p>
        </div>

        {/* Question Content */}
        <div className="flex-1 px-6 py-8 overflow-y-auto">
          <AnimatePresence mode="wait">
            {currentStep < QUESTIONS.length ? (
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <h2 className="text-2xl font-bold">{currentQuestion.question}</h2>
                <RadioGroup
                  value={answers[currentQuestion.id as keyof typeof answers]}
                  onValueChange={handleAnswer}
                  className="space-y-3"
                >
                  {currentQuestion.options.map((option) => (
                    <div
                      key={option}
                      className="flex items-center space-x-3 bg-white/80 p-4 rounded-xl border-2 border-transparent has-[:checked]:border-primary transition-all"
                    >
                      <RadioGroupItem value={option} id={option} />
                      <Label htmlFor={option} className="flex-1 cursor-pointer text-base">
                        {option}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </motion.div>
            ) : (
              <motion.div
                key="desire"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold">What are you hoping for this week?</h2>
                  <p className="text-sm text-muted-foreground">
                    Be specific or dreamy - whatever feels right
                  </p>
                </div>
                <Textarea
                  value={answers.desire}
                  onChange={(e) => setAnswers(prev => ({ ...prev, desire: e.target.value }))}
                  placeholder="e.g., Try a new neighborhood we've never been to..."
                  className="min-h-32 bg-white/80 border-2 resize-none"
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Navigation */}
        <div className="flex-none p-6 space-y-3">
          <div className="flex gap-3">
            {currentStep > 0 && (
              <Button
                onClick={handleBack}
                variant="outline"
                size="lg"
                className="flex-1"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            )}
            {!isLastQuestion ? (
              <Button
                onClick={handleNext}
                disabled={!canProceed}
                size="lg"
                className="flex-1"
              >
                Next
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={!canProceed || isSubmitting}
                size="lg"
                className="flex-1"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Complete'
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </StrictMobileViewport>
  );
}
