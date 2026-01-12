/**
 * GeneratingPhase Component
 * 
 * Shows loading spinner while rituals are being generated.
 * Includes retry button for failed generations.
 * 
 * @created 2025-12-26
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, AlertCircle, Clock, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CycleStatus } from '@/types/database';
import ritualIcon from '@/assets/ritual-icon.png';

interface GeneratingPhaseProps {
  status: CycleStatus;
  onRetry: () => Promise<void>;
  error: string | null;
}

export function GeneratingPhase({ status, onRetry, error }: GeneratingPhaseProps) {
  const [isRetrying, setIsRetrying] = useState(false);
  
  const isFailed = status === 'generation_failed' || !!error;
  
  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      await onRetry();
    } finally {
      setIsRetrying(false);
    }
  };
  
  return (
    <div className="h-full flex flex-col items-center justify-center px-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center space-y-6 max-w-sm"
      >
        {!isFailed ? (
          <>
            {/* Rotating icon animation */}
            <div className="relative flex items-center justify-center mb-2">
              <motion.div
                className="absolute w-28 h-28 rounded-full"
                style={{
                  background: 'conic-gradient(from 0deg, hsl(175 65% 42%), hsl(270 55% 55%), hsl(175 65% 42%))',
                  opacity: 0.25,
                }}
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
              />
              
              <motion.div
                className="relative w-24 h-24 rounded-full bg-gradient-to-br from-primary/10 to-purple-200/20 flex items-center justify-center"
                animate={{
                  boxShadow: [
                    '0 0 0 0 hsl(175 65% 42% / 0)',
                    '0 0 20px 8px hsl(175 65% 42% / 0.2)',
                    '0 0 0 0 hsl(175 65% 42% / 0)',
                  ],
                }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              >
                <motion.img
                  src={ritualIcon}
                  alt="Generating"
                  className="w-16 h-16 object-contain"
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                />
              </motion.div>
            </div>
            
            <div>
              <h2 className="text-2xl font-bold mb-2">Creating Your Rituals</h2>
              <p className="text-muted-foreground">
                Crafting personalized experiences based on both your preferences...
              </p>
            </div>
            
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>This usually takes 10-20 seconds</span>
            </div>
          </>
        ) : (
          <>
            <div className="w-20 h-20 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="w-10 h-10 text-destructive" />
            </div>
            
            <div>
              <h2 className="text-2xl font-bold mb-2">Taking Longer Than Expected</h2>
              <p className="text-muted-foreground text-sm">
                {error || "Ritual generation is taking longer than usual. Click 'Try Again' to check, or contact support if this persists."}
              </p>
            </div>
          </>
        )}
        
        <div className="space-y-3 pt-4">
          <Button
            onClick={handleRetry}
            disabled={isRetrying}
            variant={isFailed ? "default" : "outline"}
            className={isFailed ? "w-full bg-gradient-to-r from-primary to-purple-500" : "w-full"}
          >
            {isRetrying ? (
              <span className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" />
                Checking...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4" />
                {isFailed ? 'Try Again' : 'Refresh'}
              </span>
            )}
          </Button>
          
          {!isFailed && (
            <p className="text-xs text-muted-foreground">
              Rituals will appear automatically when ready.
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
}

