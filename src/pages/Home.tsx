import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCouple } from '@/contexts/CoupleContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { Heart, Calendar, CheckCircle2, Clock } from 'lucide-react';
import { StreakBadge } from '@/components/StreakBadge';
import ritualLogo from '@/assets/ritual-logo.png';

export default function Home() {
  const { user, couple, currentCycle, loading, shareCode, joinCouple } = useCouple();
  const navigate = useNavigate();

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
          <img src={ritualLogo} alt="Ritual" className="w-32 h-32 mx-auto" />
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

  if (!couple.partner_two) {
    return (
      <div className="min-h-screen-mobile bg-gradient-warm flex flex-col items-center justify-center p-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-8 max-w-md">
          <img src={ritualLogo} alt="Ritual" className="w-24 h-24 mx-auto" />
          <div>
            <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 2 }} className="text-6xl mb-4">💕</motion.div>
            <h2 className="text-3xl font-bold mb-3">Waiting for Your Partner</h2>
          </div>
          <Button onClick={shareCode} size="lg" className="w-full bg-gradient-ritual text-white hover:opacity-90 h-14 text-lg rounded-xl">
            Share Code
          </Button>
        </motion.div>
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
        <img src={ritualLogo} alt="Ritual" className="w-20 h-20 mx-auto" />
        <h1 className="text-3xl font-bold">This Week Together</h1>
        <StreakBadge />
      </motion.div>

      <Card className="p-8 bg-white/90 backdrop-blur-sm text-center space-y-6">
        <div className="w-16 h-16 mx-auto rounded-full bg-gradient-ritual flex items-center justify-center">
          {hasSynthesized ? <CheckCircle2 className="w-8 h-8 text-white" /> : userSubmitted ? <Clock className="w-8 h-8 text-white animate-pulse" /> : <Calendar className="w-8 h-8 text-white" />}
        </div>
        <h2 className="text-2xl font-bold">
          {hasSynthesized ? 'Your rituals are ready! 🎉' : userSubmitted ? 'Waiting for your partner...' : 'Ready for this week?'}
        </h2>
        {hasSynthesized ? (
          <Button onClick={() => navigate('/rituals')} size="lg" className="w-full bg-gradient-ritual text-white h-14 rounded-xl">
            View Rituals
          </Button>
        ) : !userSubmitted && (
          <Button onClick={() => navigate('/input')} size="lg" className="w-full bg-gradient-ritual text-white h-14 rounded-xl">
            Start Weekly Input
          </Button>
        )}
      </Card>
    </div>
  );
}
