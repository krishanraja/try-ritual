/**
 * Landing Page
 * 
 * Main dashboard that shows different views based on user/couple state.
 * 
 * CRITICAL FIX (2025-12-15):
 * - Added explicit "generating" state card
 * - Fixed state derivation to handle all edge cases
 * - Proper retry mechanism for failed synthesis
 * - Never shows blank page or 404 for normal flow states
 * 
 * @updated 2025-12-15 - Fixed two-partner flow reliability
 */

import { useNavigate } from 'react-router-dom';
import { useCouple } from '@/contexts/CoupleContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { MapPin, Heart, Sparkles, TrendingUp, Share2, X, Calendar, Clock, MessageSquare, Copy, RefreshCw, AlertCircle } from 'lucide-react';
import { RitualLogo } from '@/components/RitualLogo';
import { RitualSpinner } from '@/components/RitualSpinner';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSEO, addStructuredData } from '@/hooks/useSEO';
import { AnimatedGradientBackground } from '@/components/AnimatedGradientBackground';
import { motion } from 'framer-motion';
import { CreateCoupleDialog } from '@/components/CreateCoupleDialog';
import { JoinDrawer } from '@/components/JoinDrawer';
// WaitingForPartner moved to /flow
import { EnhancedPostRitualCheckin } from '@/components/EnhancedPostRitualCheckin';
import { SurpriseRitualCard } from '@/components/SurpriseRitualCard';
import { StreakBadge } from '@/components/StreakBadge';
import { useSurpriseRitual } from '@/hooks/useSurpriseRitual';
import { useIsMobile } from '@/hooks/use-mobile';
import { format, isPast, parseISO } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import ritualBackgroundVideo from '@/assets/ritual-background.mp4';
// ritualIcon used in /flow
import { OnboardingModal } from '@/components/OnboardingModal';
// CycleState moved to useRitualFlow



// ============================================================================
// VIEW TYPE - Single source of truth
// ============================================================================
type ViewType = 
  | 'loading'
  | 'marketing'
  | 'welcome'
  | 'waiting-for-partner-join'  // Partner hasn't joined couple yet
  | 'waiting-for-partner-input' // Partner hasn't submitted input
  | 'generating'                // Both submitted, synthesis in progress
  | 'dashboard';                // Main dashboard view (handles ready, picking, agreed)

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
  
  // Synthesis retry state - needed for stuck synthesis recovery on dashboard
  const [isRetryingSynthesis, setIsRetryingSynthesis] = useState(false);
  const [synthesisError, setSynthesisError] = useState<string | null>(null);
  const [synthesisStartTime, setSynthesisStartTime] = useState<number | null>(null);
  const [synthesisTimedOut, setSynthesisTimedOut] = useState(false);
  
  // Track if initial load is complete (for skeleton -> content transition)
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  // Determine if user is partner one
  const isPartnerOne = couple?.partner_one === user?.id;

  // Note: cycleState derivation moved to useRitualFlow

  // Compute derived state for UI
  const derivedState = useMemo(() => {
    const hasSynthesized = !!currentCycle?.synthesized_output;
    const hasPartnerOne = !!currentCycle?.partner_one_input;
    const hasPartnerTwo = !!currentCycle?.partner_two_input;
    const userSubmitted = isPartnerOne ? hasPartnerOne : hasPartnerTwo;
    const partnerSubmitted = isPartnerOne ? hasPartnerTwo : hasPartnerOne;
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
  }, [currentCycle, isPartnerOne]);

  // Single source of truth for current view
  // NOTE: "generating" and "waiting-for-partner-input" are now handled by /flow
  // Landing only handles marketing, welcome, waiting-for-partner-join, and dashboard
  const currentView = useMemo((): ViewType => {
    if (loading) return 'loading';
    if (!user) return 'marketing';
    if (!couple) return 'welcome';
    if (!couple.partner_two) return 'waiting-for-partner-join';
    
    // For active flow states, redirect to unified flow
    // Use dashboard for agreed rituals, needs-input for everything else
    return 'dashboard';
  }, [loading, user, couple]);

  // Retry synthesis handler
  const handleRetrySynthesis = useCallback(async () => {
    if (!currentCycle?.id) {
      return;
    }
    
    setIsRetryingSynthesis(true);
    setSynthesisError(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('trigger-synthesis', {
        body: { 
          cycleId: currentCycle.id,
          forceRetry: true
        }
      });

      if (error) {
        throw error;
      }

      if (data?.status === 'ready') {
        await refreshCycle();
        navigate('/flow');
      } else if (data?.status === 'generating') {
        await refreshCycle();
      } else if (data?.status === 'failed') {
        setSynthesisError(data.error || 'Generation failed. Please try again.');
      }
    } catch (error) {
      console.error('[LANDING] Retry error:', error);
      setSynthesisError('Failed to generate rituals. Please try again.');
    } finally {
      setIsRetryingSynthesis(false);
    }
  }, [currentCycle?.id, refreshCycle, navigate, currentCycle]);

  // Mark initial load complete after first non-loading view (initialLoadComplete not in deps - guard prevents re-run)
  useEffect(() => {
    if (currentView !== 'loading' && !initialLoadComplete) {
      // Small delay to let content render before fading in
      const timer = setTimeout(() => setInitialLoadComplete(true), 50);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentView]);

  // Force refresh cycle data when page mounts
  useEffect(() => {
    if (couple?.id && !loading) {
      refreshCycle();
    }
  }, [couple?.id, loading]);

  // Track synthesis timeout on dashboard (when both submitted but no output yet)
  useEffect(() => {
    const { userSubmitted, partnerSubmitted, hasSynthesized } = derivedState;
    const isGenerating = userSubmitted && partnerSubmitted && !hasSynthesized;
    
    if (isGenerating && !synthesisStartTime) {
      console.log('[Landing] Tracking synthesis start time');
      setSynthesisStartTime(Date.now());
      setSynthesisTimedOut(false);
    } else if (!isGenerating && synthesisStartTime) {
      // Synthesis complete or not generating anymore
      setSynthesisStartTime(null);
      setSynthesisTimedOut(false);
    }
  }, [derivedState, synthesisStartTime]);

  // Check for synthesis timeout (30 seconds)
  useEffect(() => {
    if (!synthesisStartTime) return;
    
    const checkTimeout = () => {
      const elapsed = Date.now() - synthesisStartTime;
      if (elapsed >= 30000 && !synthesisTimedOut) {
        console.warn('[Landing] Synthesis timeout - showing retry option');
        setSynthesisTimedOut(true);
      }
    };
    
    // Check immediately and every second
    checkTimeout();
    const interval = setInterval(checkTimeout, 1000);
    
    return () => clearInterval(interval);
  }, [synthesisStartTime, synthesisTimedOut]);

  // Auto-trigger synthesis when both have submitted (in case edge function didn't fire)
  useEffect(() => {
    const { userSubmitted, partnerSubmitted, hasSynthesized } = derivedState;
    const shouldTrigger = userSubmitted && partnerSubmitted && !hasSynthesized && currentCycle?.id;
    
    if (shouldTrigger) {
      console.log('[Landing] Both submitted, ensuring synthesis is triggered');
      // Fire and forget - this is idempotent
      supabase.functions.invoke('trigger-synthesis', {
        body: { cycleId: currentCycle.id }
      }).catch(err => {
        console.warn('[Landing] Synthesis trigger failed (non-blocking):', err);
      });
    }
  }, [derivedState, currentCycle?.id]);

  // Note: Synthesis polling is now handled by /flow

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
  // RENDER: Loading state - SplashScreen handles this, return null
  // ==========================================================================
  if (currentView === 'loading') {
    // SplashScreen already displays a branded loading animation
    // Return null to prevent duplicate loading UI and visual volatility
    return null;
  }

  // Note: "generating" and "waiting-for-partner-input" views are now handled by /flow

  // ==========================================================================
  // RENDER: Marketing view - not logged in
  // Premium design with refined typography and spacing
  // ==========================================================================
  if (currentView === 'marketing') {
    return (
      <div className="h-full flex flex-col relative">
        <Background videoLoaded={videoLoaded} setVideoLoaded={setVideoLoaded} isMobile={isMobile} />
        
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 space-y-6 sm:space-y-8 relative z-10 overflow-y-auto min-h-0">
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <RitualLogo size="2xl" variant="full" className="max-w-[480px] sm:max-w-[640px] flex-shrink-0" />
          </motion.div>
          
          {/* Hero content */}
          <motion.div 
            className="text-center space-y-4 sm:space-y-5"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          >
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight leading-[1.15] text-foreground">
              Build Meaningful
              <br />
              <span className="text-gradient-ritual">Weekly Rituals</span>
            </h1>
            
            <p className="text-base sm:text-lg text-foreground/70 max-w-md mx-auto leading-relaxed">
              Two minutes a week to explore fresh ideas that strengthen your connection.
            </p>
            
            {/* Feature badges */}
            <div className="flex flex-wrap justify-center gap-2 sm:gap-3 pt-3">
              {[
                { icon: Sparkles, label: 'AI-Powered' },
                { icon: MapPin, label: 'Location-Aware' },
                { icon: TrendingUp, label: 'Streak Tracking' },
                { icon: Heart, label: 'Build Together' },
              ].map(({ icon: Icon, label }, index) => (
                <motion.div 
                  key={label} 
                  className="flex items-center gap-2 text-sm bg-white/60 backdrop-blur-sm px-4 py-2 rounded-full shadow-xs border border-white/50"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.2 + index * 0.05, ease: [0.16, 1, 0.3, 1] }}
                >
                  <Icon className="w-4 h-4 text-primary" />
                  <span className="font-medium">{label}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
          
          {/* CTA buttons */}
          <motion.div 
            className="w-full max-w-sm space-y-3 flex-shrink-0"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            <Button 
              onClick={() => navigate('/auth')} 
              variant="gradient"
              size="xl" 
              className="w-full"
            >
              <Sparkles className="w-5 h-5" />
              Start Your Ritual
            </Button>
            
            <Button 
              onClick={() => navigate('/auth?join=true')} 
              variant="outline" 
              size="lg" 
              className="w-full"
            >
              <Heart className="w-4 h-4" />
              Join Your Partner
            </Button>
          </motion.div>
          
          {/* Sign in link */}
          <motion.p 
            className="text-sm text-muted-foreground flex-shrink-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.4 }}
          >
            Already have an account?{' '}
            <button 
              onClick={() => navigate('/auth')} 
              className="font-medium text-primary hover:underline underline-offset-4 transition-colors"
            >
              Sign In
            </button>
          </motion.p>
        </div>

        <Footer />
      </div>
    );
  }

  // ==========================================================================
  // RENDER: Welcome view - logged in, no couple
  // Premium design with refined typography
  // ==========================================================================
  if (currentView === 'welcome') {
    const welcomeMessage = userProfile?.name 
      ? `Welcome, ${userProfile.name}` 
      : 'Welcome to Ritual';
    
    return (
      <div className="h-full flex flex-col relative">
        <Background videoLoaded={videoLoaded} setVideoLoaded={setVideoLoaded} isMobile={isMobile} />
        
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-6 relative z-10 overflow-y-auto min-h-0">
          <motion.div 
            className="text-center space-y-6 max-w-sm w-full"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <RitualLogo size="xl" variant="full" className="mx-auto" />
            
            <div className="space-y-3">
              <h1 className="text-2xl font-bold tracking-tight">{welcomeMessage}</h1>
              <p className="text-muted-foreground leading-relaxed">
                Build meaningful rituals with your partner, one week at a time.
              </p>
            </div>
            
            {/* Feature list */}
            <Card variant="glass" className="text-left p-5">
              <div className="space-y-3">
                {[
                  { icon: Heart, text: 'Pick weekly activities together', color: 'text-pink-500' },
                  { icon: Sparkles, text: 'AI finds ideas you\'ll both love', color: 'text-purple-500' },
                  { icon: TrendingUp, text: 'Track memories & build streaks', color: 'text-primary' },
                ].map(({ icon: Icon, text, color }, index) => (
                  <motion.div 
                    key={text} 
                    className="flex items-center gap-3"
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: 0.1 + index * 0.08, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <div className="w-8 h-8 rounded-xl bg-background shadow-xs flex items-center justify-center flex-shrink-0">
                      <Icon className={`w-4 h-4 ${color}`} />
                    </div>
                    <span className="text-sm font-medium">{text}</span>
                  </motion.div>
                ))}
              </div>
            </Card>
            
            {/* Action buttons */}
            <div className="space-y-3 pt-2">
              <Button 
                onClick={() => setCreateOpen(true)} 
                variant="gradient"
                size="lg"
                className="w-full"
              >
                <Heart className="w-4 h-4" />
                Start a Ritual Space
              </Button>
              <Button 
                onClick={() => setJoinOpen(true)} 
                variant="outline" 
                size="lg"
                className="w-full"
              >
                I Have a Partner Code
              </Button>
              <p className="text-xs text-muted-foreground pt-1">
                Has your partner started? Ask them for the code!
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

  // ==========================================================================
  // RENDER: Waiting for partner to join
  // Google UX: Content appears instantly
  // ==========================================================================
  if (currentView === 'waiting-for-partner-join' && couple) {
    return (
      <div className="h-full flex flex-col relative">
        <Background videoLoaded={videoLoaded} setVideoLoaded={setVideoLoaded} isMobile={isMobile} />
        
        <div className="flex-1 flex flex-col justify-center px-4 py-6 relative z-10 overflow-y-auto min-h-0">
          <div className="space-y-4 max-w-sm mx-auto text-center w-full">
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
        </div>
      </div>
    );
  }

  // ==========================================================================
  // RENDER: Dashboard view - main logged-in experience
  // Google UX: Content appears instantly, no fade animations
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

      {/* Nudge banner */}
      <div className="flex-none px-4 relative z-10">
        {shouldShowNudgeBanner && (
          <div className="mb-2">
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
          </div>
        )}
      </div>

      {/* Main content - appears instantly, no fade */}
      <div className="flex-1 px-4 flex flex-col justify-center gap-4 relative z-10 overflow-y-auto min-h-0">
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
              onClick={() => navigate('/flow')}
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
              onClick={() => navigate('/flow')}
              className="w-full mt-3 bg-green-600 hover:bg-green-700 text-white h-10 rounded-xl"
            >
              Complete Your Input
            </Button>
          </Card>
        )}

        {/* User submitted, waiting for partner to submit */}
        {userSubmitted && !partnerSubmitted && !hasSynthesized && (
          <Card className="p-5 bg-white/90 backdrop-blur-sm text-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Clock className="w-6 h-6 text-primary animate-pulse" />
              </div>
              <h2 className="font-bold text-lg">Waiting for {partnerProfile?.name || 'partner'}</h2>
              <p className="text-sm text-muted-foreground">
                You've completed your input! Once {partnerProfile?.name || 'your partner'} submits, we'll generate your rituals.
              </p>
            </div>
          </Card>
        )}

        {/* Both submitted, generating rituals - normal state */}
        {userSubmitted && partnerSubmitted && !hasSynthesized && !synthesisTimedOut && (
          <Card className="p-5 bg-white/90 backdrop-blur-sm text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center animate-pulse">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-lg mb-1">Creating Your Rituals...</h2>
                <p className="text-sm text-muted-foreground">
                  Both of you have submitted! We're crafting personalized rituals just for you.
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                <span>This usually takes 15-20 seconds</span>
              </div>
            </div>
          </Card>
        )}

        {/* Both submitted, but synthesis is stuck - show retry */}
        {userSubmitted && partnerSubmitted && !hasSynthesized && synthesisTimedOut && (
          <Card className="p-5 bg-white/90 backdrop-blur-sm text-center border-amber-200">
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-amber-600" />
              </div>
              <div>
                <h2 className="font-bold text-lg mb-1">Taking Longer Than Expected</h2>
                <p className="text-sm text-muted-foreground mb-2">
                  {synthesisError || "Ritual generation is taking longer than usual. Please try again."}
                </p>
              </div>
              <div className="flex flex-col gap-2 w-full">
                <Button 
                  onClick={handleRetrySynthesis}
                  disabled={isRetryingSynthesis}
                  className="w-full bg-gradient-ritual text-white h-12 rounded-xl"
                >
                  {isRetryingSynthesis ? (
                    <span className="flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Retrying...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <RefreshCw className="w-4 h-4" />
                      Try Again
                    </span>
                  )}
                </Button>
                <Button 
                  onClick={() => navigate('/flow')}
                  variant="outline"
                  className="w-full h-10 rounded-xl"
                >
                  Go to Flow Page
                </Button>
              </div>
            </div>
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
              onClick={() => navigate('/flow')}
              className="w-full bg-gradient-ritual text-white h-12 rounded-xl"
            >
              Pick Your Rituals
            </Button>
          </Card>
        )}
      </div>

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
