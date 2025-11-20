import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { Heart, Calendar, Sparkles } from 'lucide-react';
import ritualLogo from '@/assets/ritual-logo.png';

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-warm flex flex-col items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-8 max-w-2xl"
      >
        <motion.img 
          src={ritualLogo} 
          alt="Ritual" 
          className="w-40 h-40 mx-auto"
          animate={{ rotate: [0, 5, -5, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />
        
        <div className="space-y-4">
          <h1 className="text-5xl md:text-6xl font-bold bg-gradient-ritual bg-clip-text text-transparent">
            Shared Moments, Designed Together
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground">
            Build weekly rituals with someone special. Both contribute, AI synthesizes your perfect week together.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 py-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-3"
          >
            <div className="w-16 h-16 mx-auto rounded-full bg-gradient-ritual flex items-center justify-center">
              <Heart className="w-8 h-8 text-white" />
            </div>
            <h3 className="font-semibold text-lg">Connect</h3>
            <p className="text-sm text-muted-foreground">Share a code and create your ritual space together</p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-3"
          >
            <div className="w-16 h-16 mx-auto rounded-full bg-gradient-ritual flex items-center justify-center">
              <Calendar className="w-8 h-8 text-white" />
            </div>
            <h3 className="font-semibold text-lg">Contribute</h3>
            <p className="text-sm text-muted-foreground">Each week, both partners share their wishes and energy</p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="space-y-3"
          >
            <div className="w-16 h-16 mx-auto rounded-full bg-gradient-ritual flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h3 className="font-semibold text-lg">Experience</h3>
            <p className="text-sm text-muted-foreground">AI crafts personalized rituals that honor both perspectives</p>
          </motion.div>
        </div>

        <Button 
          onClick={() => navigate('/home')}
          size="lg" 
          className="w-full md:w-auto bg-gradient-ritual text-white hover:opacity-90 h-16 text-xl px-12 rounded-xl"
        >
          Start Your Ritual Journey
        </Button>

        <p className="text-sm text-muted-foreground">
          Free to start • No credit card required
        </p>
      </motion.div>
    </div>
  );
}
