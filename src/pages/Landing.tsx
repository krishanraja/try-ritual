import { useNavigate } from 'react-router-dom';
import { useCouple } from '@/contexts/CoupleContext';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { motion } from 'framer-motion';
import { Heart, Calendar, Sparkles, X } from 'lucide-react';
import { RitualLogo } from '@/components/RitualLogo';
import { MagneticCanvas } from '@/components/MagneticCanvas';
import { RitualCarousel } from '@/components/RitualCarousel';
import { SAMPLE_RITUALS } from '@/data/sampleRituals';
import { useState } from 'react';

export default function Landing() {
  const navigate = useNavigate();
  const { user } = useCouple();
  const [showSignupPrompt, setShowSignupPrompt] = useState(false);
  const [showAuthBanner, setShowAuthBanner] = useState(true);

  const handleDemoComplete = () => {
    setShowSignupPrompt(true);
  };

  return (
    <div className="min-h-[100dvh] bg-gradient-warm overflow-y-auto">
      {/* Authenticated User Banner */}
      {user && showAuthBanner && (
        <div className="sticky top-0 z-50 bg-primary/10 backdrop-blur-sm border-b border-primary/20">
          <div className="px-4 py-2 flex items-center justify-between">
            <p className="text-xs text-foreground">
              You're signed in! <button onClick={() => navigate('/home')} className="underline font-semibold">Go to Dashboard →</button>
            </p>
            <button onClick={() => setShowAuthBanner(false)} className="text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <div className="px-6 md:px-12 py-12">
        <main className="text-center space-y-16 max-w-4xl w-full mx-auto">
        {/* Logo Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <RitualLogo size="xl" className="max-w-[280px] mx-auto mb-12" />
        </motion.div>
        
        {/* Compact Hero Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="space-y-4"
        >
          <h1 className="text-3xl md:text-5xl font-bold text-foreground leading-tight">
            Create Rituals Together
          </h1>
          <p className="text-base md:text-lg text-foreground/80 max-w-2xl mx-auto leading-relaxed">
            Build weekly rituals with someone special. Both contribute, AI synthesizes your perfect week together.
          </p>
        </motion.div>

        {/* Interactive Canvas Demo */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="relative"
        >
          <div className="mb-4">
            <h2 className="text-2xl font-bold text-foreground mb-2">Try It Now</h2>
            <p className="text-sm text-foreground/70">Drag the tokens to see how it works</p>
          </div>
          <div className="relative h-[400px] md:h-[500px] rounded-3xl overflow-hidden shadow-2xl border border-border/20">
            <MagneticCanvas 
              demoMode 
              onComplete={() => {}}
              onDemoComplete={handleDemoComplete}
            />
          </div>
        </motion.div>

        {/* Sample Rituals Carousel */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="space-y-4"
        >
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-foreground mb-2">What Rituals Look Like</h2>
            <p className="text-sm text-foreground/70">Swipe to explore sample rituals</p>
          </div>
          <RitualCarousel 
            rituals={SAMPLE_RITUALS} 
            completions={new Set()}
            onComplete={() => {}}
            variant="compact"
            isShowingSamples={true}
          />
        </motion.div>

        {/* Compact Feature Pills */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="grid md:grid-cols-3 gap-4"
        >
          <div className="bg-card rounded-xl p-4 shadow-card space-y-2">
            <div className="w-12 h-12 mx-auto rounded-full bg-primary flex items-center justify-center">
              <Heart className="w-6 h-6 text-primary-foreground" />
            </div>
            <h3 className="font-semibold text-base text-card-foreground">Connect</h3>
            <p className="text-xs text-muted-foreground">
              Share a code together
            </p>
          </div>

          <div className="bg-card rounded-xl p-4 shadow-card space-y-2">
            <div className="w-12 h-12 mx-auto rounded-full bg-secondary flex items-center justify-center">
              <Calendar className="w-6 h-6 text-secondary-foreground" />
            </div>
            <h3 className="font-semibold text-base text-card-foreground">Contribute</h3>
            <p className="text-xs text-muted-foreground">
              Both share weekly wishes
            </p>
          </div>

          <div className="bg-card rounded-xl p-4 shadow-card space-y-2">
            <div className="w-12 h-12 mx-auto rounded-full bg-accent flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-accent-foreground" />
            </div>
            <h3 className="font-semibold text-base text-card-foreground">Experience</h3>
            <p className="text-xs text-muted-foreground">
              AI crafts your rituals
            </p>
          </div>
        </motion.div>

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.0 }}
          className="space-y-4 pb-12"
        >
          <Button 
            onClick={() => navigate('/auth')}
            size="lg" 
            className="w-full md:w-auto bg-primary text-primary-foreground hover:bg-primary/90 h-14 text-lg px-12 rounded-xl shadow-soft"
          >
            Get Started
          </Button>

          <p className="text-sm text-foreground/60">
            Free to start • No credit card required
          </p>
        </motion.div>
        </main>
      </div>

      {/* Signup Prompt Dialog */}
      <Dialog open={showSignupPrompt} onOpenChange={setShowSignupPrompt}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl">✨ Ready to Create Your Rituals?</DialogTitle>
            <DialogDescription className="text-base pt-2">
              Sign up to save your preferences and generate personalized rituals with your partner.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 pt-4">
            <Button 
              onClick={() => navigate('/auth')}
              size="lg"
              className="w-full"
            >
              Sign Up Now
            </Button>
            <Button 
              onClick={() => setShowSignupPrompt(false)}
              variant="outline"
              size="lg"
              className="w-full"
            >
              Keep Exploring
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
