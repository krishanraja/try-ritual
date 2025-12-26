/**
 * SplashScreen Component
 * 
 * Single branded loading experience. Shows until ALL critical data is ready.
 * Follows Google UX principles:
 * - One loading state, one transition
 * - Content pre-renders invisibly underneath
 * - Atomic reveal with smooth crossfade
 * 
 * @created 2025-12-13
 * @updated 2025-12-24 - Simplified, removed diagnostic logs
 */

import { useEffect, useState, useRef } from 'react';
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
  const showSplashRef = useRef(true);

  // Remove native HTML splash immediately
  useEffect(() => {
    const nativeSplash = document.getElementById('splash');
    if (nativeSplash) {
      nativeSplash.style.display = 'none';
      nativeSplash.remove();
    }
  }, []);

  // Fallback timeout - max 4s to prevent infinite splash (runs once on mount)
  useEffect(() => {
    const fallbackTimeout = setTimeout(() => {
      if (showSplashRef.current) {
        console.warn('[SplashScreen] Fallback timeout (4s) - forcing reveal');
        showSplashRef.current = false;
        setContentReady(true);
        setShowSplash(false);
      }
    }, 4000);

    return () => clearTimeout(fallbackTimeout);
  }, []);

  // When loading completes, reveal content
  useEffect(() => {
    if (!loading) {
      // Mark content ready immediately
      setContentReady(true);
      
      // Brief delay for React to render, then fade out splash
      const timer = setTimeout(() => {
        showSplashRef.current = false;
        setShowSplash(false);
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [loading]);

  return (
    <>
      {/* Branded splash screen */}
      <AnimatePresence>
        {showSplash && (
          <motion.div
            key="splash"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
            style={{
              background: 'linear-gradient(180deg, hsla(270, 40%, 92%, 0.95), hsla(220, 20%, 97%, 0.98))'
            }}
          >
            {/* Animated icon */}
            <div className="relative flex items-center justify-center mb-4">
              <motion.div
                className="absolute w-28 h-28 rounded-full"
                style={{
                  background: 'conic-gradient(from 0deg, hsl(175 65% 42%), hsl(270 55% 55%), hsl(175 65% 42%))',
                  opacity: 0.25,
                }}
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
              />
              
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
            
            {/* Logo */}
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
            <p className="relative mt-6 text-[13px] font-medium tracking-wide text-muted-foreground animate-pulse">
              Loading your experience...
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main content - renders invisibly, revealed atomically */}
      <div 
        className={contentReady && !showSplash ? 'opacity-100' : 'opacity-0'}
        style={{ 
          pointerEvents: showSplash ? 'none' : 'auto',
          transition: 'opacity 0.2s ease-out',
        }}
      >
        {children}
      </div>
    </>
  );
}
