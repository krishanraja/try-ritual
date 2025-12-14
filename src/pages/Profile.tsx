import { useCouple } from '@/contexts/CoupleContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LogOut, UserPlus, UserMinus, MapPin, Copy, Check, Calendar, Heart, Trash2, Smile } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LocationToggle, City } from '@/components/LocationToggle';
import { useState, useEffect } from 'react';
import { useSEO, addStructuredData, getLocationStructuredData } from '@/hooks/useSEO';
import { NotificationContainer } from '@/components/InlineNotification';
import { JoinDrawer } from '@/components/JoinDrawer';
import { BucketListManager } from '@/components/BucketListManager';
import { LeaveConfirmDialog } from '@/components/LeaveConfirmDialog';
import { DeleteAccountDialog } from '@/components/DeleteAccountDialog';
import { PremiumSection } from '@/components/PremiumSection';
import { NotificationSettings } from '@/components/NotificationSettings';
import { usePremium } from '@/hooks/usePremium';
import { format } from 'date-fns';
import { AvatarSelector, getAvatarSrc } from '@/components/AvatarSelector';

export default function Profile() {
  const { user, couple, partnerProfile, leaveCouple, currentCycle } = useCouple();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [selectedCity, setSelectedCity] = useState<City>('New York');
  const [loading, setLoading] = useState(true);
  const [joinOpen, setJoinOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const { refresh: refreshPremium } = usePremium();

  // Handle checkout return
  useEffect(() => {
    const checkoutStatus = searchParams.get('checkout');
    if (checkoutStatus === 'success') {
      setNotification({ type: 'success', message: 'Welcome to Premium! Your subscription is now active.' });
      refreshPremium();
      // Clean URL
      window.history.replaceState({}, '', '/profile');
    } else if (checkoutStatus === 'cancelled') {
      setNotification({ type: 'info', message: 'Checkout cancelled. You can upgrade anytime.' });
      window.history.replaceState({}, '', '/profile');
    }
  }, [searchParams, refreshPremium]);

  // SEO for profile page
  useSEO({
    title: 'Profile & Settings',
    description: 'Manage your profile, select your city location, and customize your ritual preferences.',
  });

  useEffect(() => {
    if (user) {
      loadUserProfile();
    } else {
      setLoading(false);
    }
  }, [user]);

  const loadUserProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('avatar_id')
        .eq('id', user!.id)
        .single();

      if (error) throw error;
      if (data?.avatar_id) {
        setSelectedAvatar(data.avatar_id);
      }
      
      // Also load city if couple exists
      if (couple) {
        const { data: coupleData } = await supabase
          .from('couples')
          .select('preferred_city')
          .eq('id', couple.id)
          .single();
        if (coupleData?.preferred_city) {
          setSelectedCity(coupleData.preferred_city as City);
        }
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Add location-specific structured data
    if (selectedCity) {
      addStructuredData(getLocationStructuredData(selectedCity));
    }
  }, [selectedCity]);

  const handleAvatarChange = async (avatarId: string | null) => {
    if (!user) return;
    setAvatarLoading(true);
    setSelectedAvatar(avatarId);
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_id: avatarId })
        .eq('id', user.id);

      if (error) throw error;
      setNotification({ type: 'success', message: avatarId ? 'Avatar updated!' : 'Avatar removed' });
      setTimeout(() => setNotification(null), 2000);
    } catch (error) {
      console.error('Error updating avatar:', error);
      setNotification({ type: 'error', message: 'Failed to update avatar' });
      setTimeout(() => setNotification(null), 3000);
    } finally {
      setAvatarLoading(false);
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
      
      setNotification({ type: 'success', message: `Rituals will now be tailored for ${city}` });
      setTimeout(() => setNotification(null), 3000);
    } catch (error) {
      console.error('Error updating city:', error);
      setNotification({ type: 'error', message: 'Failed to update location' });
      setTimeout(() => setNotification(null), 5000);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const handleLeaveCouple = async () => {
    const result = await leaveCouple();
    if (result.success) {
      setNotification({ type: 'success', message: 'You have left the couple' });
      setTimeout(() => navigate('/'), 1500);
    } else {
      setNotification({ type: 'error', message: result.error || 'Failed to leave couple' });
    }
  };

  return (
    <div className="h-full flex flex-col bg-gradient-warm">
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="p-4 space-y-4 flex flex-col min-h-full">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-3"
          >
            <div className="w-20 h-20 bg-gradient-ritual rounded-full mx-auto flex items-center justify-center text-3xl text-white font-bold overflow-hidden">
              {selectedAvatar && getAvatarSrc(selectedAvatar) ? (
                <img 
                  src={getAvatarSrc(selectedAvatar)!} 
                  alt="Your avatar" 
                  className="w-full h-full object-cover"
                />
              ) : (
                user?.email?.charAt(0).toUpperCase()
              )}
            </div>
            <div>
              <h1 className="text-xl font-bold">{user?.email}</h1>
              <p className="text-sm text-muted-foreground">
                {couple ? (
                  couple.partner_two 
                    ? `Connected with ${partnerProfile?.name || 'Partner'}` 
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
            {/* Inline Notifications */}
            <NotificationContainer 
              notification={notification} 
              onDismiss={() => setNotification(null)} 
            />

            {/* Avatar Selection */}
            <Card className="p-4 bg-white/90">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Smile className="w-4 h-4" />
                  <span>Choose Your Avatar</span>
                  <span className="text-xs text-muted-foreground font-normal">(optional)</span>
                </div>
                <AvatarSelector 
                  selected={selectedAvatar} 
                  onChange={handleAvatarChange}
                  disabled={avatarLoading}
                />
              </div>
            </Card>

            {/* This Week's Ritual */}
            {currentCycle?.agreement_reached && currentCycle?.agreed_ritual && currentCycle?.agreed_date && (
              <Card 
                className="p-4 bg-gradient-ritual text-white cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => navigate('/rituals')}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Heart className="w-4 h-4" fill="currentColor" />
                      <span className="text-xs font-semibold">This Week's Ritual</span>
                    </div>
                    <h3 className="font-bold text-lg">{(currentCycle.agreed_ritual as any)?.title || 'This Week\'s Ritual'}</h3>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs opacity-90">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>{format(new Date(currentCycle.agreed_date), 'MMM d')}</span>
                  </div>
                  {currentCycle.agreed_time && (
                    <span>at {currentCycle.agreed_time}</span>
                  )}
                </div>
              </Card>
            )}

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

            {/* Premium Section */}
            {couple && <PremiumSection />}

            {/* Notification Settings */}
            <NotificationSettings />

            {/* Bucket List Section */}
            {couple && <BucketListManager />}

            {couple ? (
              <>
                <Card className="p-4 bg-white/90">
                  <Button
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(couple.couple_code);
                        setCopied(true);
                        setNotification({ type: 'success', message: `Code copied: ${couple.couple_code}` });
                        setTimeout(() => {
                          setCopied(false);
                          setNotification(null);
                        }, 2000);
                      } catch (error) {
                        setNotification({ type: 'error', message: 'Failed to copy code' });
                        setTimeout(() => setNotification(null), 3000);
                      }
                    }}
                    variant="ghost"
                    className="w-full justify-start"
                  >
                    {copied ? (
                      <>
                        <Check className="w-5 h-5 mr-3" />
                        <span>Code Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-5 h-5 mr-3" />
                        <span>Copy Couple Code</span>
                      </>
                    )}
                  </Button>
                </Card>

                <Card className="p-4 bg-white/90">
                  <Button
                    onClick={() => setLeaveDialogOpen(true)}
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
                  onClick={() => setJoinOpen(true)}
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

            {/* Danger Zone */}
            <Card className="p-4 bg-destructive/5 border-destructive/20">
              <p className="text-xs text-destructive font-semibold mb-3">Danger Zone</p>
              <Button
                onClick={() => setDeleteDialogOpen(true)}
                variant="ghost"
                className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="w-5 h-5 mr-3" />
                <span>Delete Account</span>
              </Button>
            </Card>
          </motion.div>

          <div className="text-center text-xs text-muted-foreground pt-4 space-y-1">
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <button onClick={() => navigate('/faq')} className="hover:text-foreground transition-colors">Help & FAQ</button>
              <span>·</span>
              <button onClick={() => navigate('/terms')} className="hover:text-foreground transition-colors">Terms</button>
              <span>·</span>
              <button onClick={() => navigate('/privacy')} className="hover:text-foreground transition-colors">Privacy</button>
              <span>·</span>
              <button onClick={() => navigate('/contact')} className="hover:text-foreground transition-colors">Contact</button>
            </div>
            <p>© {new Date().getFullYear()} Mindmaker LLC · v1.6.4</p>
          </div>
        </div>
        <JoinDrawer open={joinOpen} onOpenChange={setJoinOpen} />
        <LeaveConfirmDialog 
          open={leaveDialogOpen} 
          onOpenChange={setLeaveDialogOpen}
          onConfirm={handleLeaveCouple}
          partnerName={partnerProfile?.name}
        />
        <DeleteAccountDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          userEmail={user?.email}
        />
      </div>
    </div>
  );
}
