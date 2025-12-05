import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Ticket, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface PromoCodeInputProps {
  value: string;
  onChange: (code: string) => void;
  isValid?: boolean | null;
  isValidating?: boolean;
}

export function PromoCodeInput({ value, onChange, isValid, isValidating }: PromoCodeInputProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="w-full">
      {!isExpanded ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(true)}
          className="text-muted-foreground hover:text-foreground"
        >
          <Ticket className="w-4 h-4 mr-2" />
          Have a promo code?
        </Button>
      ) : (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="space-y-2"
        >
          <label className="text-sm text-muted-foreground">Promo Code</label>
          <div className="relative">
            <Input
              value={value}
              onChange={(e) => onChange(e.target.value.toUpperCase())}
              placeholder="Enter code"
              className="pr-10 uppercase"
              maxLength={20}
            />
            <AnimatePresence>
              {isValidating && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  <div className="w-4 h-4 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
                </motion.div>
              )}
              {!isValidating && isValid === true && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  <Check className="w-4 h-4 text-emerald-500" />
                </motion.div>
              )}
              {!isValidating && isValid === false && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  <X className="w-4 h-4 text-destructive" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          {isValid === true && (
            <p className="text-xs text-emerald-500">Promo code applied!</p>
          )}
          {isValid === false && value.length > 0 && (
            <p className="text-xs text-destructive">Invalid promo code</p>
          )}
        </motion.div>
      )}
    </div>
  );
}
