import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { StrictMobileViewport } from '@/components/StrictMobileViewport';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';

export const SynthesisAnimation = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
      
      setTimeout(() => {
        navigate('/rituals');
      }, 1000);
    }, 2500);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <StrictMobileViewport>
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
          <Sparkles className="w-16 h-16 text-primary" />
        </motion.div>
        
        <div className="text-center space-y-2">
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-xl font-bold"
          >
            Weaving your desires...
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-sm text-muted-foreground"
          >
            Creating rituals from your combined vibes
          </motion.p>
        </div>
      </div>
    </StrictMobileViewport>
  );
};
