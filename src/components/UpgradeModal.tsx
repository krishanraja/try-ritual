import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Camera, Repeat, Bell, Star, Heart, TrendingUp, Gift } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { PREMIUM_PRICE } from '@/hooks/usePremium';
import { PromoCodeInput } from '@/components/PromoCodeInput';

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  highlightFeature?: 'rituals' | 'swaps' | 'photos' | 'nudges' | 'streaks' | 'surprise';
}

const features = [
  {
    id: 'rituals',
    icon: Sparkles,
    title: '5 Weekly Rituals',
    description: 'Get the full set of personalized ritual options each week',
  },
  {
    id: 'surprise',
    icon: Gift,
    title: 'Monthly Surprise Rituals',
    description: 'Get a special surprise ritual delivered each month',
  },
  {
    id: 'swaps',
    icon: Repeat,
    title: 'Unlimited Swaps',
    description: 'Don\'t love a ritual? Swap it for something new',
  },
  {
    id: 'photos',
    icon: Camera,
    title: 'Photo Memories',
    description: 'Capture and save photos from your shared moments',
  },
  {
    id: 'nudges',
    icon: Bell,
    title: 'Unlimited Nudges',
    description: 'Send gentle reminders whenever you want',
  },
  {
    id: 'streaks',
    icon: TrendingUp,
    title: 'Advanced Insights',
    description: 'See your relationship patterns and progress',
  },
];

// Valid promo codes (client-side validation for UX)
const VALID_PROMO_CODES = ['GETINVOLVED', '3MONTHS'];

export function UpgradeModal({ open, onClose, highlightFeature }: UpgradeModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [promoCode, setPromoCode] = useState('');
  const [promoValid, setPromoValid] = useState<boolean | null>(null);

  const handlePromoChange = (code: string) => {
    setPromoCode(code);
    if (code.length === 0) {
      setPromoValid(null);
    } else if (VALID_PROMO_CODES.includes(code.toUpperCase())) {
      setPromoValid(true);
    } else if (code.length >= 3) {
      setPromoValid(false);
    } else {
      setPromoValid(null);
    }
  };

  const handleUpgrade = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('create-checkout', {
        body: { promo_code: promoCode || undefined }
      });

      if (fnError) throw fnError;
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (err) {
      console.error('Error creating checkout:', err);
      setError('Failed to start checkout. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md bg-card rounded-2xl shadow-xl border overflow-hidden max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="relative bg-gradient-ritual p-6 text-white text-center">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-white/70 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-16 h-16 mx-auto mb-3 bg-white/20 rounded-full flex items-center justify-center"
            >
              <Heart className="w-8 h-8" fill="currentColor" />
            </motion.div>
            <h2 className="text-2xl font-bold mb-1">Unlock the Full Experience</h2>
            <p className="text-white/80 text-sm">
              One subscription covers both partners
            </p>
          </div>

          {/* Features */}
          <div className="p-4 space-y-3">
            {features.map((feature) => {
              const Icon = feature.icon;
              const isHighlighted = highlightFeature === feature.id;
              
              return (
                <motion.div
                  key={feature.id}
                  initial={isHighlighted ? { scale: 1.02 } : {}}
                  animate={isHighlighted ? { scale: [1.02, 1, 1.02] } : {}}
                  transition={{ duration: 2, repeat: isHighlighted ? Infinity : 0 }}
                  className={`flex items-start gap-3 p-3 rounded-xl transition-colors ${
                    isHighlighted 
                      ? 'bg-primary/10 border border-primary/30' 
                      : 'bg-muted/30'
                  }`}
                >
                  <div className={`p-2 rounded-lg ${
                    isHighlighted ? 'bg-primary text-white' : 'bg-muted'
                  }`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm">{feature.title}</h3>
                    <p className="text-xs text-muted-foreground">{feature.description}</p>
                  </div>
                  {isHighlighted && (
                    <Star className="w-4 h-4 text-primary flex-shrink-0" fill="currentColor" />
                  )}
                </motion.div>
              );
            })}
          </div>

          {/* Promo Code */}
          <div className="px-4">
            <PromoCodeInput
              value={promoCode}
              onChange={handlePromoChange}
              isValid={promoValid}
            />
          </div>

          {/* CTA */}
          <div className="p-4 pt-3 space-y-3">
            {error && (
              <p className="text-sm text-destructive text-center">{error}</p>
            )}
            <Button
              onClick={handleUpgrade}
              disabled={loading}
              className="w-full h-12 bg-gradient-ritual text-white text-lg font-semibold hover:opacity-90"
            >
              {loading ? 'Loading...' : promoValid ? 'Continue with Code' : `Upgrade for ${PREMIUM_PRICE}`}
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              Cancel anytime. Your rituals, your way.
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
