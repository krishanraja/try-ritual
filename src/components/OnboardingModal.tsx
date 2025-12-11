import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Sparkles, Calendar, ChevronRight } from 'lucide-react';

interface OnboardingModalProps {
  open: boolean;
  onComplete: () => void;
}

const slides = [
  {
    icon: Heart,
    title: "Share your vibe",
    description: "Tell us what you're in the mood for this week – adventure, relaxation, or something in between.",
    color: "bg-pink-100 text-pink-600"
  },
  {
    icon: Sparkles,
    title: "Get matched rituals",
    description: "Our AI combines both your preferences to suggest activities you'll both love.",
    color: "bg-purple-100 text-purple-600"
  },
  {
    icon: Calendar,
    title: "Build your streak",
    description: "Do them together, track your memories, and watch your connection grow stronger.",
    color: "bg-teal-100 text-teal-600"
  }
];

export const OnboardingModal = ({ open, onComplete }: OnboardingModalProps) => {
  const [currentSlide, setCurrentSlide] = useState(0);

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(prev => prev + 1);
    } else {
      localStorage.setItem('hasSeenOnboarding', 'true');
      onComplete();
    }
  };

  const handleSkip = () => {
    localStorage.setItem('hasSeenOnboarding', 'true');
    onComplete();
  };

  const isLastSlide = currentSlide === slides.length - 1;

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-white rounded-3xl [&>button]:hidden">
        <div className="p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="text-center space-y-6"
            >
              {/* Icon */}
              <div className={`w-20 h-20 mx-auto rounded-full ${slides[currentSlide].color} flex items-center justify-center`}>
                {(() => {
                  const Icon = slides[currentSlide].icon;
                  return <Icon className="w-10 h-10" />;
                })()}
              </div>

              {/* Content */}
              <div className="space-y-3">
                <h2 className="text-2xl font-bold text-foreground">
                  {slides[currentSlide].title}
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  {slides[currentSlide].description}
                </p>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Progress dots */}
          <div className="flex justify-center gap-2 mt-8">
            {slides.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === currentSlide ? 'bg-primary' : 'bg-muted'
                }`}
              />
            ))}
          </div>

          {/* Actions */}
          <div className="mt-8 space-y-3">
            <Button
              onClick={handleNext}
              className="w-full bg-gradient-ritual text-white h-12 rounded-xl"
            >
              {isLastSlide ? "Let's go!" : "Next"}
              {!isLastSlide && <ChevronRight className="w-4 h-4 ml-1" />}
            </Button>
            
            {!isLastSlide && (
              <button
                onClick={handleSkip}
                className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Skip intro
              </button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
