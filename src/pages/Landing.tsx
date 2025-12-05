import { useNavigate } from 'react-router-dom';
import { useCouple } from '@/contexts/CoupleContext';
import { Button } from '@/components/ui/button';
import { X, MapPin, Heart, Sparkles, TrendingUp } from 'lucide-react';
import { RitualLogo } from '@/components/RitualLogo';
import { useState, useEffect } from 'react';
import { useSEO, addStructuredData } from '@/hooks/useSEO';
import { AnimatedGradientBackground } from '@/components/AnimatedGradientBackground';
export default function Landing() {
  const navigate = useNavigate();
  const {
    user
  } = useCouple();
  const [showAuthBanner, setShowAuthBanner] = useState(true);

  // SEO optimization
  useSEO({
    title: 'Create Meaningful Weekly Rituals with Your Partner',
    description: 'Build meaningful weekly rituals with your partner. AI-powered ritual suggestions tailored to your location in London, Sydney, Melbourne, or New York. Track completions, build streaks, and strengthen your relationship.',
    keywords: 'relationship rituals, couple activities, weekly rituals, relationship building, shared moments, couple goals, date ideas, relationship app, partner activities'
  });
  useEffect(() => {
    // Add structured data for landing page
    addStructuredData({
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: 'Ritual',
      applicationCategory: 'LifestyleApplication',
      operatingSystem: 'Web',
      description: 'Build meaningful weekly rituals with your partner. AI-powered relationship building through shared experiences.',
      url: 'https://ritual.lovable.app/',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD'
      },
      featureList: ['AI-powered ritual suggestions', 'Location-based activities in London, Sydney, Melbourne, and New York', 'Partner synchronization and ranking', 'Streak tracking and gamification', 'Calendar integration']
    });
  }, []);
  return <div className="h-screen overflow-hidden flex flex-col relative">
      <AnimatedGradientBackground variant="warm" />
      
      {/* Authenticated User Banner */}
      {user && showAuthBanner && <div className="flex-none px-4 py-2 bg-primary/10 backdrop-blur-sm border-b border-primary/20">
          <div className="flex items-center justify-between">
            <p className="text-xs text-foreground">
              You're signed in! <button onClick={() => navigate('/home')} className="underline font-semibold">Go to Dashboard →</button>
            </p>
            <button onClick={() => setShowAuthBanner(false)} className="text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>}

      {/* Main content - vertically centered */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 space-y-8">
        {/* Logo */}
        <RitualLogo size="xl" className="max-w-[280px]" />
        
        {/* Heading */}
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-foreground leading-tight">
            Create Meaningful Weekly Rituals with Your Partner
          </h1>
          <p className="text-sm text-foreground/70 max-w-sm mx-auto leading-relaxed">Spend 2 minutes a week syncing, explore & schedule fresh, local ideas that will strengthen your bond with one another.</p>
          
          {/* Feature highlights */}
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <div className="flex items-center gap-1.5 text-xs bg-white/40 backdrop-blur-sm px-3 py-1.5 rounded-full">
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI-Powered</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs bg-white/40 backdrop-blur-sm px-3 py-1.5 rounded-full">
              <MapPin className="w-3.5 h-3.5" />
              <span>Location-Aware</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs bg-white/40 backdrop-blur-sm px-3 py-1.5 rounded-full">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Streak Tracking</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs bg-white/40 backdrop-blur-sm px-3 py-1.5 rounded-full">
              <Heart className="w-3.5 h-3.5" />
              <span>Build Together</span>
            </div>
          </div>
        </div>
        
        {/* CTA Buttons */}
        <div className="w-full max-w-sm space-y-3">
          <Button onClick={() => navigate('/auth')} size="lg" className="w-full h-14 text-base bg-gradient-ritual text-white">
            Start New Ritual
          </Button>
          
          <Button onClick={() => navigate('/auth?join=true')} variant="outline" size="lg" className="w-full h-14 text-base">
            Join Your Partner
          </Button>
        </div>
        
        {/* Sign in link */}
        <p className="text-xs text-muted-foreground">
          Already have an account? <button onClick={() => navigate('/auth')} className="underline">Sign In</button>
        </p>
      </div>
    </div>;
}