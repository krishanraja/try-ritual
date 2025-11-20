import { useState } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import { Clock, DollarSign, Sparkles, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

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

  const currentCard = cards[currentIndex];

  const handleSwap = () => {
    // In real implementation, this would call AI to generate a new ritual
    setCards([...cards]);
  };

  const handleKeep = () => {
    if (currentIndex < cards.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-25, 25]);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0, 1, 1, 1, 0]);

  return (
    <div className="min-h-screen bg-gradient-calm flex flex-col p-6">
      {/* Header */}
      <div className="max-w-md mx-auto w-full py-4">
        <h1 className="text-3xl font-bold text-center text-foreground mb-2">
          Your Weekly Rituals
        </h1>
        <p className="text-center text-muted-foreground">
          Swipe to keep or swap rituals
        </p>
      </div>

      {/* Card Stack */}
      <div className="flex-1 flex items-center justify-center relative px-4">
        <div className="w-full max-w-md h-[500px] relative">
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
                className="absolute inset-0"
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
          size="lg"
          variant="outline"
          className="flex-1 border-2 border-primary/30 rounded-2xl h-14 text-lg"
        >
          <RotateCcw className="w-5 h-5 mr-2" />
          Swap
        </Button>
        
        <Button
          onClick={handleKeep}
          size="lg"
          className="flex-1 bg-gradient-ritual text-white hover:opacity-90 rounded-2xl h-14 text-lg"
        >
          <Sparkles className="w-5 h-5 mr-2" />
          Keep
        </Button>
      </div>

      {/* Progress */}
      <div className="max-w-md mx-auto w-full text-center pt-4 text-sm text-muted-foreground">
        {currentIndex + 1} of {cards.length} rituals
      </div>
    </div>
  );
};

export default RitualCards;
