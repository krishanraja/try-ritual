import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCouple } from '@/contexts/CoupleContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { Heart, Sparkles, Share2 } from 'lucide-react';
import { StreakBadge } from '@/components/StreakBadge';
import { RitualLogo } from '@/components/RitualLogo';
import { WaitingForPartner } from '@/components/WaitingForPartner';
import { StrictMobileViewport } from '@/components/StrictMobileViewport';
import { SynthesisAnimation } from '@/components/SynthesisAnimation';

export default function Home() {
  const { user, couple, partnerProfile, currentCycle, loading, createCouple, shareCode, joinCouple } = useCouple();
  const navigate = useNavigate();

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!loading && !user) navigate('/auth');
  }, [user, loading, navigate]);

  // Smart redirect: Auto-navigate to rituals when ready
  useEffect(() => {
    if (currentCycle?.synthesized_output && couple?.partner_two) {
      navigate('/rituals');
    }
  }, [currentCycle?.synthesized_output, couple?.partner_two, navigate]);

  if (loading) {
    return (
      <StrictMobileViewport>
        <div className="h-full bg-gradient-warm flex flex-col items-center justify-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </StrictMobileViewport>
    );
  }

  if (!user) return null;

  if (!couple) {
    return (
      <StrictMobileViewport>
        <div className="h-full bg-gradient-warm flex flex-col items-center justify-center p-4">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-center space-y-6 max-w-sm">
            <RitualLogo size="md" className="mx-auto" />
            <div>
              <h1 className="text-xl font-bold mb-2">Welcome to Ritual</h1>
              <p className="text-sm text-muted-foreground">Create weekly rituals together</p>
            </div>
            <div className="space-y-2">
              <Button onClick={createCouple} className="w-full bg-gradient-ritual text-white h-12 rounded-xl">
                <Heart className="w-4 h-4 mr-2" />Start a Ritual Space
              </Button>
              <Button onClick={joinCouple} variant="outline" className="w-full h-12 rounded-xl">
                I Have a Code
              </Button>
            </div>
          </motion.div>
        </div>
      </StrictMobileViewport>
    );
  }

  // Waiting for partner: INVITE CTA
  if (!couple.partner_two) {
    return (
      <StrictMobileViewport>
        <div className="h-full bg-gradient-warm flex flex-col justify-center px-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-6 max-w-sm mx-auto"
          >
            {/* Hero Message */}
            <div className="text-center space-y-3">
              <div className="w-16 h-16 mx-auto rounded-full bg-gradient-ritual flex items-center justify-center">
                <Heart className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold">Almost There!</h1>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Ritual works best with two people. Invite someone special to create weekly rituals together.
              </p>
            </div>

            {/* Primary CTA */}
            <Button 
              onClick={shareCode} 
              size="lg"
              className="w-full h-14 bg-gradient-ritual text-white rounded-xl text-base"
            >
              <Share2 className="w-5 h-5 mr-2" />
              Invite Your Partner
            </Button>

            {/* Secondary: Preview Samples */}
            <div className="text-center space-y-2">
              <p className="text-xs text-muted-foreground">
                While you wait, see what rituals look like:
              </p>
              <Button 
                onClick={() => navigate('/rituals')} 
                variant="outline"
                className="w-full h-12 rounded-xl"
              >
                Preview Sample Rituals
              </Button>
            </div>
          </motion.div>
        </div>
      </StrictMobileViewport>
    );
  }

  const hasSynthesized = currentCycle?.synthesized_output;
  const hasPartnerOne = !!currentCycle?.partner_one_input;
  const hasPartnerTwo = !!currentCycle?.partner_two_input;
  const userIsPartnerOne = couple.partner_one === user.id;
  const userSubmitted = userIsPartnerOne ? hasPartnerOne : hasPartnerTwo;
  const partnerSubmitted = userIsPartnerOne ? hasPartnerTwo : hasPartnerOne;

  // Synthesis in progress: show animation
  if (userSubmitted && partnerSubmitted && !hasSynthesized) {
    return (
      <StrictMobileViewport>
        <SynthesisAnimation />
      </StrictMobileViewport>
    );
  }

  // User submitted, waiting for partner: show waiting component
  if (userSubmitted && !partnerSubmitted && currentCycle) {
    const partnerName = partnerProfile?.name || 'your partner';
    return (
      <StrictMobileViewport>
        <div className="h-full bg-gradient-warm">
          <WaitingForPartner 
            partnerName={partnerName}
            currentCycleId={currentCycle.id}
            lastNudgedAt={currentCycle.nudged_at}
          />
        </div>
      </StrictMobileViewport>
    );
  }

  return (
    <StrictMobileViewport>
      <div className="h-full bg-gradient-warm flex flex-col">
        {/* Compact Header */}
        <div className="flex-none px-4 pt-4 pb-2">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-xl font-bold">This Week</h1>
            <StreakBadge />
          </div>
        </div>

        {/* Main Content - Centered */}
        <div className="flex-1 px-4 pb-4 flex flex-col justify-center">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
            <Card className="p-6 bg-card/90 backdrop-blur-sm text-center space-y-4">
              <div className="w-12 h-12 mx-auto rounded-full bg-gradient-ritual flex items-center justify-center">
                <Heart className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-base font-bold mb-1">Ready for This Week?</h2>
                <p className="text-xs text-muted-foreground">
                  Share your preferences to create rituals with {partnerProfile?.name || 'your partner'}
                </p>
              </div>
              <Button onClick={() => navigate('/input')} className="w-full bg-gradient-ritual text-white h-12 rounded-xl">
                Start Input
              </Button>
            </Card>
          </motion.div>
        </div>
      </div>
    </StrictMobileViewport>
  );
}
