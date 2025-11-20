import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface CreateCoupleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CreateCoupleDialog = ({ open, onOpenChange }: CreateCoupleDialogProps) => {
  const [coupleCode, setCoupleCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Auto-generate code when dialog opens
  useEffect(() => {
    if (open && !coupleCode) {
      generateCode();
    }
  }, [open]);

  const generateCode = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please sign in first");
        navigate("/auth");
        return;
      }

      // Check if user already has a couple
      const { data: existingCouple } = await supabase
        .from('couples')
        .select('*')
        .or(`partner_one.eq.${user.id},partner_two.eq.${user.id}`)
        .maybeSingle();

      if (existingCouple) {
        toast.error("You're already in a couple! Share your existing code instead.");
        setCoupleCode(existingCouple.couple_code);
        setLoading(false);
        return;
      }

      // Generate a unique 6-digit code
      let code = '';
      let isUnique = false;
      let attempts = 0;
      
      while (!isUnique && attempts < 10) {
        code = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Check if code already exists
        const { data: existingCode } = await supabase
          .from('couples')
          .select('id')
          .eq('couple_code', code)
          .maybeSingle();
        
        if (!existingCode) {
          isUnique = true;
        }
        attempts++;
      }

      if (!isUnique) {
        throw new Error("Unable to generate unique code. Please try again.");
      }
      
      // Create couple in database
      const { error } = await supabase
        .from('couples')
        .insert({
          partner_one: user.id,
          couple_code: code,
        });

      if (error) throw error;

      setCoupleCode(code);
      toast.success("Couple created! Share your code with your partner.");
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
                Share with your partner
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-6 pt-4">
              <p className="text-center text-muted-foreground">
                Give them this code to join your shared ritual space
              </p>
              
              <div className="bg-white/80 rounded-2xl p-6 space-y-4">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-2">Couple Code</p>
                  <p className="text-4xl font-bold text-primary tracking-wider">
                    {coupleCode}
                  </p>
                </div>
                
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
