import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { JoinCoupleDialog } from "@/components/JoinCoupleDialog";

const Auth = () => {
  const [searchParams] = useSearchParams();
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const navigate = useNavigate();

  // Check if user came here to join a couple
  useEffect(() => {
    if (searchParams.get('join') === 'true') {
      setShowJoin(true);
      setIsLogin(false); // Switch to signup mode for new users
    }
  }, [searchParams]);

  useEffect(() => {
    // Set up listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth event on /auth:", event);
      if (session) {
        navigate("/home");
      }
    });

    // Then check existing session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.log("Auth page session check error:", error.message);
      }
      if (session) {
        navigate("/home");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        toast.success("Welcome back!");
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/home`,
            data: {
              name: name,
            },
          },
        });
        if (error) throw error;
        toast.success("Account created! Welcome to Ritual.");
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen-mobile bg-gradient-warm flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 shadow-card">
          <h1 className="text-3xl font-bold text-center mb-2 text-foreground">
            {isLogin ? "Welcome back" : "Create your ritual"}
          </h1>
          <p className="text-center text-muted-foreground mb-8">
            {isLogin ? "Sign in to continue your journey" : "Start your shared ritual journey"}
          </p>

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
            </div>

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
        </div>
      </motion.div>
      
      <JoinCoupleDialog open={showJoin} onOpenChange={setShowJoin} />
    </div>
  );
};

export default Auth;
