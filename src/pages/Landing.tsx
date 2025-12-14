import { useNavigate } from 'react-router-dom';
import { useCouple } from '@/contexts/CoupleContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { MapPin, Heart, Sparkles, TrendingUp, Share2, X, Calendar, Clock, MessageSquare, Copy } from 'lucide-react';
import { RitualLogo } from '@/components/RitualLogo';
import { RitualSpinner } from '@/components/RitualSpinner';
import { useState, useEffect, useMemo, useCallback } from 'react';
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
import { OnboardingModal } from '@/components/OnboardingModal';

// ============================================================================
// ANIMATION CONFIG - Google-style: fast, subtle, no layout shift
// ============================================================================
const EASE = [0.4, 0, 0.2, 1] as const; // Material Design standard easing

// Only opacity transitions - NEVER animate position/size to prevent layout shift
const fadeIn = (delay = 0) => ({
  initial: { opacity: 0 },
  animate: { 
    opacity: 1, 
    transition: { duration: 0.2, ease: EASE, delay } 
  },
});

// Stagger children by fading in sequentially - no movement
const staggerContainer = {
  animate: {
    transition: { staggerChildren: 0.05 },
  },
};

const staggerItem = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.2, ease: EASE } },
};

// ============================================================================
// SKELETON COMPONENTS - Reserve exact space for content
// ============================================================================
const CardSkeleton = ({ height = 'h-[140px]' }: { height?: string }) => (
  <div className={`bg-white/40 backdrop-blur-sm rounded-2xl ${height} animate-pulse`}>
    <div className="p-5 space-y-3">
      <div className="h-4 bg-white/60 rounded w-1/3" />
      <div className="h-3 bg-white/60 rounded w-2/3" />
      <div className="h-10 bg-white/60 rounded w-full mt-4" />
    </div>
  </div>
);

const StreakSkeleton = () => (
  <div className="h-8 w-20 bg-white/40 rounded-full animate-pulse" />
);

// ============================================================================
// VIEW TYPE - Single source of truth
// ============================================================================
type ViewType = 
  | 'loading'
  | 'marketing'
  | 'welcome'
  | 'waiting-for-partner'
  | 'synthesis'
  | 'waiting-for-input'
  | 'dashboard';

// ============================================================================
// SHARED COMPONENTS
// ============================================================================
const Background = ({ videoLoaded, setVideoLoaded, isMobile }: { 
  videoLoaded: boolean; 
  setVideoLoaded: (v: boolean) => void;
  isMobile: boolean;
}) => (
  <>
    <AnimatedGradientBackground variant="warm" showVideoBackdrop />
    {isMobile && (
      <video
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        poster="/ritual-poster.jpg"
        onLoadedData={() => setVideoLoaded(true)}
        className={`fixed inset-0 z-[1] w-full h-full object-cover pointer-events-none transition-opacity duration-500 ${
          videoLoaded ? 'opacity-20' : 'opacity-0'
        }`}
      >
        <source src={ritualBackgroundVideo} type="video/mp4" />
      </video>
    )}
  </>
);

const Footer = () => (
  <footer className="flex-none py-4 px-6 text-center text-xs text-muted-foreground relative z-10">
    <div className="flex items-center justify-center gap-2 flex-wrap">
      <a href="/blog" className="hover:text-foreground transition-colors">Blog</a>
      <span>·</span>
      <a href="/faq" className="hover:text-foreground transition-colors">FAQ</a>
      <span>·</span>
      <a href="/terms" className="hover:text-foreground transition-colors">Terms</a>
      <span>·</span>
      <a href="/privacy" className="hover:text-foreground transition-colors">Privacy</a>
      <span>·</span>
      <a href="/contact" className="hover:text-foreground transition-colors">Contact</a>
    </div>
    <p className="mt-2">© {new Date().getFullYear()} Mindmaker LLC</p>
  </footer>
);

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function Landing() {
  const navigate = useNavigate();
  const { user, couple, partnerProfile, userProfile, currentCycle, loading, refreshCycle, hasKnownSession } = useCouple();
  const { surprise, isLoading: surpriseLoading, refresh: refreshSurprise } = useSurpriseRitual();
  const isMobile = useIsMobile();
  
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [nudgeBannerDismissed, setNudgeBannerDismissed] = useState(false);
  const [showPostRitualCheckin, setShowPostRitualCheckin] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [postRitualChecked, setPostRitualChecked] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  
  // Track if initial load is complete (for skeleton -> content transition)
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  // Compute derived state once
  const derivedState = useMemo(() => {
    const hasSynthesized = currentCycle?.synthesized_output;
    const hasPartnerOne = !!currentCycle?.partner_one_input;
    const hasPartnerTwo = !!currentCycle?.partner_two_input;
    const userIsPartnerOne = couple?.partner_one === user?.id;
    const userSubmitted = userIsPartnerOne ? hasPartnerOne : hasPartnerTwo;
    const partnerSubmitted = userIsPartnerOne ? hasPartnerTwo : hasPartnerOne;
    const hasAgreedRitual = currentCycle?.agreement_reached && currentCycle?.agreed_ritual;
    const hasRecentNudge = currentCycle?.nudged_at && 
      (Date.now() - new Date(currentCycle.nudged_at).getTime()) < 24 * 60 * 60 * 1000;
    
    return {
      hasSynthesized,
      userSubmitted,
      partnerSubmitted,
      hasAgreedRitual,
      hasRecentNudge,
    };
  }, [currentCycle, couple, user]);

  // Single source of truth for current view
  const currentView = useMemo((): ViewType => {
    if (loading || (couple && surpriseLoading)) return 'loading';
    if (!user) return 'marketing';
    if (!couple) return 'welcome';
    if (!couple.partner_two) return 'waiting-for-partner';
    
    const { userSubmitted, partnerSubmitted, hasSynthesized } = derivedState;
    if (userSubmitted && partnerSubmitted && !hasSynthesized) return 'synthesis';
    if (userSubmitted && !partnerSubmitted) return 'waiting-for-input';
    
    return 'dashboard';
  }, [loading, surpriseLoading, user, couple, derivedState]);

  // Mark initial load complete after first non-loading view
  useEffect(() => {
    if (currentView !== 'loading' && !initialLoadComplete) {
      // Small delay to let content render before fading in
      const timer = setTimeout(() => setInitialLoadComplete(true), 50);
      return () => clearTimeout(timer);
    }
  }, [currentView, initialLoadComplete]);

  // Force refresh cycle data when page mounts
  useEffect(() => {
    if (couple?.id && !loading) {
      refreshCycle();
    }
  }, [couple?.id]);

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

  // Show onboarding for first-time users
  useEffect(() => {
    if (user && !loading && !couple) {
      const hasSeenOnboarding = localStorage.getItem('hasSeenOnboarding');
      if (!hasSeenOnboarding) {
        setShowOnboarding(true);
      }
    }
  }, [user, loading, couple]);

  // Check if should show post-ritual checkin
  useEffect(() => {
    if (!currentCycle?.agreed_date || !currentCycle?.agreed_time || !couple?.id || postRitualChecked) return;

    const ritualDateTime = parseISO(`${currentCycle.agreed_date}T${currentCycle.agreed_time}`);
    const hasRitualPassed = isPast(ritualDateTime);

    if (hasRitualPassed) {
      setPostRitualChecked(true);
      const checkFeedback = async () => {
        const { data } = await supabase
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
  }, [currentCycle, couple, postRitualChecked]);

  // SEO
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
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      featureList: ['AI-powered ritual suggestions', 'Location-based activities', 'Partner synchronization', 'Streak tracking', 'Calendar integration']
    });
  }, []);

  const handleCancelSpace = useCallback(async () => {
    if (!couple?.id) return;
    try {
      const { error } = await supabase.from('couples').delete().eq('id', couple.id);
      if (error) throw error;
      window.location.reload();
    } catch (error) {
      console.error('Error cancelling space:', error);
    }
  }, [couple?.id]);

  const handleCopyCode = useCallback(async () => {
    if (!couple?.couple_code) return;
    try {
      await navigator.clipboard.writeText(couple.couple_code);
    } catch (error) {
      console.error('Copy failed:', error);
    }
  }, [couple?.couple_code]);

  // ==========================================================================
  // RENDER: Loading state - show skeleton layout matching dashboard structure
  // ==========================================================================
  if (currentView === 'loading') {
    // If we know there's a session, show dashboard skeleton
    // Otherwise show a minimal centered loader
    if (hasKnownSession) {
      return (
        <div className="h-full flex flex-col relative">
          <Background videoLoaded={videoLoaded} setVideoLoaded={setVideoLoaded} isMobile={isMobile} />
          
          {/* Header skeleton - exact same structure as dashboard */}
          <div className="flex-none px-4 pt-2 pb-2 relative z-10">
            <div className="flex items-center justify-end">
              <StreakSkeleton />
            </div>
          </div>

          {/* Main content skeleton */}
          <div className="flex-1 px-4 flex flex-col justify-center gap-4 relative z-10">
            {/* Logo placeholder */}
            <div className="flex justify-center mb-2">
              <div className="h-12 w-32 bg-white/40 rounded-lg animate-pulse" />
            </div>
            
            {/* Card skeleton */}
            <CardSkeleton />
          </div>
        </div>
      );
    }

    // Unknown session - minimal loader with branded spinner
    return (
      <div className="h-full flex flex-col relative">
        <Background videoLoaded={videoLoaded} setVideoLoaded={setVideoLoaded} isMobile={isMobile} />
        <div className="flex-1 flex items-center justify-center relative z-10">
          <div className="text-center space-y-4">
            <RitualLogo size="2xl" variant="full" className="max-w-[560px] sm:max-w-[800px]" />
            <RitualSpinner size="md" />
          </div>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // RENDER: Synthesis view
  // ==========================================================================
  if (currentView === 'synthesis') {
    return <SynthesisAnimation />;
  }

  // ==========================================================================
  // RENDER: Waiting for partner input
  // ==========================================================================
  if (currentView === 'waiting-for-input' && currentCycle) {
    const partnerName = partnerProfile?.name || 'your partner';
    return (
      <div className="h-full relative">
        <AnimatedGradientBackground variant="calm" showVideoBackdrop />
        <WaitingForPartner
          partnerName={partnerName}
          currentCycleId={currentCycle.id}
          lastNudgedAt={currentCycle.nudged_at}
        />
        {showPostRitualCheckin && currentCycle?.agreed_ritual && user && (
          <EnhancedPostRitualCheckin
            coupleId={couple!.id}
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

  // ==========================================================================
  // RENDER: Marketing view - not logged in
  // ==========================================================================
  if (currentView === 'marketing') {
    return (
      <div className="h-full flex flex-col relative">
        <Background videoLoaded={videoLoaded} setVideoLoaded={setVideoLoaded} isMobile={isMobile} />
        
        <motion.div 
          className="flex-1 flex flex-col items-center justify-center px-6 py-4 space-y-4 sm:space-y-6 relative z-10 overflow-y-auto min-h-0"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          <motion.div variants={staggerItem}>
            <RitualLogo size="2xl" variant="full" className="max-w-[560px] sm:max-w-[800px] md:max-w-[1120px] flex-shrink-0" />
          </motion.div>
          
          <div className="text-center space-y-3 sm:space-y-4">
            <motion.h1 
              variants={staggerItem}
              className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight leading-snug text-foreground"
            >
              Create Meaningful
              <br className="sm:hidden" />
              <span className="hidden sm:inline"> </span>
              Weekly Rituals
              <br />
              <span className="text-primary">with Your Partner</span>
            </motion.h1>
            
            <motion.p 
              variants={staggerItem}
              className="text-sm sm:text-base text-foreground/70 max-w-md mx-auto leading-relaxed font-medium"
            >
              Spend 2 minutes a week syncing, explore & schedule fresh, local ideas that will strengthen your bond with one another.
            </motion.p>
            
            <motion.div 
              variants={staggerItem}
              className="flex flex-wrap justify-center gap-2 sm:gap-3 pt-2"
            >
              {[
                { icon: Sparkles, label: 'AI-Powered' },
                { icon: MapPin, label: 'Location-Aware' },
                { icon: TrendingUp, label: 'Streak Tracking' },
                { icon: Heart, label: 'Build Together' },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-1.5 text-xs bg-white/40 backdrop-blur-sm px-3 py-1.5 rounded-full">
                  <Icon className="w-3.5 h-3.5" />
                  <span>{label}</span>
                </div>
              ))}
            </motion.div>
          </div>
          
          <motion.div variants={staggerItem} className="w-full max-w-sm space-y-3 flex-shrink-0">
            <Button 
              onClick={() => navigate('/auth')} 
              size="lg" 
              className="w-full h-12 sm:h-14 text-base bg-gradient-ritual text-white"
            >
              Start New Ritual
            </Button>
            
            <Button 
              onClick={() => navigate('/auth?join=true')} 
              variant="outline" 
              size="lg" 
              className="w-full h-12 sm:h-14 text-base"
            >
              Join Your Partner
            </Button>
          </motion.div>
          
          <motion.p variants={staggerItem} className="text-xs text-muted-foreground flex-shrink-0">
            Already have an account? <button onClick={() => navigate('/auth')} className="underline">Sign In</button>
          </motion.p>
        </motion.div>

        <Footer />
      </div>
    );
  }

  // ==========================================================================
  // RENDER: Welcome view - logged in, no couple
  // ==========================================================================
  if (currentView === 'welcome') {
    const welcomeMessage = userProfile?.name 
      ? `Welcome back, ${userProfile.name}!` 
      : 'Build connection, one ritual at a time';
    
    return (
      <div className="h-full flex flex-col relative">
        <Background videoLoaded={videoLoaded} setVideoLoaded={setVideoLoaded} isMobile={isMobile} />
        
        <motion.div 
          className="flex-1 flex flex-col items-center justify-center px-6 relative z-10"
          {...fadeIn()}
        >
          <div className="text-center space-y-6 max-w-sm">
            <RitualLogo size="xl" variant="full" className="mx-auto" />
            
            <div>
              <h1 className="text-xl font-bold mb-2">{welcomeMessage}</h1>
              <p className="text-sm text-muted-foreground mb-4">
                Weekly rituals designed for couples who want to grow together.
              </p>
              
              <div className="space-y-2 text-left bg-white/60 backdrop-blur-sm rounded-xl p-4 mb-4">
                {[
                  { icon: Heart, color: 'pink', text: 'Pick weekly activities together' },
                  { icon: Sparkles, color: 'purple', text: 'AI finds ideas you\'ll both love' },
                  { icon: TrendingUp, color: 'teal', text: 'Track memories & build streaks' },
                ].map(({ icon: Icon, color, text }) => (
                  <div key={text} className="flex items-center gap-2 text-sm">
                    <div className={`w-6 h-6 rounded-full bg-${color}-100 flex items-center justify-center flex-shrink-0`}>
                      <Icon className={`w-3 h-3 text-${color}-600`} />
                    </div>
                    <span>{text}</span>
                  </div>
                ))}
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
          </div>
        </motion.div>
        
        <CreateCoupleDialog open={createOpen} onOpenChange={setCreateOpen} />
        <JoinDrawer open={joinOpen} onOpenChange={setJoinOpen} />
        <OnboardingModal open={showOnboarding} onComplete={() => setShowOnboarding(false)} />
      </div>
    );
  }

  // ==========================================================================
  // RENDER: Waiting for partner to join
  // ==========================================================================
  if (currentView === 'waiting-for-partner' && couple) {
    return (
      <div className="h-full flex flex-col relative">
        <Background videoLoaded={videoLoaded} setVideoLoaded={setVideoLoaded} isMobile={isMobile} />
        
        <motion.div 
          className="flex-1 flex flex-col justify-center px-4 relative z-10"
          {...fadeIn()}
        >
          <div className="space-y-4 max-w-sm mx-auto text-center">
            <RitualLogo size="md" variant="full" className="mx-auto" />
            
            <div className="w-12 h-12 mx-auto rounded-full bg-gradient-ritual flex items-center justify-center">
              <Heart className="w-6 h-6 text-white" />
            </div>
            
            <div>
              <h1 className="text-xl font-bold">Waiting for Partner</h1>
              <p className="text-sm text-muted-foreground">
                Share your code so they can join
              </p>
            </div>

            <Card className="p-4 bg-white/90 backdrop-blur-sm">
              <p className="text-xs text-muted-foreground mb-1">Your Couple Code</p>
              <p className="text-3xl font-bold text-primary tracking-wider mb-4">
                {couple.couple_code}
              </p>
              
              <div className="flex justify-center gap-3">
                <Button
                  onClick={() => {
                    const text = `Join our ritual space! 💕 Code: ${couple.couple_code}\n\ntryritual.co`;
                    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                  }}
                  className="w-12 h-12 rounded-full bg-[#25D366] hover:bg-[#20BA5A] text-white p-0"
                  title="Share via WhatsApp"
                >
                  <Share2 className="w-5 h-5" />
                </Button>
                
                <Button
                  onClick={() => {
                    const text = `Join our ritual space! Code: ${couple.couple_code}`;
                    window.location.href = `sms:&body=${encodeURIComponent(text)}`;
                  }}
                  variant="outline"
                  className="w-12 h-12 rounded-full border-2 border-primary/30 p-0"
                  title="Share via SMS"
                >
                  <MessageSquare className="w-5 h-5" />
                </Button>
                
                <Button
                  onClick={handleCopyCode}
                  variant="outline"
                  className="w-12 h-12 rounded-full border-2 border-primary/30 p-0"
                  title="Copy Code"
                >
                  <Copy className="w-5 h-5" />
                </Button>
              </div>
            </Card>
            
            <button 
              onClick={handleCancelSpace}
              className="text-xs text-muted-foreground hover:text-destructive transition-colors"
            >
              Cancel this space
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ==========================================================================
  // RENDER: Dashboard view - main logged-in experience
  // ==========================================================================
  const { hasSynthesized, userSubmitted, partnerSubmitted, hasAgreedRitual, hasRecentNudge } = derivedState;
  const shouldShowNudgeBanner = hasRecentNudge && !userSubmitted && partnerProfile && !nudgeBannerDismissed;

  return (
    <div className="h-full flex flex-col relative">
      <Background videoLoaded={videoLoaded} setVideoLoaded={setVideoLoaded} isMobile={isMobile} />
      
      {/* Header with streak badge - fixed height prevents shift */}
      <div className="flex-none h-12 px-4 pt-2 pb-2 relative z-10">
        <div className="flex items-center justify-end">
          <StreakBadge />
        </div>
      </div>

      {/* Nudge banner - fixed height container, content fades in */}
      <div className="flex-none px-4 relative z-10">
        {shouldShowNudgeBanner && (
          <motion.div
            {...fadeIn()}
            className="mb-2"
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
      </div>

      {/* Main content - fade in once loaded */}
      <motion.div 
        className="flex-1 px-4 flex flex-col justify-center gap-4 relative z-10 overflow-y-auto min-h-0"
        {...fadeIn(0.1)}
      >
        {/* Logo */}
        <div className="flex justify-center mb-2">
          <RitualLogo 
            size="lg" 
            variant="full" 
            className={isMobile ? 'scale-150 origin-center' : ''} 
          />
        </div>

        {/* Surprise ritual card - render in place, no animation */}
        {surprise && !surprise.completed_at && (
          <SurpriseRitualCard
            surprise={surprise}
            onOpen={refreshSurprise}
            onComplete={refreshSurprise}
          />
        )}

        {/* Weekly ritual status - agreed ritual */}
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

        {/* Call to action - start input */}
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
            <h2 className="font-bold text-lg mb-2">Rituals Ready!</h2>
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
      </motion.div>

      {/* Post-ritual checkin modal */}
      {showPostRitualCheckin && currentCycle?.agreed_ritual && user && couple && (
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
