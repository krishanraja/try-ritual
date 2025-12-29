/**
 * App.tsx
 * 
 * Main application component with routing and providers.
 * 
 * @updated 2025-12-13 - Added SEO pages (FAQ, Blog)
 */

import { Suspense, lazy, memo } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { CoupleProvider } from "@/contexts/CoupleContext";
import { AnalyticsProvider } from "@/contexts/AnalyticsContext";
import { AppShell } from "@/components/AppShell";
import { SplashScreen } from "@/components/SplashScreen";
import { ContextualFeedback } from "@/components/ContextualFeedback";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ProtectedRoute, PublicRoute } from "@/components/ProtectedRoute";
import { SessionExpiredBanner } from "@/components/SessionExpiredBanner";
import { OfflineBanner } from "@/components/OfflineBanner";

// Critical: Landing page loads immediately for fast LCP
import Landing from "./pages/Landing";

// Code-split non-critical routes for smaller initial bundle
const Auth = lazy(() => import("./pages/Auth"));
const QuickInput = lazy(() => import("./pages/QuickInput"));
const RitualCards = lazy(() => import("./pages/RitualCards"));
const RitualPicker = lazy(() => import("./pages/RitualPicker"));
const RitualFlow = lazy(() => import("./pages/RitualFlow"));
const Memories = lazy(() => import("./pages/Memories"));
const Profile = lazy(() => import("./pages/Profile"));
const Contact = lazy(() => import("./pages/Contact"));
const Terms = lazy(() => import("./pages/Terms"));
const Privacy = lazy(() => import("./pages/Privacy"));
const NotFound = lazy(() => import("./pages/NotFound"));

// SEO pages - lazy loaded for content marketing
const FAQ = lazy(() => import("./pages/FAQ"));
const Blog = lazy(() => import("./pages/Blog"));
const BlogArticle = lazy(() => import("./pages/BlogArticle"));

// Optimized React Query configuration for performance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache data for 5 minutes (stale time)
      staleTime: 5 * 60 * 1000, // 5 minutes
      // Keep unused data in cache for 10 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      // Refetch on window focus only if data is stale
      refetchOnWindowFocus: false,
      // Don't refetch on reconnect if data is fresh
      refetchOnReconnect: 'always',
      // Retry failed requests once
      retry: 1,
      // Retry delay increases exponentially
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      // Retry mutations once
      retry: 1,
    },
  },
});

// Skeleton loading fallback for lazy routes - provides better perceived performance
const LazyFallback = () => (
  <div className="h-full flex flex-col bg-gradient-warm">
    {/* Header skeleton */}
    <div className="flex-none h-14 px-4 flex items-center justify-between">
      <div className="h-8 w-24 rounded-lg bg-muted/50 animate-pulse" />
      <div className="h-8 w-8 rounded-full bg-muted/50 animate-pulse" />
    </div>
    
    {/* Content skeleton */}
    <div className="flex-1 px-4 py-6 space-y-4">
      <div className="text-center space-y-2 mb-6">
        <div className="h-6 w-48 mx-auto rounded-lg bg-muted/50 animate-pulse" />
        <div className="h-4 w-32 mx-auto rounded-lg bg-muted/40 animate-pulse" />
      </div>
      
      {/* Card skeletons */}
      {[1, 2, 3].map((i) => (
        <div 
          key={i} 
          className="rounded-2xl bg-white/60 p-4 space-y-3"
          style={{ animationDelay: `${i * 100}ms` }}
        >
          <div className="flex items-start gap-3">
            <div className="h-12 w-12 rounded-xl bg-muted/50 animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-3/4 rounded bg-muted/50 animate-pulse" />
              <div className="h-3 w-1/2 rounded bg-muted/40 animate-pulse" />
            </div>
          </div>
        </div>
      ))}
    </div>
    
    {/* Bottom button skeleton */}
    <div className="flex-none p-4 pb-safe">
      <div className="h-12 w-full rounded-xl bg-muted/50 animate-pulse" />
    </div>
  </div>
);

const AnimatedRoutes = memo(() => {
  const location = useLocation();
  
  return (
    <AnimatePresence mode="wait" initial={false}>
      <Routes location={location} key={location.pathname}>
        {/* Public routes */}
        <Route path="/" element={<Landing />} />
        <Route path="/auth" element={
          <PublicRoute>
            <Suspense fallback={<LazyFallback />}><Auth /></Suspense>
          </PublicRoute>
        } />
        
        {/* Protected routes - require authenticated couple with partner */}
        <Route path="/flow" element={
          <ProtectedRoute requires="paired">
            <Suspense fallback={<LazyFallback />}><RitualFlow /></Suspense>
          </ProtectedRoute>
        } />
        {/* Legacy routes - redirect to unified flow */}
        <Route path="/input" element={<Navigate to="/flow" replace />} />
        <Route path="/picker" element={<Navigate to="/flow" replace />} />
        <Route path="/rituals" element={
          <ProtectedRoute requires="paired">
            <Suspense fallback={<LazyFallback />}><RitualCards /></Suspense>
          </ProtectedRoute>
        } />
        <Route path="/memories" element={
          <ProtectedRoute requires="paired">
            <Suspense fallback={<LazyFallback />}><Memories /></Suspense>
          </ProtectedRoute>
        } />
        {/* Redirect old history route to memories */}
        <Route path="/history" element={<Navigate to="/memories" replace />} />
        
        {/* Protected routes - require authentication only */}
        <Route path="/profile" element={
          <ProtectedRoute requires="auth">
            <Suspense fallback={<LazyFallback />}><Profile /></Suspense>
          </ProtectedRoute>
        } />
        
        {/* Public pages */}
        <Route path="/contact" element={<Suspense fallback={<LazyFallback />}><Contact /></Suspense>} />
        <Route path="/terms" element={<Suspense fallback={<LazyFallback />}><Terms /></Suspense>} />
        <Route path="/privacy" element={<Suspense fallback={<LazyFallback />}><Privacy /></Suspense>} />
        
        {/* SEO Pages */}
        <Route path="/faq" element={<Suspense fallback={<LazyFallback />}><FAQ /></Suspense>} />
        <Route path="/blog" element={<Suspense fallback={<LazyFallback />}><Blog /></Suspense>} />
        <Route path="/blog/:slug" element={<Suspense fallback={<LazyFallback />}><BlogArticle /></Suspense>} />
        
        <Route path="*" element={<Suspense fallback={<LazyFallback />}><NotFound /></Suspense>} />
      </Routes>
    </AnimatePresence>
  );
});

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter>
          <CoupleProvider>
            <AnalyticsProvider>
              <SplashScreen>
                <OfflineBanner />
                <SessionExpiredBanner />
                <AppShell>
                  <AnimatedRoutes />
                  <ContextualFeedback />
                </AppShell>
              </SplashScreen>
            </AnalyticsProvider>
          </CoupleProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
