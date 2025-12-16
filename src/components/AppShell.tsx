/**
 * AppShell Component
 * 
 * Main application layout with header and bottom navigation.
 * No entry animations to prevent layout shift - splash handles coordinated reveal.
 * 
 * @updated 2025-12-13 - Removed competing animations for stable layout
 */

import { ReactNode, useState, useMemo, memo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Calendar, Images, User, UserPlus, LucideIcon } from 'lucide-react';
import { Button } from './ui/button';
import { useCouple } from '@/contexts/CoupleContext';
import { JoinDrawer } from './JoinDrawer';
import { CreateCoupleDialog } from './CreateCoupleDialog';
import { StatusIndicator } from './StatusIndicator';
import { RitualLogo } from './RitualLogo';
import { motion } from 'framer-motion';

interface AppShellProps {
  children: ReactNode;
}

interface NavItem {
  path: string;
  icon: LucideIcon;
  label: string;
  isActive: boolean;
  stepLabel?: string;
  disabled?: boolean;
}

export const AppShell = ({ children }: AppShellProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, couple, currentCycle, loading } = useCouple();
  const [joinOpen, setJoinOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  
  const isAuthPage = location.pathname === '/auth';
  // Don't show nav while loading to prevent flash
  const showNav = user && !isAuthPage && !loading;

  // Memoize computed values to prevent unnecessary recalculations
  const thisWeekStepLabel = useMemo((): string | undefined => {
    switch (location.pathname) {
      case '/input': return 'Input';
      case '/picker': return 'Pick';
      case '/rituals': return 'Scheduled';
      default: return undefined;
    }
  }, [location.pathname]);

  const thisWeekRoute = useMemo(() => {
    if (!couple || !couple.partner_two) return '/';
    
    if (!currentCycle) return '/input';
    
    const isPartnerOne = couple.partner_one === user?.id;
    const userSubmitted = isPartnerOne 
      ? currentCycle.partner_one_input 
      : currentCycle.partner_two_input;
    const partnerSubmitted = isPartnerOne
      ? currentCycle.partner_two_input
      : currentCycle.partner_one_input;
    
    // Both submitted and agreed on ritual
    if (currentCycle.agreement_reached && currentCycle.agreed_ritual) {
      return '/rituals';
    }
    
    // Both submitted, has synthesized output but no agreement yet
    if (userSubmitted && partnerSubmitted && currentCycle.synthesized_output) {
      return '/picker';
    }
    
    // User submitted, waiting for partner
    if (userSubmitted) {
      return '/';
    }
    
    // Neither submitted yet
    return '/input';
  }, [couple, currentCycle, user?.id]);
  
  const isThisWeekActive = useMemo(() => {
    const thisWeekRoutes = ['/input', '/picker', '/rituals'];
    return thisWeekRoutes.includes(location.pathname);
  }, [location.pathname]);
  
  // Check if ritual space is accessible (couple exists with partner)
  const hasRitualSpace = useMemo(() => couple && couple.partner_two, [couple]);
  
  // Dynamic home label based on state
  const homeLabel = useMemo((): string => {
    if (!couple) return 'Home';
    if (!couple.partner_two) return 'Waiting';
    return 'Dashboard';
  }, [couple]);
  
  const navItems: NavItem[] = useMemo(() => [
    { path: '/', icon: Home, label: homeLabel, isActive: location.pathname === '/' },
    { path: thisWeekRoute, icon: Calendar, label: 'This Week', isActive: isThisWeekActive, stepLabel: thisWeekStepLabel, disabled: !hasRitualSpace },
    { path: '/memories', icon: Images, label: 'Memories', isActive: location.pathname === '/memories', disabled: !hasRitualSpace },
    { path: '/profile', icon: User, label: 'Profile', isActive: location.pathname === '/profile' }
  ], [homeLabel, thisWeekRoute, isThisWeekActive, thisWeekStepLabel, hasRitualSpace, location.pathname]);

  return (
    <div className="flex flex-col h-screen bg-gradient-warm overflow-hidden">
      {/* Top Bar - no animation to prevent layout shift */}
      {showNav && (
        <header className="flex-none flex items-center justify-between px-4 py-3 bg-background/80 backdrop-blur-sm border-b border-border/50 z-50">
          <button onClick={() => navigate('/')} className="focus:outline-none">
            <RitualLogo size="sm" variant="icon" />
          </button>
          
          <div className="flex items-center gap-3">
            <StatusIndicator />
            
            {!couple && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setJoinOpen(true)}
                className="flex items-center gap-2 h-8 px-3"
              >
                <UserPlus className="w-4 h-4" />
                <span className="hidden sm:inline">Join</span>
              </Button>
            )}
          </div>
        </header>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        {children}
      </main>

      {/* Bottom Navigation - no animation to prevent layout shift */}
      {showNav && (
        <nav className="flex-none flex items-center justify-around px-4 py-3 bg-background/95 backdrop-blur-sm border-t border-border/50 z-50 pb-safe">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isDisabled = item.disabled;
            
            return (
              <button
                key={item.label}
                onClick={() => {
                  if (isDisabled) return;
                  navigate(item.path);
                }}
                className={`relative flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-all duration-200 active:scale-90 ${
                  isDisabled 
                    ? 'opacity-40 cursor-not-allowed text-muted-foreground' 
                    : item.isActive 
                      ? 'text-primary' 
                      : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {/* Active indicator background */}
                {item.isActive && !isDisabled && (
                  <motion.div
                    layoutId="nav-active-bg"
                    className="absolute inset-0 bg-primary/10 rounded-lg"
                    initial={false}
                    transition={{ type: "spring", stiffness: 500, damping: 35 }}
                  />
                )}
                <div className={`relative z-10 transition-transform duration-200 ${item.isActive && !isDisabled ? 'scale-110' : 'scale-100'}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <span className={`relative z-10 text-xs ${item.isActive && !isDisabled ? 'font-semibold' : 'font-medium'}`}>
                  {item.label}
                </span>
                {/* Step indicator for This Week */}
                {item.stepLabel && item.isActive && !isDisabled && (
                  <span className="absolute -top-1 -right-1 text-[10px] font-bold bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full z-20">
                    {item.stepLabel}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      )}

      {/* Drawers */}
      <JoinDrawer open={joinOpen} onOpenChange={setJoinOpen} />
      <CreateCoupleDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
};
