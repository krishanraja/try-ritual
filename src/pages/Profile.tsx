import { useCouple } from '@/contexts/CoupleContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LogOut, Share2, UserPlus, UserMinus, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { StrictMobileViewport } from '@/components/StrictMobileViewport';
import { LocationToggle, City } from '@/components/LocationToggle';
import { useState, useEffect } from 'react';
import { toast } from '@/hooks/use-toast';

export default function Profile() {
  const { user, couple, partnerProfile, shareCode, joinCouple, leaveCouple } = useCouple();
  const navigate = useNavigate();
  const [selectedCity, setSelectedCity] = useState<City>('New York');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && couple) {
      loadPreferredCity();
    }
  }, [user, couple]);

  const loadPreferredCity = async () => {
    try {
      if (!couple) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('couples')
        .select('preferred_city')
        .eq('id', couple.id)
        .single();

      if (error) throw error;
      if (data?.preferred_city) {
        setSelectedCity(data.preferred_city as City);
      }
    } catch (error) {
      console.error('Error loading city preference:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCityChange = async (city: City) => {
    if (!couple) return;
    
    setSelectedCity(city);
    try {
      const { error } = await supabase
        .from('couples')
        .update({ preferred_city: city })
        .eq('id', couple.id);

      if (error) throw error;
      
      toast({
        title: "Location updated",
        description: `Your rituals will now be tailored for ${city}`,
      });
    } catch (error) {
      console.error('Error updating city:', error);
      toast({
        title: "Error",
        description: "Failed to update location",
        variant: "destructive",
      });
    }
  };

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
                {couple ? (
                  couple.partner_two 
                    ? `Connected with ${partnerProfile?.name || 'partner'}` 
                    : 'Waiting for partner...'
                ) : 'Solo Mode'}
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-3"
          >
            {/* Location Preference */}
            <Card className="p-4 bg-white/90">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <MapPin className="w-4 h-4" />
                  <span>Your City</span>
                </div>
                {!loading && (
                  <LocationToggle 
                    selected={selectedCity} 
                    onChange={handleCityChange} 
                  />
                )}
              </div>
            </Card>

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
