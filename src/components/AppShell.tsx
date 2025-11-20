import { ReactNode, useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Calendar, Clock, User, Share2, UserPlus } from 'lucide-react';
import { Button } from './ui/button';
import { useCouple } from '@/contexts/CoupleContext';
import { ShareDrawer } from './ShareDrawer';
import { JoinDrawer } from './JoinDrawer';
import { RitualLogo } from './RitualLogo';
import { motion } from 'framer-motion';

interface AppShellProps {
  children: ReactNode;
}

export const AppShell = ({ children }: AppShellProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, couple } = useCouple();
  const [shareOpen, setShareOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  
  const isAuthPage = location.pathname === '/auth';
  const showNav = user && !isAuthPage;

  useEffect(() => {
    const handleOpenShare = () => setShareOpen(true);
    const handleOpenJoin = () => setJoinOpen(true);
    
    window.addEventListener('openShareDrawer', handleOpenShare);
    window.addEventListener('openJoinDrawer', handleOpenJoin);
    
    return () => {
      window.removeEventListener('openShareDrawer', handleOpenShare);
      window.removeEventListener('openJoinDrawer', handleOpenJoin);
    };
  }, []);

  const navItems = [
    { path: '/home', icon: Home, label: 'Home' },
    { path: '/input', icon: Calendar, label: 'This Week' },
    { path: '/history', icon: Clock, label: 'History' },
    { path: '/profile', icon: User, label: 'Profile' }
  ];

  const getPartnerName = () => {
    if (!couple?.partner_two) return 'Waiting for partner';
    return 'Connected';
  };

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
            <RitualLogo size="sm" />
          </button>
          
          <div className="flex items-center gap-2">
            <div className="text-xs text-muted-foreground hidden sm:block">
              {couple ? (
                <span className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${couple.partner_two ? 'bg-green-500' : 'bg-amber-500'} animate-pulse`} />
                  {getPartnerName()}
                </span>
              ) : (
                'Solo Mode'
              )}
            </div>
            
            {couple && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setShareOpen(true)}
                className="flex items-center gap-2"
              >
                <Share2 className="w-4 h-4" />
                <span className="hidden sm:inline">Share</span>
              </Button>
            )}
            
            {!couple && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setJoinOpen(true)}
                className="flex items-center gap-2"
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
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`flex flex-col items-center gap-1 transition-colors ${
                  isActive ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                <Icon className="w-6 h-6" />
                <span className="text-xs font-medium">{item.label}</span>
              </button>
            );
          })}
        </motion.nav>
      )}

      {/* Drawers */}
      {couple && (
        <ShareDrawer 
          open={shareOpen} 
          onOpenChange={setShareOpen}
          coupleCode={couple.couple_code}
        />
      )}
      <JoinDrawer open={joinOpen} onOpenChange={setJoinOpen} />
    </div>
  );
};