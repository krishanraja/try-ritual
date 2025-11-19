import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";

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

  const currentQuestion = QUESTIONS[currentStep];
  const isLastQuestion = currentStep === QUESTIONS.length - 1;

  const handleAnswer = (value: any) => {
    setAnswers({ ...answers, [currentQuestion.id]: value });
  };

  const handleNext = () => {
    if (!answers[currentQuestion.id]) return;
    
    if (isLastQuestion) {
      // Submit answers
      console.log("Submitted answers:", answers);
      // TODO: Navigate to waiting screen
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
          disabled={!answers[currentQuestion.id]}
          size="lg"
          className="flex-1 bg-gradient-ritual text-white hover:opacity-90 rounded-2xl h-14 text-lg"
        >
          {isLastQuestion ? "Submit" : "Next"}
          {!isLastQuestion && <ChevronRight className="w-5 h-5 ml-2" />}
        </Button>
      </div>
    </div>
  );
};

export default WeeklyInput;
