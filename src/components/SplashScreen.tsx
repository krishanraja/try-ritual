/**
 * SplashScreen Component
 * 
 * Coordinates splash screen visibility with app loading state.
 * Ensures stable layout - splash stays until data is ready.
 * 
 * @created 2025-12-13
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCouple } from '@/contexts/CoupleContext';
import ritualIcon from '@/assets/ritual-icon.png';

interface SplashScreenProps {
  children: React.ReactNode;
}

export function SplashScreen({ children }: SplashScreenProps) {
  const { loading } = useCouple();
  const [showSplash, setShowSplash] = useState(true);
  const [contentReady, setContentReady] = useState(false);

  // Diagnostic logging for loading prop changes
  useEffect(() => {
    console.log('[DIAG] SplashScreen: loading prop changed', {
      loading,
      showSplash,
      contentReady,
      timestamp: new Date().toISOString(),
    });
  }, [loading, showSplash, contentReady]);

  // Hide native HTML splash immediately since we're using React splash
  useEffect(() => {
    console.log('[DIAG] SplashScreen: Hiding native HTML splash');
    const nativeSplash = document.getElementById('splash');
    if (nativeSplash) {
      nativeSplash.style.display = 'none';
      nativeSplash.remove();
      console.log('[DIAG] SplashScreen: Native splash removed');
    } else {
      console.log('[DIAG] SplashScreen: No native splash found');
    }
  }, []);

  // Fallback timeout to prevent infinite splash screen
  useEffect(() => {
    console.log('[DIAG] SplashScreen: Creating fallback timeout (5s)');
    const fallbackTimeout = setTimeout(() => {
      if (showSplash) {
        console.warn('[SplashScreen] ⚠️ Fallback timeout (5s) - forcing splash to hide');
        console.warn('[SplashScreen] This indicates the app is stuck loading. Check browser console for errors.');
        console.log('[DIAG] SplashScreen: Fallback timeout firing, setting contentReady=true and showSplash=false');
        setContentReady(true);
        setShowSplash(false);
      } else {
        console.log('[DIAG] SplashScreen: Fallback timeout fired but splash already hidden');
      }
    }, 5000);

    return () => {
      console.log('[DIAG] SplashScreen: Clearing fallback timeout');
      clearTimeout(fallbackTimeout);
    };
  }, [showSplash]);

  // Wait for loading to complete, then delay for smooth transition
  useEffect(() => {
    console.log('[DIAG] SplashScreen: Loading state effect, loading=', loading);
    if (!loading) {
      // Content is ready, prepare to show it
      console.log('[DIAG] SplashScreen: Loading complete, setting contentReady=true');
      setContentReady(true);
      
      // Small delay to ensure React has rendered, then fade out splash
      console.log('[DIAG] SplashScreen: Setting timer to hide splash in 150ms');
      const timer = setTimeout(() => {
        console.log('[DIAG] SplashScreen: Timer fired, setting showSplash=false');
        setShowSplash(false);
      }, 150);
      
      return () => {
        console.log('[DIAG] SplashScreen: Clearing hide splash timer');
        clearTimeout(timer);
      };
    }
  }, [loading]);

  // Force-hide mechanism: directly manipulate DOM if React state fails after 6s
  useEffect(() => {
    if (showSplash) {
      console.log('[DIAG] SplashScreen: Setting up force-hide mechanism (6s)');
      const forceHideTimeout = setTimeout(() => {
        if (showSplash) {
          console.warn('[SplashScreen] ⚠️ Force-hide mechanism triggered (6s) - directly hiding splash via DOM');
          const splashElement = document.querySelector('.fixed.inset-0.z-\\[9999\\]');
          if (splashElement) {
            (splashElement as HTMLElement).style.display = 'none';
            console.log('[DIAG] SplashScreen: Force-hid splash element via DOM manipulation');
          }
          // Also try to update state as fallback
          setContentReady(true);
          setShowSplash(false);
        }
      }, 6000);
      
      return () => {
        console.log('[DIAG] SplashScreen: Clearing force-hide timeout');
        clearTimeout(forceHideTimeout);
      };
    }
  }, [showSplash]);

  return (
    <>
      {/* React-controlled splash screen */}
      <AnimatePresence>
        {showSplash && (
          <motion.div
            key="splash"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
            style={{
              background: 'linear-gradient(180deg, hsla(270, 40%, 92%, 0.95), hsla(220, 20%, 97%, 0.98))'
            }}
          >
            {/* Branded icon with pulsing animation */}
            <div className="relative flex items-center justify-center mb-4">
              {/* Outer glow ring */}
              <motion.div
                className="absolute w-28 h-28 rounded-full"
                style={{
                  background: 'conic-gradient(from 0deg, hsl(175 65% 42%), hsl(270 55% 55%), hsl(175 65% 42%))',
                  opacity: 0.25,
                }}
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
              />
              
              {/* Icon container with pulse */}
              <motion.div
                className="relative w-24 h-24 rounded-full bg-gradient-to-br from-primary/10 to-purple-200/20 flex items-center justify-center"
                animate={{
                  boxShadow: [
                    '0 0 0 0 hsl(175 65% 42% / 0)',
                    '0 0 20px 8px hsl(175 65% 42% / 0.2)',
                    '0 0 0 0 hsl(175 65% 42% / 0)',
                  ],
                }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              >
                <motion.img
                  src={ritualIcon}
                  alt="Ritual"
                  className="w-16 h-16 object-contain"
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                />
              </motion.div>
            </div>
            
            {/* Logo text */}
            <img 
              src="/ritual-logo-full.png" 
              alt="Ritual" 
              className="relative max-h-16 w-auto"
            />
            
            {/* Tagline */}
            <p 
              className="relative mt-10 text-[15px] font-semibold italic tracking-wide"
              style={{
                background: 'linear-gradient(135deg, hsl(175, 55%, 35%), hsl(270, 55%, 55%))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Re-love your partner
            </p>
            
            {/* Loading text */}
            <p 
              className="relative mt-6 text-[13px] font-medium tracking-wide text-muted-foreground animate-pulse"
            >
              Loading your experience...
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main content - render but invisible until splash fades */}
      <div 
        className={`transition-opacity duration-300 ${
          contentReady && !showSplash ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ 
          pointerEvents: showSplash ? 'none' : 'auto',
        }}
        data-diag-content-ready={contentReady}
        data-diag-show-splash={showSplash}
        data-diag-loading={loading}
      >
        {children}
      </div>
    </>
  );
}
