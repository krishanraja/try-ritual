import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, Check, MessageCircle, Mail } from "lucide-react";
import { toast } from "sonner";
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
  const { refreshCouple } = useCouple();

  useEffect(() => {
    if (open && !coupleCode) {
      generateOrFetchCode();
    }
  }, [open]);

  const generateOrFetchCode = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please sign in first");
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
          const { error } = await supabase
            .from('couples')
            .insert({
              partner_one: user.id,
              couple_code: code,
              is_active: true,
              code_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            });

          if (error) {
            if (error.code === '23505') {
              attempts++;
              continue;
            }
            throw error;
          }

          setCoupleCode(code);
          setIsExistingCouple(false);
          toast.success("Couple created! Code expires in 24 hours.");
          await refreshCouple();
          break;
        }
        attempts++;
      }

      if (attempts >= 10) {
        throw new Error("Unable to generate unique code. Please try again.");
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(coupleCode);
    setCopied(true);
    toast.success("Code copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    setCoupleCode("");
    setCopied(false);
    setIsExistingCouple(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-gradient-warm border-none shadow-card rounded-3xl">
        {loading ? (
          <div className="py-12 text-center">
            <p className="text-lg text-muted-foreground">Creating your ritual space...</p>
          </div>
        ) : (
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
              
              <div className="bg-white/80 rounded-2xl p-6 space-y-4">
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
                        <Check className="w-4 h-4 mr-2" />
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

              <Button
                onClick={handleClose}
                className="w-full bg-gradient-ritual text-white hover:opacity-90 h-12 rounded-xl"
              >
                Done
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
