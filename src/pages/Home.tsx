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

export default function Home() {
  const { user, couple, currentCycle, loading, shareCode, joinCouple } = useCouple();
  const navigate = useNavigate();
  const { rituals, isShowingSamples } = useSampleRituals();

  useEffect(() => {
    if (!loading && !user) navigate('/auth');
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen-mobile bg-gradient-warm flex flex-col items-center justify-center gap-4">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  if (!couple) {
    return (
      <div className="min-h-screen-mobile bg-gradient-warm flex flex-col items-center justify-center p-6">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-center space-y-8 max-w-md">
          <RitualLogo size="xl" className="mx-auto" />
          <div>
            <h1 className="text-4xl font-bold mb-3">Welcome to Ritual</h1>
            <p className="text-lg text-muted-foreground">Create weekly rituals with someone special</p>
          </div>
          <div className="space-y-3">
            <Button onClick={shareCode} size="lg" className="w-full bg-gradient-ritual text-white hover:opacity-90 h-14 text-lg rounded-xl">
              <Heart className="w-5 h-5 mr-2" />Start a Ritual Space
            </Button>
            <Button onClick={joinCouple} variant="outline" size="lg" className="w-full h-14 text-lg rounded-xl border-2">
              I Have a Code
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Solo exploration mode: show sample rituals while waiting
  if (!couple.partner_two) {
    return (
      <div className="h-screen-mobile bg-gradient-warm flex flex-col overflow-hidden">
        {/* Compact Header */}
        <div className="flex-none px-6 pt-6 pb-4 text-center">
          <RitualLogo size="md" className="mx-auto mb-3" />
          <h1 className="text-2xl font-bold mb-1">Explore While You Wait</h1>
          <p className="text-sm text-muted-foreground">See what rituals look like</p>
        </div>

        {/* Status Card */}
        <div className="flex-none px-6 pb-4">
          <Card className="p-4 bg-card/90 backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-gradient-ritual flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <h2 className="font-semibold text-sm">Sample Rituals</h2>
                <p className="text-xs text-muted-foreground">Get inspired</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => navigate('/rituals')} size="sm" className="flex-1 bg-gradient-ritual text-white h-10 rounded-xl">
                View All
              </Button>
              <Button onClick={shareCode} variant="outline" size="sm" className="flex-1 h-10 rounded-xl">
                <Share2 className="w-3 h-3 mr-1.5" />
                Share Code
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
    );
  }

  const hasSynthesized = currentCycle?.synthesized_output;
  const hasPartnerOne = !!currentCycle?.partner_one_input;
  const hasPartnerTwo = !!currentCycle?.partner_two_input;
  const userIsPartnerOne = couple.partner_one === user.id;
  const userSubmitted = userIsPartnerOne ? hasPartnerOne : hasPartnerTwo;

  return (
    <div className="min-h-screen-mobile bg-gradient-warm p-6 space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-4">
        <RitualLogo size="lg" className="mx-auto" />
        <h1 className="text-3xl font-bold">This Week Together</h1>
        <StreakBadge />
      </motion.div>

      <Card className="p-8 bg-white/90 backdrop-blur-sm text-center space-y-6">
        <div className="w-16 h-16 mx-auto rounded-full bg-gradient-ritual flex items-center justify-center">
          {hasSynthesized ? <Sparkles className="w-8 h-8 text-white" /> : userSubmitted ? <Heart className="w-8 h-8 text-white animate-pulse" /> : <Heart className="w-8 h-8 text-white" />}
        </div>
        <h2 className="text-2xl font-bold">
          {hasSynthesized ? 'Your rituals are ready! 🎉' : userSubmitted ? 'Waiting for your partner...' : 'Ready for this week?'}
        </h2>
        {hasSynthesized ? (
          <Button onClick={() => navigate('/rituals')} size="lg" className="w-full bg-gradient-ritual text-white h-14 rounded-xl">
            View Rituals
          </Button>
        ) : !userSubmitted && (
          <Button onClick={() => navigate('/magnetic')} size="lg" className="w-full bg-gradient-ritual text-white h-14 rounded-xl">
            Start Weekly Input
          </Button>
        )}
      </Card>
    </div>
  );
}
