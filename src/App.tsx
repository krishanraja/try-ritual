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
import Landing from "./pages/Landing";
import Home from "./pages/Home";
import Auth from "./pages/Auth";
import QuickInput from "./pages/QuickInput";
import RitualCards from "./pages/RitualCards";
import RitualPicker from "./pages/RitualPicker";
import History from "./pages/History";
import Profile from "./pages/Profile";
import Contact from "./pages/Contact";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AnimatedRoutes = () => {
  const location = useLocation();
  
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<PageTransition><Landing /></PageTransition>} />
        <Route path="/auth" element={<PageTransition><Auth /></PageTransition>} />
        <Route path="/home" element={<PageTransition><Home /></PageTransition>} />
        <Route path="/input" element={<PageTransition><QuickInput /></PageTransition>} />
        <Route path="/picker" element={<PageTransition><RitualPicker /></PageTransition>} />
        <Route path="/rituals" element={<PageTransition><RitualCards /></PageTransition>} />
        <Route path="/history" element={<PageTransition><History /></PageTransition>} />
        <Route path="/profile" element={<PageTransition><Profile /></PageTransition>} />
        <Route path="/contact" element={<PageTransition><Contact /></PageTransition>} />
        <Route path="/terms" element={<PageTransition><Terms /></PageTransition>} />
        <Route path="/privacy" element={<PageTransition><Privacy /></PageTransition>} />
        <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
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
