import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import { useSEO } from '@/hooks/useSEO';
import { NotificationContainer } from '@/components/InlineNotification';
import { Check, X, Heart, Sparkles, Users } from 'lucide-react';
import { AnimatedGradientBackground } from '@/components/AnimatedGradientBackground';
import { RitualLogo } from '@/components/RitualLogo';
import { useIsMobile } from '@/hooks/use-mobile';
import ritualBackgroundVideo from '@/assets/ritual-background.mp4';
import ritualVideoPoster from '@/assets/ritual-video-poster.jpg';

const Auth = () => {
  const isMobile = useIsMobile();
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [searchParams] = useSearchParams();
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const navigate = useNavigate();

  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;
  const passwordStrong = password.length >= 8;

  // SEO for auth page
  useSEO({
    title: isLogin ? 'Sign In' : 'Create Account',
    description: 'Sign in or create an account to start building meaningful weekly rituals with your partner.',
  });

  // Store join intent if user came to join
  useEffect(() => {
    if (searchParams.get('join') === 'true') {
      sessionStorage.setItem('pendingAction', 'join');
      setIsLogin(false); // Switch to signup mode
    }
  }, [searchParams]);

  useEffect(() => {
    // Set up listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth event on /auth:", event);
      if (session) {
        navigate("/");
      }
    });

    // Then check existing session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.log("Auth page session check error:", error.message);
      }
      if (session) {
        navigate("/");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate password confirmation on signup
    if (!isLogin) {
      if (!passwordStrong) {
        showNotification('error', "Password must be at least 8 characters");
        return;
      }
      if (!passwordsMatch) {
        showNotification('error', "Passwords don't match");
        return;
      }
    }
    
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        showNotification('success', "Welcome back!");
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              name: name,
            },
          },
        });
        if (error) throw error;
        showNotification('success', "Account created! Welcome to Ritual.");
      }
    } catch (error: any) {
      showNotification('error', error.message);
    } finally {
      setLoading(false);
    }
  };

  // Mobile video background component
  const MobileVideoBackground = () => isMobile ? (
    <video
      autoPlay
      loop
      muted
      playsInline
      preload="auto"
      poster={ritualVideoPoster}
      onCanPlayThrough={() => setVideoLoaded(true)}
      className="fixed inset-0 z-[1] w-full h-full object-cover pointer-events-none opacity-20"
    >
      <source src={ritualBackgroundVideo} type="video/mp4" />
    </video>
  ) : null;

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 flex items-center justify-center p-4 relative overflow-y-auto min-h-0">
        <AnimatedGradientBackground variant="warm" />
        <MobileVideoBackground />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md relative z-10"
        >
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 shadow-card">
            {/* Branded Logo */}
            <div className="flex justify-center mb-6">
              <RitualLogo size="md" variant="full" />
            </div>
            
            <h1 className="text-2xl font-bold text-center mb-2 text-foreground">
              {isLogin ? "Welcome back" : "Join thousands of couples"}
            </h1>
            <p className="text-center text-muted-foreground mb-4">
              {isLogin 
                ? "Your partner might be waiting for you" 
                : "Building deeper connections, one ritual at a time"}
            </p>
            
            {/* Value proposition for signup */}
            {!isLogin && (
              <div className="flex justify-center gap-4 mb-6 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Heart className="w-3 h-3 text-pink-500" />
                  <span>Weekly rituals</span>
                </div>
                <div className="flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-purple-500" />
                  <span>AI-powered</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="w-3 h-3 text-teal-500" />
                  <span>For couples</span>
                </div>
              </div>
            )}

            {/* Inline Notification */}
            {notification && (
              <div className="mb-4">
                <NotificationContainer 
                  notification={notification} 
                  onDismiss={() => setNotification(null)} 
                />
              </div>
            )}

            <form onSubmit={handleAuth} className="space-y-6">
              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="name">Your name</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Enter your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required={!isLogin}
                    className="rounded-xl h-12"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="rounded-xl h-12"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="rounded-xl h-12"
                />
                {!isLogin && password.length > 0 && (
                  <div className="flex items-center gap-2 text-xs">
                    {passwordStrong ? (
                      <Check className="w-3 h-3 text-green-500" />
                    ) : (
                      <X className="w-3 h-3 text-destructive" />
                    )}
                    <span className={passwordStrong ? 'text-green-600' : 'text-muted-foreground'}>
                      At least 8 characters
                    </span>
                  </div>
                )}
              </div>

              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="rounded-xl h-12"
                  />
                  {confirmPassword.length > 0 && (
                    <div className="flex items-center gap-2 text-xs">
                      {passwordsMatch ? (
                        <Check className="w-3 h-3 text-green-500" />
                      ) : (
                        <X className="w-3 h-3 text-destructive" />
                      )}
                      <span className={passwordsMatch ? 'text-green-600' : 'text-destructive'}>
                        {passwordsMatch ? 'Passwords match' : 'Passwords don\'t match'}
                      </span>
                    </div>
                  )}
                </div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-ritual text-white hover:opacity-90 h-12 rounded-xl"
              >
                {loading ? "Loading..." : isLogin ? "Sign In" : "Sign Up"}
              </Button>
            </form>

            <button
              onClick={() => setIsLogin(!isLogin)}
              className="w-full mt-4 text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
            </button>

            <p className="text-xs text-center text-muted-foreground mt-4">
              By {isLogin ? 'signing in' : 'signing up'}, you agree to our{' '}
              <a href="/terms" className="underline hover:text-foreground">Terms</a> and{' '}
              <a href="/privacy" className="underline hover:text-foreground">Privacy Policy</a>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Auth;