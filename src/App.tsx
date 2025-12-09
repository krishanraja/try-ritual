import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { CoupleProvider } from "@/contexts/CoupleContext";
import { AnalyticsProvider } from "@/contexts/AnalyticsContext";
import { AppShell } from "@/components/AppShell";
import { ContextualFeedback } from "@/components/ContextualFeedback";
import { PageTransition } from "@/components/PageTransition";

// Critical: Landing page loads immediately for fast LCP
import Landing from "./pages/Landing";

// Code-split non-critical routes for smaller initial bundle
const Home = lazy(() => import("./pages/Home"));
const Auth = lazy(() => import("./pages/Auth"));
const QuickInput = lazy(() => import("./pages/QuickInput"));
const RitualCards = lazy(() => import("./pages/RitualCards"));
const RitualPicker = lazy(() => import("./pages/RitualPicker"));
const History = lazy(() => import("./pages/History"));
const Profile = lazy(() => import("./pages/Profile"));
const Contact = lazy(() => import("./pages/Contact"));
const Terms = lazy(() => import("./pages/Terms"));
const Privacy = lazy(() => import("./pages/Privacy"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

// Minimal loading fallback for lazy routes
const LazyFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

const AnimatedRoutes = () => {
  const location = useLocation();
  
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<PageTransition><Landing /></PageTransition>} />
        <Route path="/auth" element={<Suspense fallback={<LazyFallback />}><PageTransition><Auth /></PageTransition></Suspense>} />
        <Route path="/home" element={<Suspense fallback={<LazyFallback />}><PageTransition><Home /></PageTransition></Suspense>} />
        <Route path="/input" element={<Suspense fallback={<LazyFallback />}><PageTransition><QuickInput /></PageTransition></Suspense>} />
        <Route path="/picker" element={<Suspense fallback={<LazyFallback />}><PageTransition><RitualPicker /></PageTransition></Suspense>} />
        <Route path="/rituals" element={<Suspense fallback={<LazyFallback />}><PageTransition><RitualCards /></PageTransition></Suspense>} />
        <Route path="/history" element={<Suspense fallback={<LazyFallback />}><PageTransition><History /></PageTransition></Suspense>} />
        <Route path="/profile" element={<Suspense fallback={<LazyFallback />}><PageTransition><Profile /></PageTransition></Suspense>} />
        <Route path="/contact" element={<Suspense fallback={<LazyFallback />}><PageTransition><Contact /></PageTransition></Suspense>} />
        <Route path="/terms" element={<Suspense fallback={<LazyFallback />}><PageTransition><Terms /></PageTransition></Suspense>} />
        <Route path="/privacy" element={<Suspense fallback={<LazyFallback />}><PageTransition><Privacy /></PageTransition></Suspense>} />
        <Route path="*" element={<Suspense fallback={<LazyFallback />}><PageTransition><NotFound /></PageTransition></Suspense>} />
      </Routes>
    </AnimatePresence>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <BrowserRouter>
        <CoupleProvider>
          <AnalyticsProvider>
            <AppShell>
              <AnimatedRoutes />
              <ContextualFeedback />
            </AppShell>
          </AnalyticsProvider>
        </CoupleProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
