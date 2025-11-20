import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Heart, LogOut, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import ritualLogo from "@/assets/ritual-logo.png";
import { CreateCoupleDialog } from "@/components/CreateCoupleDialog";
import { JoinCoupleDialog } from "@/components/JoinCoupleDialog";
import { ViewCoupleCodeDialog } from "@/components/ViewCoupleCodeDialog";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [showViewCode, setShowViewCode] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [couple, setCouple] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Set up listener FIRST before checking session
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log("Auth state changed:", _event, !!session);
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Then check for existing session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      // Only log errors, don't sign out - let auth state change handle it
      if (error) {
        console.log("Session check error (may be stale):", error.message);
      }
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      const fetchCouple = async () => {
        try {
          const { data, error } = await supabase
            .from('couples')
            .select('*')
            .or(`partner_one.eq.${user.id},partner_two.eq.${user.id}`)
            .maybeSingle();
          
          if (error) {
            console.error("Error fetching couple:", error);
          }
          setCouple(data);
        } catch (error) {
          console.error("Failed to fetch couple:", error);
        }
      };
      fetchCouple();

      // Subscribe to realtime updates
      const channel = supabase
        .channel('couples-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'couples',
          },
          () => {
            fetchCouple();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setCouple(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-warm flex flex-col items-center justify-center gap-4">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-muted-foreground text-sm">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-warm flex flex-col items-center justify-center p-6 relative">
      {user && (
        <Button
          onClick={handleSignOut}
          variant="ghost"
          size="icon"
          className="absolute top-4 right-4"
        >
          <LogOut className="w-5 h-5" />
        </Button>
      )}
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

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="space-y-3 pt-4"
        >
          {!user ? (
            <Button
              onClick={() => navigate("/auth")}
              size="lg"
              className="w-full bg-gradient-ritual text-white hover:opacity-90 transition-opacity shadow-soft text-lg h-14 rounded-2xl"
            >
              Get Started
            </Button>
          ) : couple ? (
            <>
              <Button
                onClick={() => navigate("/input")}
                size="lg"
                className="w-full bg-gradient-ritual text-white hover:opacity-90 transition-opacity shadow-soft text-lg h-14 rounded-2xl"
              >
                Weekly Input
              </Button>
              {couple.partner_two && (
                <Button
                  onClick={() => navigate("/rituals")}
                  variant="outline"
                  size="lg"
                  className="w-full border-2 border-primary/30 text-foreground hover:bg-lavender-light transition-colors text-lg h-14 rounded-2xl"
                >
                  View Rituals
                </Button>
              )}
              <Button
                onClick={() => setShowViewCode(true)}
                variant="ghost"
                size="sm"
                className="w-full text-muted-foreground hover:text-foreground transition-colors"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Share Couple Code
              </Button>
            </>
          ) : (
            <>
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
                I Have a Code
              </Button>
            </>
          )}
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
      {couple && (
        <ViewCoupleCodeDialog 
          open={showViewCode} 
          onOpenChange={setShowViewCode} 
          coupleCode={couple.couple_code} 
        />
      )}
    </div>
  );
};

export default Index;
