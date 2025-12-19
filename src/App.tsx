/**
 * App.tsx
 * 
 * Main application component with routing and providers.
 * 
 * @updated 2025-12-13 - Added SEO pages (FAQ, Blog)
 */

import { Suspense, lazy, memo } from "react";

// #region agent log - React core imported
fetch('http://127.0.0.1:7243/ingest/265854d9-dd9a-485b-b5e4-fb8ae00c17c3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.tsx:10',message:'React core imports successful',data:{SuspenseExists:typeof Suspense!=='undefined',lazyExists:typeof lazy==='function',memoExists:typeof memo==='function'},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'})}).catch(()=>{});
// #endregion

import { Toaster } from "@/components/ui/toaster";

// #region agent log - Radix Toaster loaded
fetch('http://127.0.0.1:7243/ingest/265854d9-dd9a-485b-b5e4-fb8ae00c17c3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.tsx:17',message:'Radix Toaster imported successfully',data:{ToasterExists:typeof Toaster==='function'},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'})}).catch(()=>{});
// #endregion

import { TooltipProvider } from "@/components/ui/tooltip";

// #region agent log - Radix Tooltip loaded
fetch('http://127.0.0.1:7243/ingest/265854d9-dd9a-485b-b5e4-fb8ae00c17c3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.tsx:23',message:'Radix TooltipProvider imported successfully',data:{TooltipProviderExists:typeof TooltipProvider!=='undefined'},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'})}).catch(()=>{});
// #endregion
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { CoupleProvider } from "@/contexts/CoupleContext";
import { AnalyticsProvider } from "@/contexts/AnalyticsContext";
import { AppShell } from "@/components/AppShell";
import { SplashScreen } from "@/components/SplashScreen";
import { ContextualFeedback } from "@/components/ContextualFeedback";
import { ErrorBoundary } from "@/components/ErrorBoundary";

// Critical: Landing page loads immediately for fast LCP
import Landing from "./pages/Landing";

// Code-split non-critical routes for smaller initial bundle
const Auth = lazy(() => import("./pages/Auth"));
const QuickInput = lazy(() => import("./pages/QuickInput"));
const RitualCards = lazy(() => import("./pages/RitualCards"));
const RitualPicker = lazy(() => import("./pages/RitualPicker"));
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

// Minimal loading fallback for lazy routes - matches app background
const LazyFallback = () => (
  <div className="h-full flex items-center justify-center bg-gradient-warm">
    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

const AnimatedRoutes = memo(() => {
  const location = useLocation();
  
  return (
    <AnimatePresence mode="wait" initial={false}>
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Landing />} />
        <Route path="/auth" element={<Suspense fallback={<LazyFallback />}><Auth /></Suspense>} />
        
        <Route path="/input" element={<Suspense fallback={<LazyFallback />}><QuickInput /></Suspense>} />
        <Route path="/picker" element={<Suspense fallback={<LazyFallback />}><RitualPicker /></Suspense>} />
        <Route path="/rituals" element={<Suspense fallback={<LazyFallback />}><RitualCards /></Suspense>} />
        <Route path="/memories" element={<Suspense fallback={<LazyFallback />}><Memories /></Suspense>} />
        {/* Redirect old history route to memories */}
        <Route path="/history" element={<Navigate to="/memories" replace />} />
        <Route path="/profile" element={<Suspense fallback={<LazyFallback />}><Profile /></Suspense>} />
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
        <Toaster />
        <BrowserRouter>
          <CoupleProvider>
            <AnalyticsProvider>
              <SplashScreen>
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
