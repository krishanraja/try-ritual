/**
 * RitualSpinner Component
 * 
 * Branded loading spinner using the Ritual icon with smooth animations.
 * Replaces generic Loader2/Sparkles icons throughout the app.
 * 
 * @created 2025-12-14
 */

import { motion } from 'framer-motion';
import ritualIcon from '@/assets/ritual-icon.png';
import { cn } from '@/lib/utils';

interface RitualSpinnerProps {
  /** Size of the spinner */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  /** Optional additional class names */
  className?: string;
  /** Show loading text below spinner */
  showText?: boolean;
  /** Custom loading text */
  text?: string;
}

const sizeConfig = {
  xs: { icon: 'w-6 h-6', wrapper: 'w-8 h-8' },
  sm: { icon: 'w-8 h-8', wrapper: 'w-10 h-10' },
  md: { icon: 'w-12 h-12', wrapper: 'w-16 h-16' },
  lg: { icon: 'w-16 h-16', wrapper: 'w-20 h-20' },
  xl: { icon: 'w-20 h-20', wrapper: 'w-24 h-24' },
};

export function RitualSpinner({ 
  size = 'md', 
  className,
  showText = false,
  text = 'Loading...'
}: RitualSpinnerProps) {
  const config = sizeConfig[size];
  
  return (
    <div className={cn('flex flex-col items-center gap-3', className)}>
      <div className={cn('relative flex items-center justify-center', config.wrapper)}>
        {/* Outer rotating ring */}
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            background: 'conic-gradient(from 0deg, hsl(175 65% 42%), hsl(270 55% 55%), hsl(175 65% 42%))',
            opacity: 0.3,
          }}
          animate={{ rotate: 360 }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
        
        {/* Pulsing glow */}
        <motion.div
          className="absolute inset-1 rounded-full bg-background"
          animate={{
            boxShadow: [
              '0 0 0 0 hsl(175 65% 42% / 0)',
              '0 0 12px 4px hsl(175 65% 42% / 0.3)',
              '0 0 0 0 hsl(175 65% 42% / 0)',
            ],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        
        {/* Icon with subtle scale animation */}
        <motion.img
          src={ritualIcon}
          alt=""
          className={cn('relative z-10 object-contain', config.icon)}
          animate={{
            scale: [1, 1.08, 1],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      </div>
      
      {showText && (
        <motion.p
          className="text-sm text-muted-foreground"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          {text}
        </motion.p>
      )}
    </div>
  );
}

/**
 * Inline version for smaller contexts (buttons, badges)
 */
export function RitualSpinnerInline({ className }: { className?: string }) {
  return (
    <motion.img
      src={ritualIcon}
      alt=""
      className={cn('w-5 h-5 object-contain', className)}
      animate={{ rotate: 360 }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        ease: 'linear',
      }}
    />
  );
}
