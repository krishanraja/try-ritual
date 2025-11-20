import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCouple } from '@/contexts/CoupleContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { Heart, Sparkles, Share2 } from 'lucide-react';
import { StreakBadge } from '@/components/StreakBadge';
import { RitualLogo } from '@/components/RitualLogo';
import { useSampleRituals } from '@/hooks/useSampleRituals';
import { RitualCarousel } from '@/components/RitualCarousel';
import { StrictMobileViewport } from '@/components/StrictMobileViewport';

export default function Home() {
  const { user, couple, currentCycle, loading, shareCode, joinCouple } = useCouple();
  const navigate = useNavigate();
  const { rituals, isShowingSamples } = useSampleRituals();

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!loading && !user) navigate('/auth');
  }, [user, loading, navigate]);

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
              <Button onClick={shareCode} className="w-full bg-gradient-ritual text-white h-12 rounded-xl">
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

  // Solo exploration mode: show sample rituals while waiting
  if (!couple.partner_two) {
    return (
      <StrictMobileViewport>
        <div className="h-full bg-gradient-warm flex flex-col">
          {/* Compact Header */}
          <div className="flex-none px-4 pt-3 pb-2 text-center">
            <RitualLogo size="xs" className="mx-auto mb-2" />
            <h1 className="text-lg font-bold mb-1">Explore While You Wait</h1>
            <p className="text-xs text-muted-foreground">See what rituals look like</p>
          </div>

          {/* Status Card */}
          <div className="flex-none px-4 pb-3">
            <Card className="p-3 bg-card/90 backdrop-blur-sm">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-gradient-ritual flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1">
                  <h2 className="font-semibold text-xs">Sample Rituals</h2>
                  <p className="text-xs text-muted-foreground">Get inspired</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => navigate('/rituals')} size="sm" className="flex-1 bg-gradient-ritual text-white h-9 rounded-xl text-xs">
                  View All
                </Button>
                <Button onClick={shareCode} variant="outline" size="sm" className="flex-1 h-9 rounded-xl text-xs">
                  <Share2 className="w-3 h-3 mr-1" />
                  Share
                </Button>
              </div>
            </Card>
          </div>

          {/* Sample Carousel */}
          <div className="flex-1 overflow-hidden">
            <RitualCarousel
              rituals={rituals.slice(0, 6)}
              completions={new Set()}
              onComplete={() => {}}
              variant="compact"
              isShowingSamples={true}
            />
          </div>
        </div>
      </StrictMobileViewport>
    );
  }

  const hasSynthesized = currentCycle?.synthesized_output;
  const hasPartnerOne = !!currentCycle?.partner_one_input;
  const hasPartnerTwo = !!currentCycle?.partner_two_input;
  const userIsPartnerOne = couple.partner_one === user.id;
  const userSubmitted = userIsPartnerOne ? hasPartnerOne : hasPartnerTwo;

  return (
    <StrictMobileViewport>
      <div className="h-full bg-gradient-warm flex flex-col">
        {/* Compact Header */}
        <div className="flex-none px-4 pt-3 pb-2">
          <div className="flex items-center justify-between mb-1">
            <RitualLogo size="xs" />
            <StreakBadge />
          </div>
          <h1 className="text-lg font-bold">This Week</h1>
        </div>

        {/* Main Content - Centered */}
        <div className="flex-1 px-4 pb-4 flex flex-col justify-center">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
            <Card className="p-6 bg-card/90 backdrop-blur-sm text-center space-y-4">
              <div className="w-12 h-12 mx-auto rounded-full bg-gradient-ritual flex items-center justify-center">
                {hasSynthesized ? <Sparkles className="w-6 h-6 text-white" /> : userSubmitted ? <Heart className="w-6 h-6 text-white animate-pulse" /> : <Heart className="w-6 h-6 text-white" />}
              </div>
              <div>
                <h2 className="text-base font-bold mb-1">
                  {hasSynthesized ? 'Rituals Ready! 🎉' : userSubmitted ? 'Waiting for Partner' : 'Ready for This Week?'}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {hasSynthesized ? 'View this week\'s rituals' : userSubmitted ? 'They haven\'t submitted yet' : 'Create this week\'s rituals together'}
                </p>
              </div>
              {hasSynthesized ? (
                <Button onClick={() => navigate('/rituals')} className="w-full bg-gradient-ritual text-white h-12 rounded-xl">
                  View Rituals
                </Button>
              ) : !userSubmitted && (
                <Button onClick={() => navigate('/input')} className="w-full bg-gradient-ritual text-white h-12 rounded-xl">
                  Start Input
                </Button>
              )}
            </Card>
          </motion.div>
        </div>
      </div>
    </StrictMobileViewport>
  );
}
