import { useCouple } from '@/contexts/CoupleContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LogOut, Share2, UserPlus, UserMinus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { StrictMobileViewport } from '@/components/StrictMobileViewport';

export default function Profile() {
  const { user, couple, shareCode, joinCouple, leaveCouple } = useCouple();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  const handleLeaveCouple = async () => {
    if (confirm('Are you sure you want to leave this couple? This cannot be undone.')) {
      await leaveCouple();
    }
  };

  return (
    <StrictMobileViewport>
      <div className="h-full bg-gradient-warm overflow-y-auto">
        <div className="p-4 space-y-4 flex flex-col justify-center min-h-full">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-3"
          >
            <div className="w-20 h-20 bg-gradient-ritual rounded-full mx-auto flex items-center justify-center text-3xl text-white font-bold">
              {user?.email?.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-xl font-bold">{user?.email}</h1>
              <p className="text-sm text-muted-foreground">
                {couple ? `Connected with ${couple.partner_two ? 'partner' : 'waiting...'}` : 'Solo Mode'}
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-3"
          >
            {couple ? (
              <>
                <Card className="p-4 bg-white/90">
                  <Button
                    onClick={shareCode}
                    variant="ghost"
                    className="w-full justify-start"
                  >
                    <Share2 className="w-5 h-5 mr-3" />
                    <span>Share Couple Code</span>
                  </Button>
                </Card>

                <Card className="p-4 bg-white/90">
                  <Button
                    onClick={handleLeaveCouple}
                    variant="ghost"
                    className="w-full justify-start text-destructive hover:text-destructive"
                  >
                    <UserMinus className="w-5 h-5 mr-3" />
                    <span>Leave Couple</span>
                  </Button>
                </Card>
              </>
            ) : (
              <Card className="p-4 bg-white/90">
                <Button
                  onClick={joinCouple}
                  variant="ghost"
                  className="w-full justify-start"
                >
                  <UserPlus className="w-5 h-5 mr-3" />
                  <span>Join a Couple</span>
                </Button>
              </Card>
            )}

            <Card className="p-4 bg-white/90">
              <Button
                onClick={handleSignOut}
                variant="ghost"
                className="w-full justify-start"
              >
                <LogOut className="w-5 h-5 mr-3" />
                <span>Sign Out</span>
              </Button>
            </Card>
          </motion.div>

          <div className="text-center text-sm text-muted-foreground pt-4">
            <p>Ritual v1.0</p>
            <p>Made with 💕 for shared moments</p>
          </div>
        </div>
      </div>
    </StrictMobileViewport>
  );
}
