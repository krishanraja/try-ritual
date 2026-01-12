import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import { useSEO } from '@/hooks/useSEO';
import { NotificationContainer } from '@/components/InlineNotification';
import { Check, X, Heart, Sparkles, Users } from 'lucide-react';
import { Chrome } from 'lucide-react';
import { AnimatedGradientBackground } from '@/components/AnimatedGradientBackground';
import { RitualLogo } from '@/components/RitualLogo';
import { useIsMobile } from '@/hooks/use-mobile';
import ritualBackgroundVideo from '@/assets/ritual-background.mp4';
import ritualVideoPoster from '@/assets/ritual-video-poster.jpg';

// Validation helpers
const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
};

const validateName = (name: string): boolean => {
  return name.trim().length >= 2 && name.trim().length <= 100;
};

import { getUserFriendlyError } from '@/utils/errorHandling';
import { logger } from '@/utils/logger';
import { 
  trackSignInAttempt, 
  trackSignInSuccess, 
  trackSignInError 
} from '@/utils/authAnalytics';

const getErrorMessage = (error: any): string => {
  return getUserFriendlyError(error);
};

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
  const [touched, setTouched] = useState<{ name?: boolean; email?: boolean; password?: boolean; confirmPassword?: boolean }>({});
  const navigate = useNavigate();

  // Validation state
  const emailValid = useMemo(() => email.length === 0 || validateEmail(email), [email]);
  const nameValid = useMemo(() => name.length === 0 || validateName(name), [name]);
  const passwordStrong = password.length >= 8;
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;
  
  // Form validation
  const canSubmit = useMemo(() => {
    if (isLogin) {
      return emailValid && email.length > 0 && password.length > 0;
    } else {
      return emailValid && email.length > 0 && 
             nameValid && name.length > 0 && 
             passwordStrong && passwordsMatch;
    }
  }, [isLogin, emailValid, email, nameValid, name, passwordStrong, passwordsMatch]);

  // SEO for auth page
  useSEO({
    title: isLogin ? 'Sign In' : 'Create Account',
    description: 'Sign in or create an account to start building meaningful weekly rituals with your partner.',
  });

  // Store join intent if user came to join, or signup intent
  useEffect(() => {
    if (searchParams.get('join') === 'true') {
      sessionStorage.setItem('pendingAction', 'join');
      setIsLogin(false); // Switch to signup mode
    } else if (searchParams.get('signup') === 'true') {
      setIsLogin(false); // Switch to signup mode for new users
    }
  }, [searchParams]);

  useEffect(() => {
    let subscription: { unsubscribe: () => void } | null = null;
    
    try {
      // Set up listener FIRST
      const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange((event, session) => {
        logger.log("[AUTH] Auth state change event:", event, "has session:", !!session);
        if (session) {
          logger.log("[AUTH] Session detected, navigating to home");
          navigate("/");
        } else if (event === 'SIGNED_OUT') {
          logger.log("[AUTH] User signed out");
        } else if (event === 'TOKEN_REFRESHED') {
          logger.log("[AUTH] Token refreshed");
        }
      });
      subscription = authSubscription;

      // Then check existing session with explicit error handling
      supabase.auth.getSession()
        .then(({ data: { session }, error }) => {
          if (error) {
            logger.error("[AUTH] Session check error:", error.message);
            // Don't show error to user - they might just not be logged in
            // Only log for debugging
          }
          if (session) {
            logger.log("[AUTH] Existing session found, navigating to home");
            navigate("/");
          } else {
            logger.log("[AUTH] No existing session, showing auth form");
          }
        })
        .catch((error) => {
          logger.error("[AUTH] Unexpected error checking session:", error);
          // Fail gracefully - allow user to still see auth form
        });
    } catch (error) {
      logger.error("[AUTH] Error initializing Supabase auth:", error);
      // Show user-friendly error message
      setNotification({
        type: 'error',
        message: 'Unable to connect to authentication service. Please check your connection and try again.'
      });
    }

    return () => {
      logger.debug("[AUTH] Cleaning up auth state listener");
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [navigate]);

  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleBlur = (field: 'name' | 'email' | 'password' | 'confirmPassword') => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const handleGoogleAuth = async () => {
    setLoading(true);
    setNotification(null);
    trackSignInAttempt(isLogin);

    try {
      logger.log("[AUTH] Attempting Google OAuth");
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        logger.error("[AUTH] Google OAuth error:", error.message);
        trackSignInError(isLogin, error.code || 'unknown', 'oauth');
        showNotification('error', 'Unable to sign in with Google. Please try again.');
        setLoading(false);
      } else {
        logger.log("[AUTH] Google OAuth initiated, redirecting...");
        // User will be redirected, so we don't set loading to false
        // Navigation will happen via redirect
      }
    } catch (error: any) {
      logger.error("[AUTH] Google OAuth error caught:", error);
      const friendlyMessage = getErrorMessage(error);
      showNotification('error', friendlyMessage || 'Unable to sign in with Google. Please try again.');
      setLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Mark all fields as touched
    setTouched({ name: true, email: true, password: true, confirmPassword: true });
    
    // Client-side validation
    if (!isLogin) {
      const trimmedName = name.trim();
      if (!trimmedName) {
        showNotification('error', "Please enter your name");
        return;
      }
      if (!validateName(trimmedName)) {
        showNotification('error', "Name must be between 2 and 100 characters");
        return;
      }
    }
    
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      showNotification('error', "Please enter your email address");
      return;
    }
    if (!validateEmail(trimmedEmail)) {
      showNotification('error', "Please enter a valid email address");
      return;
    }
    
    if (!password) {
      showNotification('error', "Please enter your password");
      return;
    }
    
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
    setNotification(null); // Clear any previous notifications
    const startTime = Date.now();
    trackSignInAttempt(isLogin);

    try {
      if (isLogin) {
        logger.log("[AUTH] Attempting sign in for:", trimmedEmail);
        const { data, error } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password,
        });
        
        if (error) {
          logger.error("[AUTH] Sign in error:", error.message);
          trackSignInError(true, error.code || 'unknown', 'auth');
          throw error;
        }
        
        logger.log("[AUTH] Sign in successful, user:", data.user?.id);
        trackSignInSuccess(true, Date.now() - startTime);
        // Success - navigation will happen via onAuthStateChange
        // Note: Don't set loading to false - let navigation handle it
      } else {
        logger.log("[AUTH] Attempting sign up for:", trimmedEmail);
        const { data, error } = await supabase.auth.signUp({
          email: trimmedEmail,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              name: name.trim(),
            },
          },
        });
        
        if (error) {
          logger.error("[AUTH] Sign up error:", error.message);
          trackSignInError(false, error.code || 'unknown', 'auth');
          throw error;
        }
        
        logger.log("[AUTH] Sign up successful, user:", data.user?.id);
        trackSignInSuccess(false, Date.now() - startTime);
        
        // Verify profile was created
        if (data.user) {
          // Log detailed signup response for debugging
          logger.log("[AUTH] Sign up response details:", {
            userId: data.user.id,
            email: data.user.email,
            metadata: data.user.user_metadata,
            hasSession: !!data.session
          });
          
          // Wait a brief moment for trigger to complete
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Try to verify profile was created
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();
          
          if (profileError || !profile) {
            logger.error("[AUTH] Profile creation failed:", {
              userId: data.user.id,
              error: profileError,
              profile,
              errorCode: profileError?.code,
              errorMessage: profileError?.message
            });
            
            // Attempt to create profile manually as fallback
            const { error: createError } = await supabase
              .from('profiles')
              .insert({
                id: data.user.id,
                name: data.user.user_metadata?.name || name.trim() || 'User',
                email: data.user.email || null
              });
            
            if (createError) {
              logger.error("[AUTH] Manual profile creation also failed:", {
                error: createError,
                errorCode: createError.code,
                errorMessage: createError.message,
                errorDetails: createError.details,
                errorHint: createError.hint
              });
              showNotification('error', 'Unable to create profile. Please try again.');
              setLoading(false);
              return;
            }
            logger.log("[AUTH] Profile created manually as fallback");
          } else {
            logger.log("[AUTH] Profile verified:", profile);
          }
        }
        
        // Check if email confirmation is required
        if (data.user && !data.session) {
          showNotification('info', 'Please check your email to confirm your account before signing in.');
          setLoading(false);
          return;
        }
        
        // Success - navigation will happen via onAuthStateChange
        // Note: Don't set loading to false - let navigation handle it
      }
    } catch (error: any) {
      logger.error("[AUTH] Auth error caught:", error);
      // Check if error is due to Supabase client not being initialized
      if (error?.message?.includes('Supabase configuration is invalid') || 
          error?.message?.includes('Failed to initialize Supabase client')) {
        showNotification('error', 'Authentication service is not properly configured. Please contact support.');
      } else {
        const friendlyMessage = getErrorMessage(error);
        showNotification('error', friendlyMessage);
      }
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
      <div className="flex-1 flex items-center justify-center p-3 sm:p-4 relative overflow-hidden min-h-0">
        <AnimatedGradientBackground variant="warm" />
        <MobileVideoBackground />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md relative z-10"
        >
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-5 sm:p-6 md:p-8 shadow-card max-h-[calc(100dvh-2rem)] overflow-y-auto">
            {/* Branded Logo */}
            <div className="flex justify-center mb-4 sm:mb-5">
              <RitualLogo size="md" variant="full" />
            </div>
            
            <h1 className="text-xl sm:text-2xl font-bold text-center mb-1 sm:mb-2 text-foreground">
              {isLogin ? "Welcome back" : "Join thousands of couples"}
            </h1>
            <p className="text-center text-sm sm:text-base text-muted-foreground mb-3 sm:mb-4">
              {isLogin 
                ? "Your partner might be waiting for you" 
                : "Building deeper connections, one ritual at a time"}
            </p>
            
            {/* Value proposition for signup */}
            {!isLogin && (
              <div className="flex justify-center gap-3 sm:gap-4 mb-4 sm:mb-5 text-[10px] sm:text-xs text-muted-foreground">
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
              <div className="mb-3 sm:mb-4">
                <NotificationContainer 
                  notification={notification} 
                  onDismiss={() => setNotification(null)} 
                />
              </div>
            )}

            <form onSubmit={handleAuth} className="space-y-4 sm:space-y-5">
              {!isLogin && (
                <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-sm">Your name</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Enter your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onBlur={() => handleBlur('name')}
                    required={!isLogin}
                    className={`rounded-xl h-11 sm:h-12 ${touched.name && !nameValid ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                  />
                  {touched.name && !nameValid && name.length > 0 && (
                    <p className="text-xs text-destructive">Name must be between 2 and 100 characters</p>
                  )}
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-sm">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => handleBlur('email')}
                  required
                  className={`rounded-xl h-11 sm:h-12 ${touched.email && !emailValid ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                />
                {touched.email && !emailValid && email.length > 0 && (
                  <p className="text-xs text-destructive">Please enter a valid email address</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-sm">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onBlur={() => handleBlur('password')}
                  required
                  className="rounded-xl h-11 sm:h-12"
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
                <div className="space-y-1.5">
                  <Label htmlFor="confirmPassword" className="text-sm">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    onBlur={() => handleBlur('confirmPassword')}
                    required
                    className="rounded-xl h-11 sm:h-12"
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
                disabled={loading || !canSubmit}
                className="w-full bg-gradient-ritual text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed h-11 sm:h-12 rounded-xl mt-2"
              >
                {loading ? "Loading..." : isLogin ? "Sign In" : "Sign Up"}
              </Button>
            </form>

            {/* Divider */}
            <div className="relative my-4 sm:my-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white px-2 text-muted-foreground">Or continue with</span>
              </div>
            </div>

            {/* Google OAuth Button */}
            <Button
              type="button"
              onClick={handleGoogleAuth}
              disabled={loading}
              variant="outline"
              className="w-full h-11 sm:h-12 rounded-xl border-2 hover:bg-muted/50 transition-colors"
            >
              <Chrome className="w-5 h-5 mr-2" />
              {isLogin ? "Sign in with Google" : "Sign up with Google"}
            </Button>

            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setNotification(null);
                setTouched({});
              }}
              className="w-full mt-3 sm:mt-4 text-center text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
            </button>

            <p className="text-[10px] sm:text-xs text-center text-muted-foreground mt-3 sm:mt-4 leading-tight">
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
