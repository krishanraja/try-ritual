import { useNavigate } from 'react-router-dom';
import { useCouple } from '@/contexts/CoupleContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { MapPin, Heart, Sparkles, TrendingUp, Share2, X, Calendar, Clock } from 'lucide-react';
import { RitualLogo } from '@/components/RitualLogo';
import { useState, useEffect } from 'react';
import { useSEO, addStructuredData } from '@/hooks/useSEO';
import { AnimatedGradientBackground } from '@/components/AnimatedGradientBackground';
import { motion } from 'framer-motion';
import { CreateCoupleDialog } from '@/components/CreateCoupleDialog';
import { JoinDrawer } from '@/components/JoinDrawer';
import { WaitingForPartner } from '@/components/WaitingForPartner';
import { SynthesisAnimation } from '@/components/SynthesisAnimation';
import { EnhancedPostRitualCheckin } from '@/components/EnhancedPostRitualCheckin';
import { SurpriseRitualCard } from '@/components/SurpriseRitualCard';
import { StreakBadge } from '@/components/StreakBadge';
import { useSurpriseRitual } from '@/hooks/useSurpriseRitual';
import { useIsMobile } from '@/hooks/use-mobile';
import { format, isPast, parseISO } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import ritualBackgroundVideo from '@/assets/ritual-background.mp4';
import ritualVideoPoster from '@/assets/ritual-video-poster.jpg';
import { OnboardingModal } from '@/components/OnboardingModal';

export default function Landing() {
  const navigate = useNavigate();
  const { user, couple, partnerProfile, currentCycle, loading, refreshCycle, hasKnownSession } = useCouple();
  const { surprise, refresh: refreshSurprise } = useSurpriseRitual();
  const isMobile = useIsMobile();
  
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [nudgeBannerDismissed, setNudgeBannerDismissed] = useState(false);
  const [slowLoading, setSlowLoading] = useState(false);
  const [showPostRitualCheckin, setShowPostRitualCheckin] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [userProfile, setUserProfile] = useState<{ name: string } | null>(null);

  // Force refresh cycle data when page mounts
  useEffect(() => {
    if (couple?.id && !loading) {
      refreshCycle();
    }
  }, []);

  // Show slow loading indicator after 3 seconds
  useEffect(() => {
    if (loading) {
      const timer = setTimeout(() => setSlowLoading(true), 3000);
      return () => clearTimeout(timer);
    }
    setSlowLoading(false);
  }, [loading]);

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

  // Fetch user profile for personalization
  useEffect(() => {
    if (user && !loading) {
      const fetchProfile = async () => {
        const { data } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', user.id)
          .single();
        if (data) setUserProfile(data);
      };
      fetchProfile();
    }
  }, [user, loading]);

  // Show onboarding for first-time users
  useEffect(() => {
    if (user && !loading && !couple) {
      const hasSeenOnboarding = localStorage.getItem('hasSeenOnboarding');
      if (!hasSeenOnboarding) {
        setShowOnboarding(true);
      }
    }
  }, [user, loading, couple]);

  // No auto-redirect - let users stay on home and navigate manually

  // Check if should show post-ritual checkin
  useEffect(() => {
    if (!currentCycle?.agreed_date || !currentCycle?.agreed_time || !couple?.id) return;

    const ritualDateTime = parseISO(`${currentCycle.agreed_date}T${currentCycle.agreed_time}`);
    const hasRitualPassed = isPast(ritualDateTime);

    if (hasRitualPassed && !showPostRitualCheckin) {
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

  // SEO optimization
  useSEO({
    title: 'Create Meaningful Weekly Rituals with Your Partner',
    description: 'Build meaningful weekly rituals with your partner. AI-powered ritual suggestions tailored to your location in London, Sydney, Melbourne, or New York. Track completions, build streaks, and strengthen your relationship.',
    keywords: 'relationship rituals, couple activities, weekly rituals, relationship building, shared moments, couple goals, date ideas, relationship app, partner activities'
  });

  useEffect(() => {
    addStructuredData({
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: 'Ritual',
      applicationCategory: 'LifestyleApplication',
      operatingSystem: 'Web',
      description: 'Build meaningful weekly rituals with your partner. AI-powered relationship building through shared experiences.',
      url: 'https://ritual.lovable.app/',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD'
      },
      featureList: ['AI-powered ritual suggestions', 'Location-based activities in London, Sydney, Melbourne, and New York', 'Partner synchronization and ranking', 'Streak tracking and gamification', 'Calendar integration']
    });
  }, []);

  // Loading state - show skeleton matching expected destination with contextual messages
  if (loading) {
    // Contextual loading messages
    const getLoadingMessage = () => {
      if (!hasKnownSession) return 'Loading...';
      if (slowLoading) return 'Reconnecting to your space...';
      return 'Finding your rituals...';
    };

    // If we have a cached session, show dashboard-like skeleton (with lg logo)
    // Otherwise show marketing-like skeleton (with 2xl logo)
    if (hasKnownSession) {
      return (
        <div className="h-full flex flex-col relative">
          <AnimatedGradientBackground variant="warm" />
          <div className="flex-1 flex flex-col items-center justify-center gap-4 relative z-10">
            <RitualLogo size="lg" variant="full" className="opacity-80" />
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground animate-pulse">
              {getLoadingMessage()}
            </p>
          </div>
        </div>
      );
    }
    
    // No cached session - show marketing-style skeleton
    return (
      <div className="h-full flex flex-col relative">
        <AnimatedGradientBackground variant="warm" />
        <div className="flex-1 flex flex-col items-center justify-center gap-4 relative z-10">
          <RitualLogo size="2xl" variant="full" className="opacity-80 max-w-[560px] sm:max-w-[800px]" />
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground animate-pulse">
            {getLoadingMessage()}
          </p>
        </div>
      </div>
    );
  }

  // Mobile video background component - optimized for fast loading with poster
  const MobileVideoBackground = () => isMobile ? (
    <video
      autoPlay
      loop
      muted
      playsInline
      preload="auto"
      poster={ritualVideoPoster}
      onCanPlayThrough={() => setVideoLoaded(true)}
      className={`fixed inset-0 z-[1] w-full h-full object-cover pointer-events-none opacity-20`}
    >
      <source src={ritualBackgroundVideo} type="video/mp4" />
    </video>
  ) : null;

  // Not logged in: Show marketing landing page
  if (!user) {
    return (
      <div className="h-full flex flex-col relative">
        <AnimatedGradientBackground variant="warm" />
        <MobileVideoBackground />

        <div className="flex-1 flex flex-col items-center justify-center px-6 py-4 space-y-4 sm:space-y-6 relative z-10 overflow-y-auto min-h-0">
          <motion.div
            initial={{ opacity: 1, scale: 1 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <RitualLogo size="2xl" variant="full" className="max-w-[560px] sm:max-w-[800px] md:max-w-[1120px] flex-shrink-0" />
          </motion.div>
          
          <div className="text-center space-y-3 sm:space-y-4">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground leading-tight">
              Create Meaningful Weekly Rituals with Your Partner
            </h1>
            <p className="text-sm text-foreground/70 max-w-sm mx-auto leading-relaxed">
              Spend 2 minutes a week syncing, explore & schedule fresh, local ideas that will strengthen your bond with one another.
            </p>
            
            <div className="flex flex-wrap justify-center gap-2 sm:gap-3 pt-2">
              <div className="flex items-center gap-1.5 text-xs bg-white/40 backdrop-blur-sm px-3 py-1.5 rounded-full">
                <Sparkles className="w-3.5 h-3.5" />
                <span>AI-Powered</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs bg-white/40 backdrop-blur-sm px-3 py-1.5 rounded-full">
                <MapPin className="w-3.5 h-3.5" />
                <span>Location-Aware</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs bg-white/40 backdrop-blur-sm px-3 py-1.5 rounded-full">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Streak Tracking</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs bg-white/40 backdrop-blur-sm px-3 py-1.5 rounded-full">
                <Heart className="w-3.5 h-3.5" />
                <span>Build Together</span>
              </div>
            </div>
          </div>
          
          <div className="w-full max-w-sm space-y-3 flex-shrink-0">
            <Button onClick={() => navigate('/auth')} size="lg" className="w-full h-12 sm:h-14 text-base bg-gradient-ritual text-white">
              Start New Ritual
            </Button>
            
            <Button onClick={() => navigate('/auth?join=true')} variant="outline" size="lg" className="w-full h-12 sm:h-14 text-base">
              Join Your Partner
            </Button>
          </div>
          
          <p className="text-xs text-muted-foreground flex-shrink-0">
            Already have an account? <button onClick={() => navigate('/auth')} className="underline">Sign In</button>
          </p>
        </div>

        <footer className="flex-none py-4 px-6 text-center text-xs text-muted-foreground relative z-10">
          <div className="flex items-center justify-center gap-2">
            <button onClick={() => navigate('/terms')} className="hover:text-foreground transition-colors">Terms</button>
            <span>·</span>
            <button onClick={() => navigate('/privacy')} className="hover:text-foreground transition-colors">Privacy</button>
            <span>·</span>
            <button onClick={() => navigate('/contact')} className="hover:text-foreground transition-colors">Contact</button>
            <span>·</span>
            <span>© {new Date().getFullYear()} Mindmaker LLC</span>
          </div>
        </footer>
      </div>
    );
  }

  // Logged in but no couple: Show welcome screen with value proposition
  if (!couple) {
    const welcomeMessage = userProfile?.name 
      ? `Welcome back, ${userProfile.name}!` 
      : 'Build connection, one ritual at a time';
    
    return (
      <div className="h-full flex flex-col relative">
        <AnimatedGradientBackground variant="warm" />
        <MobileVideoBackground />
        <div className="flex-1 flex flex-col items-center justify-center px-6 relative z-10">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-center space-y-6 max-w-sm">
            <RitualLogo size="xl" variant="full" className="mx-auto" />
            <div>
              <h1 className="text-xl font-bold mb-2">{welcomeMessage}</h1>
              <p className="text-sm text-muted-foreground mb-4">
                Weekly rituals designed for couples who want to grow together.
              </p>
              
              {/* Value proposition bullets */}
              <div className="space-y-2 text-left bg-white/60 backdrop-blur-sm rounded-xl p-4 mb-4">
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-6 h-6 rounded-full bg-pink-100 flex items-center justify-center flex-shrink-0">
                    <Heart className="w-3 h-3 text-pink-600" />
                  </div>
                  <span>Pick weekly activities together</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-3 h-3 text-purple-600" />
                  </div>
                  <span>AI finds ideas you'll both love</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-6 h-6 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
                    <TrendingUp className="w-3 h-3 text-teal-600" />
                  </div>
                  <span>Track memories & build streaks</span>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Button onClick={() => setCreateOpen(true)} className="w-full bg-gradient-ritual text-white h-12 rounded-xl">
                <Heart className="w-4 h-4 mr-2" />Start a Ritual Space
              </Button>
              <Button onClick={() => setJoinOpen(true)} variant="outline" className="w-full h-12 rounded-xl">
                I Have a Code
              </Button>
              <p className="text-xs text-muted-foreground pt-2">
                Has your partner already started? Ask them for the code!
              </p>
            </div>
          </motion.div>
        </div>
        <CreateCoupleDialog open={createOpen} onOpenChange={setCreateOpen} />
        <JoinDrawer open={joinOpen} onOpenChange={setJoinOpen} />
        <OnboardingModal open={showOnboarding} onComplete={() => setShowOnboarding(false)} />
      </div>
    );
  }

  // Waiting for partner to join
  if (!couple.partner_two) {
    const handleCancelSpace = async () => {
      try {
        // Delete the couple since partner hasn't joined
        const { error } = await supabase
          .from('couples')
          .delete()
          .eq('id', couple.id);
        
        if (error) throw error;
        
        // Refresh context to clear couple
        window.location.reload();
      } catch (error) {
        console.error('Error cancelling space:', error);
      }
    };

    return (
      <div className="h-full flex flex-col relative">
        <AnimatedGradientBackground variant="warm" />
        <MobileVideoBackground />
        <div className="flex-1 flex flex-col justify-center px-4 relative z-10 overflow-y-auto min-h-0">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-6 max-w-sm mx-auto"
          >
            <div className="text-center space-y-3">
              <RitualLogo size="lg" variant="full" className="mx-auto mb-4" />
              <div className="w-16 h-16 mx-auto rounded-full bg-gradient-ritual flex items-center justify-center animate-pulse">
                <Heart className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold">Waiting for Partner...</h1>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Your partner needs to join using your code
              </p>
            </div>
            
            {/* Clear instructions */}
            <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 text-sm space-y-2">
              <p className="font-medium text-foreground">How they join:</p>
              <ol className="text-muted-foreground space-y-1 list-decimal list-inside">
                <li>They sign in at tryritual.co</li>
                <li>Click "I Have a Code"</li>
                <li>Enter your code below</li>
              </ol>
            </div>

            <Card className="p-6 bg-white/90 backdrop-blur-sm">
              <p className="text-sm text-muted-foreground mb-2 text-center">Your Couple Code</p>
              <p className="text-5xl font-bold text-primary tracking-wider mb-6 text-center">
                {couple.couple_code}
              </p>
              
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
                    window.location.href = `sms:&body=${encodeURIComponent(text)}`;
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

            <p className="text-center text-xs text-muted-foreground">
              Your partner hasn't joined yet. Share the code above to get started together!
            </p>
            
            {/* Cancel option for users who created by accident */}
            <button 
              onClick={handleCancelSpace}
              className="w-full text-center text-xs text-muted-foreground hover:text-destructive transition-colors py-2"
            >
              Changed your mind? Cancel this space
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  // Couple exists - check ritual state
  const hasSynthesized = currentCycle?.synthesized_output;
  const hasPartnerOne = !!currentCycle?.partner_one_input;
  const hasPartnerTwo = !!currentCycle?.partner_two_input;
  const userIsPartnerOne = couple.partner_one === user.id;
  const userSubmitted = userIsPartnerOne ? hasPartnerOne : hasPartnerTwo;
  const partnerSubmitted = userIsPartnerOne ? hasPartnerTwo : hasPartnerOne;

  const hasRecentNudge = currentCycle?.nudged_at && 
    (Date.now() - new Date(currentCycle.nudged_at).getTime()) < 24 * 60 * 60 * 1000;
  const shouldShowNudgeBanner = hasRecentNudge && !userSubmitted && partnerProfile && !nudgeBannerDismissed;

  // Synthesis in progress
  if (userSubmitted && partnerSubmitted && !hasSynthesized) {
    return <SynthesisAnimation />;
  }

  // User submitted, waiting for partner
  if (userSubmitted && !partnerSubmitted && currentCycle) {
    const partnerName = partnerProfile?.name || 'your partner';
    return (
      <div className="h-full relative">
        <AnimatedGradientBackground variant="calm" />
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
    );
  }

  // Check if ritual time has passed
  const hasAgreedRitual = currentCycle?.agreement_reached && currentCycle?.agreed_ritual;
  const ritualHasPassed = hasAgreedRitual && 
    currentCycle?.agreed_date && 
    currentCycle?.agreed_time &&
    isPast(parseISO(`${currentCycle.agreed_date}T${currentCycle.agreed_time}`));

  // Main dashboard view
  return (
    <div className="h-full flex flex-col relative">
      <AnimatedGradientBackground variant="warm" />
      
      <MobileVideoBackground />
      
      {/* Streak Badge Header - Logo handled by AppShell */}
      <div className="flex-none px-4 pt-2 pb-2 relative z-10">
        <div className="flex items-center justify-end">
          <StreakBadge />
        </div>
      </div>

      {/* Nudge Banner */}
      {shouldShowNudgeBanner && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="flex-none mx-4 mb-2 relative z-10"
        >
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
            <p className="text-sm flex-1">
              <span className="font-semibold">{partnerProfile?.name}</span> is excited to start! Complete your input to create this week's rituals.
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

      {/* Main Content */}
      <div className="flex-1 px-4 flex flex-col justify-center gap-4 relative z-10 overflow-y-auto min-h-0">
        {/* Full Logo - Homepage branding - 50% larger on mobile */}
        <div className="flex justify-center mb-2">
          <RitualLogo 
            size="lg" 
            variant="full" 
            className={isMobile ? 'scale-150 origin-center' : ''} 
          />
        </div>
        {/* Surprise Ritual Card */}
        {surprise && !surprise.completed_at && (
          <SurpriseRitualCard
            surprise={surprise}
            onOpen={refreshSurprise}
            onComplete={refreshSurprise}
          />
        )}

        {/* Weekly Ritual Status */}
        {hasAgreedRitual && currentCycle?.agreed_date && currentCycle?.agreed_time && (
          <Card 
            className="p-4 bg-white/90 backdrop-blur-sm cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => navigate('/rituals')}
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-ritual flex items-center justify-center">
                <Heart className="w-5 h-5 text-white" fill="currentColor" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground mb-0.5">This week's ritual</p>
                <h3 className="font-bold text-sm truncate">
                  {(currentCycle.agreed_ritual as any)?.title}
                </h3>
                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                  <Calendar className="w-3 h-3" />
                  <span>{format(new Date(currentCycle.agreed_date), 'EEE, MMM d')}</span>
                  <Clock className="w-3 h-3 ml-1" />
                  <span>{currentCycle.agreed_time}</span>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Call to Action */}
        {!hasAgreedRitual && !userSubmitted && (
          <Card className="p-5 bg-white/90 backdrop-blur-sm text-center">
            <h2 className="font-bold text-lg mb-2">Ready for this week?</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Answer a few quick questions to generate personalized rituals for you and your partner.
            </p>
            <Button 
              onClick={() => navigate('/input')}
              className="w-full bg-gradient-ritual text-white h-12 rounded-xl"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Start Weekly Input
            </Button>
          </Card>
        )}

        {/* Partner submitted banner */}
        {!userSubmitted && partnerSubmitted && (
          <Card className="p-4 bg-green-50 border-green-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <Heart className="w-5 h-5 text-green-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-green-800 text-sm">
                  {partnerProfile?.name || 'Your partner'} is ready!
                </p>
                <p className="text-xs text-green-600">
                  Complete your input to generate rituals together
                </p>
              </div>
            </div>
            <Button 
              onClick={() => navigate('/input')}
              className="w-full mt-3 bg-green-600 hover:bg-green-700 text-white h-10 rounded-xl"
            >
              Complete Your Input
            </Button>
          </Card>
        )}

        {/* Synthesized but not agreed */}
        {hasSynthesized && !hasAgreedRitual && (
          <Card className="p-5 bg-white/90 backdrop-blur-sm text-center">
            <h2 className="font-bold text-lg mb-2">Rituals Ready! 🎉</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Your personalized rituals are ready. Rank your favorites and agree with your partner.
            </p>
            <Button 
              onClick={() => navigate('/picker')}
              className="w-full bg-gradient-ritual text-white h-12 rounded-xl"
            >
              Pick Your Rituals
            </Button>
          </Card>
        )}
      </div>

      {/* Post-Ritual Checkin Modal */}
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
  );
}