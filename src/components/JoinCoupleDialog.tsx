import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface JoinCoupleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const JoinCoupleDialog = ({ open, onOpenChange }: JoinCoupleDialogProps) => {
  const [yourName, setYourName] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleJoin = async () => {
    if (!yourName.trim() || !code.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    if (code.length !== 6) {
      toast.error("Code must be 6 digits");
      return;
    }

    if (yourName.trim().length > 100) {
      toast.error("Name must be less than 100 characters");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please sign in first");
        navigate("/auth");
        return;
      }

      // Check if user is already in a couple
      const { data: existingCouple } = await supabase
        .from('couples')
        .select('*')
        .or(`partner_one.eq.${user.id},partner_two.eq.${user.id}`)
        .maybeSingle();

      if (existingCouple) {
        toast.error("You're already in a couple!");
        onOpenChange(false);
        return;
      }

      // Find couple with this code
      const { data: couple, error: findError } = await supabase
        .from('couples')
        .select('*')
        .eq('couple_code', code)
        .maybeSingle();

      if (findError) throw findError;
      if (!couple) {
        toast.error("Invalid couple code. Please check and try again.");
        return;
      }

      if (couple.partner_two) {
        toast.error("This couple is already complete. Please check the code.");
        return;
      }

      if (couple.partner_one === user.id) {
        toast.error("You can't join your own couple code!");
        return;
      }

      // Update user's profile name
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ name: yourName.trim() })
        .eq('id', user.id);

      if (profileError) throw profileError;

      // Join the couple (with optimistic locking check)
      const { data: updatedCouple, error: updateError } = await supabase
        .from('couples')
        .update({ partner_two: user.id })
        .eq('id', couple.id)
        .is('partner_two', null) // Only update if still null
        .select()
        .maybeSingle();

      if (updateError) throw updateError;
      
      if (!updatedCouple) {
        toast.error("Someone else just joined this couple. Please try a different code.");
        return;
      }

      toast.success("Successfully joined your partner's ritual!");
      onOpenChange(false);
      setYourName("");
      setCode("");
    } catch (error: any) {
      console.error("Join error:", error);
      toast.error(error.message || "Failed to join couple. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-gradient-warm border-none shadow-card rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-2xl text-center font-bold text-foreground">
            Join your partner
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 pt-4">
          <div className="space-y-2">
            <Label htmlFor="join-name" className="text-foreground">Your name</Label>
            <Input
              id="join-name"
              placeholder="Enter your name"
              value={yourName}
              onChange={(e) => setYourName(e.target.value)}
              className="border-primary/30 rounded-xl h-12 text-lg"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="code" className="text-foreground">Partner's code</Label>
            <Input
              id="code"
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="border-primary/30 rounded-xl h-12 text-lg text-center tracking-widest text-2xl font-bold"
              maxLength={6}
            />
          </div>

          <Button
            onClick={handleJoin}
            disabled={!yourName.trim() || code.length !== 6 || loading}
            className="w-full bg-gradient-ritual text-white hover:opacity-90 h-12 rounded-xl text-lg"
          >
            {loading ? "Joining..." : "Join Ritual"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
