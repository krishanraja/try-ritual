import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface JoinCoupleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const JoinCoupleDialog = ({ open, onOpenChange }: JoinCoupleDialogProps) => {
  const [yourName, setYourName] = useState("");
  const [code, setCode] = useState("");

  const handleJoin = () => {
    if (!yourName.trim() || !code.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    if (code.length !== 6) {
      toast.error("Code must be 6 digits");
      return;
    }

    // TODO: Implement actual joining logic with Supabase
    toast.success("Joined! Redirecting to your ritual space...");
    onOpenChange(false);
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
            disabled={!yourName.trim() || code.length !== 6}
            className="w-full bg-gradient-ritual text-white hover:opacity-90 h-12 rounded-xl text-lg"
          >
            Join Ritual
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
