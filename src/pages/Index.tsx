import { useState } from "react";
import { motion } from "framer-motion";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import ritualLogo from "@/assets/ritual-logo.png";
import { CreateCoupleDialog } from "@/components/CreateCoupleDialog";
import { JoinCoupleDialog } from "@/components/JoinCoupleDialog";

const Index = () => {
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-warm flex flex-col items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md space-y-8 text-center"
      >
        {/* Logo */}
        <motion.div
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex justify-center"
        >
          <img 
            src={ritualLogo} 
            alt="Ritual" 
            className="w-64 h-auto"
          />
        </motion.div>

        {/* Tagline */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="space-y-3"
        >
          <h1 className="text-3xl font-bold text-foreground tracking-tight">
            Shared moments,<br />designed together
          </h1>
          <p className="text-lg text-muted-foreground max-w-sm mx-auto">
            Build weekly rituals with someone special. Both contribute, AI synthesizes your perfect week.
          </p>
        </motion.div>

        {/* Heart animation */}
        <motion.div
          animate={{ 
            scale: [1, 1.1, 1],
            rotate: [0, 5, -5, 0]
          }}
          transition={{ 
            duration: 2,
            repeat: Infinity,
            repeatDelay: 1
          }}
          className="flex justify-center py-4"
        >
          <div className="w-16 h-16 rounded-full bg-gradient-ritual flex items-center justify-center shadow-soft">
            <Heart className="w-8 h-8 text-white fill-white" />
          </div>
        </motion.div>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="space-y-3 pt-4"
        >
          <Button
            onClick={() => setShowCreate(true)}
            size="lg"
            className="w-full bg-gradient-ritual text-white hover:opacity-90 transition-opacity shadow-soft text-lg h-14 rounded-2xl"
          >
            Start a Ritual
          </Button>
          
          <Button
            onClick={() => setShowJoin(true)}
            variant="outline"
            size="lg"
            className="w-full border-2 border-primary/30 text-foreground hover:bg-lavender-light transition-colors text-lg h-14 rounded-2xl"
          >
            Join Your Partner
          </Button>
        </motion.div>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-sm text-muted-foreground pt-8"
        >
          Free to start • Weekly rituals designed by AI
        </motion.p>
      </motion.div>

      <CreateCoupleDialog open={showCreate} onOpenChange={setShowCreate} />
      <JoinCoupleDialog open={showJoin} onOpenChange={setShowJoin} />
    </div>
  );
};

export default Index;
