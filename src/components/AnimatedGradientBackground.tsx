import { motion } from 'framer-motion';

interface AnimatedGradientBackgroundProps {
  variant?: 'warm' | 'calm' | 'ritual';
  className?: string;
}

export function AnimatedGradientBackground({ 
  variant = 'warm',
  className = ''
}: AnimatedGradientBackgroundProps) {
  const gradients = {
    warm: {
      blob1: 'bg-purple-light',
      blob2: 'bg-gold-light',
      blob3: 'bg-teal-light',
    },
    calm: {
      blob1: 'bg-teal-light',
      blob2: 'bg-purple-light',
      blob3: 'bg-muted',
    },
    ritual: {
      blob1: 'bg-teal',
      blob2: 'bg-purple',
      blob3: 'bg-gold',
    },
  };

  const colors = gradients[variant];

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      {/* Base gradient */}
      <div className="absolute inset-0 bg-gradient-calm" />
      
      {/* Animated blob 1 - top right */}
      <motion.div
        className={`absolute -top-20 -right-20 w-80 h-80 rounded-full ${colors.blob1} opacity-40 blur-3xl`}
        animate={{
          x: [0, 30, -20, 0],
          y: [0, -20, 30, 0],
          scale: [1, 1.1, 0.95, 1],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
      
      {/* Animated blob 2 - bottom left */}
      <motion.div
        className={`absolute -bottom-32 -left-32 w-96 h-96 rounded-full ${colors.blob2} opacity-30 blur-3xl`}
        animate={{
          x: [0, -40, 20, 0],
          y: [0, 40, -20, 0],
          scale: [1, 0.9, 1.1, 1],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
      
      {/* Animated blob 3 - center */}
      <motion.div
        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full ${colors.blob3} opacity-20 blur-3xl`}
        animate={{
          x: [0, 50, -30, 0],
          y: [0, -30, 50, 0],
          scale: [1, 1.2, 0.8, 1],
        }}
        transition={{
          duration: 30,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
    </div>
  );
}
