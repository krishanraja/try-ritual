/**
 * SplashScreen Component
 * 
 * Premium branded loading experience with refined animations.
 * 
 * ARCHITECTURE FIX (2026-01-03):
 * PROBLEM: Two loading screens were shown sequentially:
 * 1. Native splash (index.html) - "Loading your experience..."
 * 2. React splash - "Weekly moments, lasting connection"
 * 
 * FIX: Use useLayoutEffect to hide native splash BEFORE browser paint.
 * This is synchronous with React's render cycle, so there's no gap.
 * Native splash shows during bundle download, then React splash takes over
 * seamlessly (both have same visual appearance).
 * 
 * Progressive feedback:
 * - 3s: "Taking a moment..."
 * - 5s: "Having trouble?" with Refresh/Continue buttons
 * - 8s: Error state styling
 * - 10s: Force dismiss no matter what
 * 
 * @created 2025-12-13
 * @updated 2026-01-03 - Fixed double splash screen issue
 */

import { useEffect, useLayoutEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCouple } from '@/contexts/CoupleContext';
import ritualIcon from '@/assets/ritual-icon.png';

interface SplashScreenProps {
  children: React.ReactNode;
}

// Timeout thresholds
const WARNING_TIMEOUT_MS = 3000;    // Show "taking longer than expected"
const HELP_TIMEOUT_MS = 5000;       // Show "having trouble?" message
const CRITICAL_TIMEOUT_MS = 8000;   // Show error state
const FORCE_DISMISS_MS = 10000;     // Force dismiss no matter what

export function SplashScreen({ children }: SplashScreenProps) {
  const { loading } = useCouple();
  const [showSplash, setShowSplash] = useState(true);
  const [contentReady, setContentReady] = useState(false);
  const showSplashRef = useRef(true);
  
  // Progressive feedback states
  const [loadingMessage, setLoadingMessage] = useState('Loading');
  const [showTroubleshoot, setShowTroubleshoot] = useState(false);
  const [isError, setIsError] = useState(false);

  // ============================================================================
  // CRITICAL: Hide native splash SYNCHRONOUSLY before browser paint
  // useLayoutEffect runs after DOM mutation but BEFORE paint
  // This prevents any visual flash between native and React splash
  // ============================================================================
  useLayoutEffect(() => {
    const nativeSplash = document.getElementById('splash');
    if (nativeSplash) {
      // Remove immediately - no transition, no delay
      // React splash is already rendered at this point
      nativeSplash.remove();
    }
  }, []);

  // Progressive timeout system with user feedback
  useEffect(() => {
    const timeouts: ReturnType<typeof setTimeout>[] = [];
    const startTime = Date.now();
    
    // Warning at 3s - show message
    const warningTimeout = setTimeout(() => {
      if (showSplashRef.current && loading) {
        console.warn('[SplashScreen] Loading taking longer than expected (3s)');
        setLoadingMessage('Taking a moment...');
      }
    }, WARNING_TIMEOUT_MS);
    timeouts.push(warningTimeout);
    
    // Help at 5s - show troubleshooting option
    const helpTimeout = setTimeout(() => {
      if (showSplashRef.current && loading) {
        console.warn('[SplashScreen] Loading exceeded 5s, showing help option');
        setLoadingMessage('Still loading...');
        setShowTroubleshoot(true);
      }
    }, HELP_TIMEOUT_MS);
    timeouts.push(helpTimeout);
    
    // Critical at 8s - show error state but keep trying
    const criticalTimeout = setTimeout(() => {
      if (showSplashRef.current && loading) {
        console.error('[SplashScreen] ⚠️ CRITICAL: Loading exceeded 8s');
        setLoadingMessage('Connection slow');
        setIsError(true);
      }
    }, CRITICAL_TIMEOUT_MS);
    timeouts.push(criticalTimeout);
    
    // Force dismiss at 10s - guaranteed exit
    const forceDismissTimeout = setTimeout(() => {
      if (showSplashRef.current) {
        const elapsed = Date.now() - startTime;
        console.error(`[SplashScreen] ⚠️ FORCE DISMISS after ${elapsed}ms - app may not be fully loaded`);
        showSplashRef.current = false;
        setContentReady(true);
        setShowSplash(false);
      }
    }, FORCE_DISMISS_MS);
    timeouts.push(forceDismissTimeout);

    return () => {
      timeouts.forEach(timeout => clearTimeout(timeout));
    };
  }, [loading]);

  // When loading completes, reveal content
  useEffect(() => {
    if (!loading) {
      console.log('[SplashScreen] Loading completed, revealing content');
      setContentReady(true);
      
      const timer = setTimeout(() => {
        if (showSplashRef.current) {
          console.log('[SplashScreen] Dismissing splash screen');
          showSplashRef.current = false;
          setShowSplash(false);
        }
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [loading]);

  // Handle refresh button click
  const handleRefresh = () => {
    console.log('[SplashScreen] User triggered refresh');
    window.location.reload();
  };

  // Handle skip button click
  const handleSkip = () => {
    console.log('[SplashScreen] User skipped splash');
    showSplashRef.current = false;
    setContentReady(true);
    setShowSplash(false);
  };

  return (
    <>
      {/* Premium branded splash screen - THE ONLY loading screen users see */}
      <AnimatePresence>
        {showSplash && (
          <motion.div
            key="splash"
            // Start with opacity 1 - NO fade in animation
            // This ensures seamless transition from native splash
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden"
            style={{
              // Match native splash background exactly
              background: 'linear-gradient(180deg, hsla(270, 40%, 92%, 0.95), hsla(220, 20%, 97%, 0.98))'
            }}
          >
            {/* Ambient gradient orbs */}
            <div className="absolute inset-0 overflow-hidden">
              <motion.div
                className="absolute -top-32 -right-32 w-80 h-80 rounded-full opacity-20"
                style={{ background: 'radial-gradient(circle, hsl(174 58% 42%), transparent 70%)' }}
                animate={{ 
                  scale: [1, 1.2, 1],
                  x: [0, 20, 0],
                  y: [0, -10, 0],
                }}
                transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
              />
              <motion.div
                className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full opacity-15"
                style={{ background: 'radial-gradient(circle, hsl(270 55% 55%), transparent 70%)' }}
                animate={{ 
                  scale: [1, 1.15, 1],
                  x: [0, -15, 0],
                  y: [0, 20, 0],
                }}
                transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
              />
            </div>
            
            {/* Logo container with glow animation */}
            <div className="relative flex items-center justify-center mb-6">
              {/* Rotating gradient ring */}
              <motion.div
                className="absolute w-32 h-32 rounded-full"
                style={{
                  background: isError 
                    ? 'conic-gradient(from 0deg, hsl(30 80% 50% / 0.4), hsl(0 70% 50% / 0.4), hsl(30 80% 50% / 0.4))'
                    : 'conic-gradient(from 0deg, hsl(174 58% 42% / 0.4), hsl(270 55% 55% / 0.4), hsl(174 58% 42% / 0.4))',
                }}
                animate={{ rotate: 360 }}
                transition={{ duration: isError ? 2 : 4, repeat: Infinity, ease: 'linear' }}
              />
              
              {/* Inner glow circle */}
              <motion.div
                className="absolute w-28 h-28 rounded-full"
                style={{ background: 'hsl(0 0% 100% / 0.6)' }}
                animate={{
                  boxShadow: isError
                    ? [
                        '0 0 0 0 hsl(30 80% 50% / 0)',
                        '0 0 30px 10px hsl(30 80% 50% / 0.2)',
                        '0 0 0 0 hsl(30 80% 50% / 0)',
                      ]
                    : [
                        '0 0 0 0 hsl(174 58% 42% / 0)',
                        '0 0 30px 10px hsl(174 58% 42% / 0.15)',
                        '0 0 0 0 hsl(174 58% 42% / 0)',
                      ],
                }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
              />
              
              {/* Icon */}
              <motion.div
                className="relative w-24 h-24 rounded-full bg-white shadow-lg flex items-center justify-center"
                animate={{ scale: [1, 1.03, 1] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
              >
                <img
                  src={ritualIcon}
                  alt="Ritual"
                  className="w-14 h-14 object-contain"
                />
              </motion.div>
            </div>
            
            {/* Logo image - NO fade animation, appears instantly */}
            <img 
              src="/ritual-logo-full.png" 
              alt="Ritual" 
              className="relative max-h-14 w-auto"
            />
            
            {/* Tagline - matches native splash exactly */}
            <p 
              className="relative mt-8 text-sm font-semibold tracking-wide"
              style={{
                fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
                background: 'linear-gradient(135deg, hsl(175, 55%, 35%), hsl(270, 55%, 55%))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Weekly moments, lasting connection
            </p>
            
            {/* Loading indicator with dynamic message */}
            <div className="relative mt-8 flex flex-col items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className={`w-1.5 h-1.5 rounded-full ${isError ? 'bg-amber-500/50' : 'bg-primary/50'}`}
                      animate={{ 
                        scale: [1, 1.3, 1],
                        opacity: [0.5, 1, 0.5],
                      }}
                      transition={{ 
                        duration: 1,
                        repeat: Infinity,
                        delay: i * 0.15,
                        ease: 'easeInOut',
                      }}
                    />
                  ))}
                </div>
                <span className={`text-xs font-medium ${isError ? 'text-amber-600/70' : 'text-muted-foreground/70'}`}>
                  {loadingMessage}
                </span>
              </div>
              
              {/* Troubleshooting options */}
              <AnimatePresence>
                {showTroubleshoot && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center gap-2 mt-2"
                  >
                    <p className="text-xs text-muted-foreground/60">
                      Having trouble loading?
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={handleRefresh}
                        className="text-xs font-medium text-primary hover:text-primary/80 underline underline-offset-2"
                      >
                        Refresh
                      </button>
                      <button
                        onClick={handleSkip}
                        className="text-xs font-medium text-muted-foreground hover:text-foreground underline underline-offset-2"
                      >
                        Continue anyway
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main content - renders invisibly, revealed atomically */}
      <motion.div 
        initial={false}
        animate={{ opacity: contentReady && !showSplash ? 1 : 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        style={{ pointerEvents: showSplash ? 'none' : 'auto' }}
      >
        {children}
      </motion.div>
    </>
  );
}
