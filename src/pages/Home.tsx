import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCouple } from '@/contexts/CoupleContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { Heart, Sparkles, Share2, X, Calendar, Clock } from 'lucide-react';
import { StreakBadge } from '@/components/StreakBadge';
import { RitualLogo } from '@/components/RitualLogo';
import { WaitingForPartner } from '@/components/WaitingForPartner';
import { StrictMobileViewport } from '@/components/StrictMobileViewport';
import { SynthesisAnimation } from '@/components/SynthesisAnimation';
import { CreateCoupleDialog } from '@/components/CreateCoupleDialog';
import { JoinDrawer } from '@/components/JoinDrawer';
import { EnhancedPostRitualCheckin } from '@/components/EnhancedPostRitualCheckin';
import { SurpriseRitualCard } from '@/components/SurpriseRitualCard';
import { useSurpriseRitual } from '@/hooks/useSurpriseRitual';
import { format, isPast, parseISO } from 'date-fns';

export default function Home() {
  const { user, couple, partnerProfile, currentCycle, loading, refreshCycle } = useCouple();
  const { surprise, hasUnopened, refresh: refreshSurprise } = useSurpriseRitual();
  const navigate = useNavigate();
  const [nudgeBannerDismissed, setNudgeBannerDismissed] = useState(false);
  const [slowLoading, setSlowLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [showPostRitualCheckin, setShowPostRitualCheckin] = useState(false);

  // Force refresh cycle data when Home mounts to ensure fresh state after navigation
  useEffect(() => {
    if (couple?.id && !loading) {
      refreshCycle();
    }
  }, []); // Run once on mount

  // Show slow loading indicator after 3 seconds
  useEffect(() => {
    if (loading) {
      const timer = setTimeout(() => {
        console.log('[HOME] Loading taking longer than expected...');
        setSlowLoading(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
    setSlowLoading(false);
  }, [loading]);

  // Redirect to landing if not logged in (not auth, to avoid loops)
  useEffect(() => {
    if (!loading && !user) {
      console.log('[HOME] No user found, redirecting to landing');
      navigate('/');
    }
  }, [user, loading, navigate]);

  // Handle pending join action after auth
  useEffect(() => {
    if (user && !loading) {
      const pendingAction = sessionStorage.getItem('pendingAction');
      if (pendingAction === 'join') {
        sessionStorage.removeItem('pendingAction');
        setTimeout(() => setJoinOpen(true), 300);
      }
    }
  }, [user, loading]);

  // Smart redirect: Auto-navigate to rituals or picker when ready
  useEffect(() => {
    if (currentCycle?.synthesized_output && couple?.partner_two) {
      // If agreement reached, go to rituals, otherwise go to picker
      if (currentCycle.agreement_reached) {
        navigate('/rituals');
      } else {
        navigate('/picker');
      }
    }
  }, [currentCycle?.synthesized_output, currentCycle?.agreement_reached, couple?.partner_two, navigate]);

  // Auto-redirect to input when couple is complete
  useEffect(() => {
    if (!couple || !currentCycle || loading) return;
    
    const hasPartnerOne = !!currentCycle?.partner_one_input;
    const hasPartnerTwo = !!currentCycle?.partner_two_input;
    const userIsPartnerOne = couple.partner_one === user?.id;
    const userSubmitted = userIsPartnerOne ? hasPartnerOne : hasPartnerTwo;
    
    // Both partners connected and user hasn't submitted yet
    if (couple.partner_two && !userSubmitted) {
      navigate('/input');
    }
  }, [couple, currentCycle, user, loading, navigate]);

  // Check if should show post-ritual checkin
  useEffect(() => {
    if (!currentCycle?.agreed_date || !currentCycle?.agreed_time || !couple?.id) return;

    const ritualDateTime = parseISO(`${currentCycle.agreed_date}T${currentCycle.agreed_time}`);
    const hasRitualPassed = isPast(ritualDateTime);

    if (hasRitualPassed && !showPostRitualCheckin) {
      // Check if feedback already exists
      const checkFeedback = async () => {
        const { data } = await (await import('@/integrations/supabase/client')).supabase
          .from('ritual_feedback')
          .select('id')
          .eq('weekly_cycle_id', currentCycle.id)
          .eq('couple_id', couple.id)
          .single();
        
        if (!data) {
          setShowPostRitualCheckin(true);
        }
      };
      checkFeedback();
    }
  }, [currentCycle, couple, showPostRitualCheckin]);

  if (loading) {
    return (
      <StrictMobileViewport>
        <div className="h-full bg-gradient-warm flex flex-col items-center justify-center gap-4">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          {slowLoading && (
            <p className="text-sm text-muted-foreground animate-pulse">
              Reconnecting...
            </p>
          )}
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
              <Button onClick={() => setCreateOpen(true)} className="w-full bg-gradient-ritual text-white h-12 rounded-xl">
                <Heart className="w-4 h-4 mr-2" />Start a Ritual Space
              </Button>
              <Button onClick={() => setJoinOpen(true)} variant="outline" className="w-full h-12 rounded-xl">
                I Have a Code
              </Button>
            </div>
          </motion.div>
        </div>
        <CreateCoupleDialog open={createOpen} onOpenChange={setCreateOpen} />
        <JoinDrawer open={joinOpen} onOpenChange={setJoinOpen} />
      </StrictMobileViewport>
    );
  }

  // Waiting for partner: Show code directly inline
  if (!couple.partner_two) {
    return (
      <StrictMobileViewport>
        <div className="h-full bg-gradient-warm flex flex-col justify-center px-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-6 max-w-sm mx-auto"
          >
            {/* Waiting status */}
            <div className="text-center space-y-3">
              <div className="w-16 h-16 mx-auto rounded-full bg-gradient-ritual flex items-center justify-center animate-pulse">
                <Heart className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold">Waiting for Partner...</h1>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Share your code to invite someone special
              </p>
            </div>

            {/* Code Display */}
            <Card className="p-6 bg-white/90 backdrop-blur-sm">
              <p className="text-sm text-muted-foreground mb-2 text-center">Your Couple Code</p>
              <p className="text-5xl font-bold text-primary tracking-wider mb-6 text-center">
                {couple.couple_code}
              </p>
              
              {/* Share Options */}
              <div className="space-y-2">
                <Button
                  onClick={() => {
                    const text = `Try this 2-min ritual generator with me! 💕\n\nUse code: ${couple.couple_code}\n\nGet personalized date ideas based on our combined vibes. Takes 2 minutes total.`;
                    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
                    window.open(url, '_blank');
                  }}
                  className="w-full bg-[#25D366] hover:bg-[#20BA5A] text-white h-12 rounded-xl"
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Share via WhatsApp
                </Button>
                
                <Button
                  onClick={() => {
                    const text = `Join our ritual space! Use code: ${couple.couple_code}`;
                    const url = `sms:&body=${encodeURIComponent(text)}`;
                    window.location.href = url;
                  }}
                  variant="outline"
                  className="w-full border-2 border-primary/30 rounded-xl h-12"
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Share via SMS
                </Button>
                
                <Button
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(couple.couple_code);
                    } catch (error) {
                      console.error('Copy failed:', error);
                    }
                  }}
                  variant="outline"
                  className="w-full border-2 border-primary/30 rounded-xl h-12"
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Copy Code
                </Button>
              </div>
            </Card>

            {/* Recovery Option: Join someone else instead */}
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-2">Or</p>
              <Button 
                onClick={() => setJoinOpen(true)}
                variant="outline"
                className="w-full h-12 rounded-xl"
              >
                Join Someone Else's Code
              </Button>
            </div>
          </motion.div>
        </div>
        <JoinDrawer open={joinOpen} onOpenChange={setJoinOpen} />
      </StrictMobileViewport>
    );
  }

  const hasSynthesized = currentCycle?.synthesized_output;
  const hasPartnerOne = !!currentCycle?.partner_one_input;
  const hasPartnerTwo = !!currentCycle?.partner_two_input;
  const userIsPartnerOne = couple.partner_one === user.id;
  const userSubmitted = userIsPartnerOne ? hasPartnerOne : hasPartnerTwo;
  const partnerSubmitted = userIsPartnerOne ? hasPartnerTwo : hasPartnerOne;

  // Check if there's a recent nudge (within 24 hours)
  const hasRecentNudge = currentCycle?.nudged_at && 
    (Date.now() - new Date(currentCycle.nudged_at).getTime()) < 24 * 60 * 60 * 1000;
  const shouldShowNudgeBanner = hasRecentNudge && !userSubmitted && partnerProfile && !nudgeBannerDismissed;

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
          {showPostRitualCheckin && currentCycle?.agreed_ritual && user && (
            <EnhancedPostRitualCheckin
              coupleId={couple.id}
              cycleId={currentCycle.id}
              userId={user.id}
              ritualTitle={(currentCycle.agreed_ritual as any)?.title || 'Ritual'}
              ritualDescription={(currentCycle.agreed_ritual as any)?.description}
              agreedDate={currentCycle.agreed_date || ''}
              onComplete={() => setShowPostRitualCheckin(false)}
              onDismiss={() => setShowPostRitualCheckin(false)}
            />
          )}
        </div>
      </StrictMobileViewport>
    );
  }

  // Check if ritual time has passed
  const hasAgreedRitual = currentCycle?.agreement_reached && currentCycle?.agreed_ritual;
  const ritualHasPassed = hasAgreedRitual && 
    currentCycle?.agreed_date && 
    currentCycle?.agreed_time &&
    isPast(parseISO(`${currentCycle.agreed_date}T${currentCycle.agreed_time}`));

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

        {/* Nudge Banner */}
        {shouldShowNudgeBanner && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="flex-none mx-4 mb-2"
          >
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
              <p className="text-sm flex-1">
                <span className="font-semibold">{partnerProfile.name}</span> is excited to start! Complete your input to create this week's rituals.
              </p>
              <button
                onClick={() => setNudgeBannerDismissed(true)}
                className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}

        {/* Main Content - Centered */}
        <div className="flex-1 px-4 pb-4 flex flex-col justify-center gap-4">
          {/* Surprise Ritual Card - Premium Only */}
          {surprise && !surprise.completed_at && (
            <SurpriseRitualCard
              surprise={surprise}
              onOpen={refreshSurprise}
              onComplete={refreshSurprise}
            />
          )}

          {ritualHasPassed && hasAgreedRitual ? (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
              <Card className="p-6 bg-primary/5 border-primary/20 text-center space-y-4">
                <Heart className="w-12 h-12 mx-auto text-primary" fill="currentColor" />
                <div>
                  <h2 className="text-xl font-bold mb-2">How was your ritual?</h2>
                  <p className="text-sm text-muted-foreground">
                    {(currentCycle.agreed_ritual as any)?.title || 'Your ritual'}
                  </p>
                </div>
                <Button 
                  onClick={() => setShowPostRitualCheckin(true)}
                  className="w-full bg-gradient-ritual text-white h-12 rounded-xl"
                >
                  Share Your Experience
                </Button>
              </Card>
            </motion.div>
          ) : hasAgreedRitual ? (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
              <Card
                onClick={() => navigate('/rituals')}
                className="p-6 cursor-pointer hover:shadow-lg transition-all bg-gradient-ritual text-white border-0 active:scale-95"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold">This Week's Ritual</h2>
                    <Heart className="w-10 h-10" fill="currentColor" />
                  </div>
                  <p className="text-lg font-semibold">{(currentCycle.agreed_ritual as any)?.title || 'This Week\'s Ritual'}</p>
                  <div className="flex items-center gap-3 text-sm opacity-90">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>{format(new Date(currentCycle.agreed_date), 'MMM d')}</span>
                    </div>
                    {currentCycle.agreed_time && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>{currentCycle.agreed_time}</span>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            </motion.div>
          ) : (
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
          )}
        </div>
      </div>
      {showPostRitualCheckin && hasAgreedRitual && user && (
        <EnhancedPostRitualCheckin
          coupleId={couple.id}
          cycleId={currentCycle.id}
          userId={user.id}
          ritualTitle={(currentCycle.agreed_ritual as any)?.title || 'Ritual'}
          ritualDescription={(currentCycle.agreed_ritual as any)?.description}
          agreedDate={currentCycle.agreed_date || ''}
          onComplete={() => setShowPostRitualCheckin(false)}
          onDismiss={() => setShowPostRitualCheckin(false)}
        />
      )}
      <JoinDrawer open={joinOpen} onOpenChange={setJoinOpen} />
    </StrictMobileViewport>
  );
}
