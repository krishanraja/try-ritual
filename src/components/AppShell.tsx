import { ReactNode, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Calendar, Clock, User, UserPlus } from 'lucide-react';
import { Button } from './ui/button';
import { useCouple } from '@/contexts/CoupleContext';
import { JoinDrawer } from './JoinDrawer';
import { CreateCoupleDialog } from './CreateCoupleDialog';
import { StatusIndicator } from './StatusIndicator';
import { motion } from 'framer-motion';

interface AppShellProps {
  children: ReactNode;
}

export const AppShell = ({ children }: AppShellProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, couple, currentCycle } = useCouple();
  const [joinOpen, setJoinOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  
  const isAuthPage = location.pathname === '/auth';
  const showNav = user && !isAuthPage;

  const getThisWeekRoute = () => {
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
  };

  // "This Week" matches any of these routes
  const thisWeekRoutes = ['/input', '/picker', '/rituals'];
  const thisWeekRoute = getThisWeekRoute();
  
  const isThisWeekActive = thisWeekRoutes.includes(location.pathname);
  
  const navItems = [
    { path: '/', icon: Home, label: 'Home', isActive: location.pathname === '/' },
    { path: thisWeekRoute, icon: Calendar, label: 'This Week', isActive: isThisWeekActive },
    { path: '/history', icon: Clock, label: 'History', isActive: location.pathname === '/history' },
    { path: '/profile', icon: User, label: 'Profile', isActive: location.pathname === '/profile' }
  ];

  return (
    <div className="flex flex-col h-screen bg-gradient-warm overflow-hidden">
      {/* Top Bar */}
      {showNav && (
        <motion.header 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="flex-none flex items-center justify-between px-4 py-3 bg-background/80 backdrop-blur-sm border-b border-border/50 z-50"
        >
          <button onClick={() => navigate('/')} className="focus:outline-none">
            <img 
              src="/favicon.png" 
              alt="Ritual" 
              className="h-8 w-auto object-contain"
            />
          </button>
          
          <div className="flex items-center gap-3">
            <StatusIndicator />
            
            {(!couple || (couple && !couple.partner_two)) && (
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
        </motion.header>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        {children}
      </main>

      {/* Bottom Navigation */}
      {showNav && (
        <motion.nav 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="flex-none flex items-center justify-around px-4 py-3 bg-background/95 backdrop-blur-sm border-t border-border/50 z-50 pb-safe"
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            
            return (
              <button
                key={item.label}
                onClick={() => navigate(item.path)}
                className={`relative flex flex-col items-center gap-1 px-3 py-1 rounded-lg transition-all duration-200 ${
                  item.isActive 
                    ? 'text-primary' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {/* Active indicator background */}
                {item.isActive && (
                  <motion.div
                    layoutId="nav-active-bg"
                    className="absolute inset-0 bg-primary/10 rounded-lg"
                    initial={false}
                    transition={{ type: "spring", stiffness: 500, damping: 35 }}
                  />
                )}
                <Icon className={`relative z-10 w-6 h-6 transition-transform ${item.isActive ? 'scale-110' : ''}`} />
                <span className={`relative z-10 text-xs font-medium ${item.isActive ? 'font-semibold' : ''}`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </motion.nav>
      )}

      {/* Drawers */}
      <JoinDrawer open={joinOpen} onOpenChange={setJoinOpen} />
      <CreateCoupleDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
};