import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Heart } from 'lucide-react';
import confetti from 'canvas-confetti';

interface CelebrationScreenProps {
  onComplete: () => void;
  message?: string;
}

export const CelebrationScreen = ({ 
  onComplete, 
  message = "You're in sync! 🎉" 
}: CelebrationScreenProps) => {
  useEffect(() => {
    // Trigger confetti
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });

    // Auto-transition after animation
    const timer = setTimeout(() => {
      onComplete();
    }, 3000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="h-full bg-gradient-warm flex flex-col items-center justify-center gap-6 px-6">
      <motion.div
        animate={{ 
          rotate: 360,
          scale: [1, 1.2, 1]
        }}
        transition={{ 
          rotate: { duration: 2, repeat: Infinity, ease: 'linear' },
          scale: { duration: 1.5, repeat: Infinity }
        }}
      >
        <Sparkles className="w-20 h-20 text-primary" />
      </motion.div>
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-center space-y-2"
      >
        <h2 className="text-2xl font-bold">{message}</h2>
        <p className="text-sm text-muted-foreground">
          Creating your perfect rituals...
        </p>
      </motion.div>

      <motion.div
        animate={{ 
          scale: [1, 1.1, 1]
        }}
        transition={{ 
          duration: 1,
          repeat: Infinity,
          ease: 'easeInOut'
        }}
      >
        <Heart className="w-12 h-12 text-primary" fill="currentColor" />
      </motion.div>
    </div>
  );
};
