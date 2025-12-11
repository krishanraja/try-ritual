import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, Check, MessageCircle, Mail, AlertCircle, Heart } from "lucide-react";
import { RitualLogo } from "@/components/RitualLogo";
import { supabase } from "@/integrations/supabase/client";
import { useCouple } from "@/contexts/CoupleContext";
import { shareCodeToWhatsApp, shareCodeToSMS } from "@/utils/shareUtils";

interface CreateCoupleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CreateCoupleDialog = ({ open, onOpenChange }: CreateCoupleDialogProps) => {
  const [coupleCode, setCoupleCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isExistingCouple, setIsExistingCouple] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasConfirmed, setHasConfirmed] = useState(false);
  const { refreshCouple } = useCouple();

  // Only generate code when user explicitly confirms - NOT on dialog open
  const handleCreateSpace = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError("Please sign in first");
        setLoading(false);
        return;
      }

      // Check if user already has a couple
      const { data: asPartnerOne } = await supabase
        .from('couples')
        .select('couple_code')
        .eq('partner_one', user.id)
        .eq('is_active', true)
        .maybeSingle();

      const { data: asPartnerTwo } = await supabase
        .from('couples')
        .select('couple_code')
        .eq('partner_two', user.id)
        .eq('is_active', true)
        .maybeSingle();

      const existingCouple = asPartnerOne || asPartnerTwo;

      if (existingCouple) {
        setCoupleCode(existingCouple.couple_code);
        setIsExistingCouple(true);
        setHasConfirmed(true);
        setLoading(false);
        return;
      }

      // Generate unique 8-character code (XXXX-XXXX)
      const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
      let attempts = 0;
      
      while (attempts < 10) {
        let rawCode = '';
        for (let i = 0; i < 8; i++) {
          rawCode += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        const code = `${rawCode.slice(0, 4)}-${rawCode.slice(4)}`;
        
        // Check uniqueness
        const { data: existing } = await supabase
          .from('couples')
          .select('id')
          .eq('couple_code', code)
          .eq('is_active', true)
          .maybeSingle();
        
        if (!existing) {
          // Insert new couple
          const { error: insertError } = await supabase
            .from('couples')
            .insert({
              partner_one: user.id,
              couple_code: code,
              is_active: true,
              code_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            });

          if (insertError) {
            if (insertError.code === '23505') {
              attempts++;
              continue;
            }
            throw insertError;
          }

          setCoupleCode(code);
          setIsExistingCouple(false);
          setHasConfirmed(true);
          await refreshCouple();
          break;
        }
        attempts++;
      }

      if (attempts >= 10) {
        throw new Error("Unable to generate unique code. Please try again.");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(coupleCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    // Only reset if they haven't created a couple yet
    if (!hasConfirmed) {
      setCoupleCode("");
      setError(null);
    }
    setCopied(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-gradient-warm border-none shadow-card rounded-3xl">
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-6">
            <RitualLogo size="md" variant="full" className="opacity-80" />
            <div className="flex flex-col items-center gap-4">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-lg text-muted-foreground animate-pulse">
                Creating your ritual space...
              </p>
            </div>
          </div>
        ) : error ? (
          <div className="py-8 text-center space-y-4">
            <AlertCircle className="w-12 h-12 mx-auto text-destructive" />
            <p className="text-destructive">{error}</p>
            <Button onClick={handleCreateSpace} variant="outline">
              Try Again
            </Button>
          </div>
        ) : !hasConfirmed ? (
          // Step 1: Confirmation screen - NO couple created yet
          <>
            <DialogHeader>
              <DialogTitle className="text-2xl text-center font-bold text-foreground">
                Create Your Ritual Space
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-6 pt-4">
              <div className="text-center space-y-4">
                <div className="w-20 h-20 mx-auto rounded-full bg-gradient-ritual flex items-center justify-center">
                  <Heart className="w-10 h-10 text-white" />
                </div>
                <p className="text-muted-foreground">
                  Ready to start your shared ritual journey? You'll get a unique code to share with your partner.
                </p>
                <div className="bg-primary/5 rounded-xl p-4 text-left space-y-2">
                  <p className="text-sm font-medium">What happens next:</p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• We'll create a unique couple code for you</li>
                    <li>• Share it with your partner via WhatsApp or SMS</li>
                    <li>• Once they join, you can start your first ritual!</li>
                  </ul>
                </div>
              </div>
              
              <div className="space-y-2">
                <Button
                  onClick={handleCreateSpace}
                  className="w-full bg-gradient-ritual text-white h-12 rounded-xl"
                >
                  <Heart className="w-4 h-4 mr-2" />
                  Create My Space
                </Button>
                <Button
                  onClick={handleClose}
                  variant="ghost"
                  className="w-full h-10 rounded-xl text-muted-foreground"
                >
                  Maybe Later
                </Button>
              </div>
            </div>
          </>
        ) : (
          // Step 2: Couple created, show sharing options
          <>
            <DialogHeader>
              <DialogTitle className="text-2xl text-center font-bold text-foreground">
                {isExistingCouple ? "Your Couple Code" : "Share with your partner"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-6 pt-4">
              <p className="text-center text-muted-foreground">
                {isExistingCouple 
                  ? "You already have a couple. Share this code with your partner."
                  : "Give them this code to join your shared ritual space"
                }
              </p>
              
              {!isExistingCouple && (
                <p className="text-center text-sm text-green-600 dark:text-green-400">
                  ✓ Couple created! Code expires in 24 hours.
                </p>
              )}
              
              <div className="bg-white/80 dark:bg-background/80 rounded-2xl p-6 space-y-4">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-2">Couple Code</p>
                  <p className="text-3xl font-bold text-primary tracking-wider font-mono">
                    {coupleCode}
                  </p>
                  {!isExistingCouple && (
                    <p className="text-xs text-muted-foreground mt-2">Expires in 24 hours</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Button
                    onClick={() => shareCodeToWhatsApp(coupleCode)}
                    className="w-full bg-[#25D366] hover:bg-[#20BA5A] text-white h-12 rounded-xl"
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Share via WhatsApp
                  </Button>
                  
                  <Button
                    onClick={() => shareCodeToSMS(coupleCode)}
                    variant="outline"
                    className="w-full border-2 border-primary/30 rounded-xl h-12"
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    Share via SMS
                  </Button>
                  
                  <Button
                    onClick={copyCode}
                    variant="outline"
                    className="w-full border-2 border-primary/30 rounded-xl h-12"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 mr-2 text-green-600" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 mr-2" />
                        Copy Code
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
