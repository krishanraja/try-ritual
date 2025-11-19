import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";

interface CreateCoupleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CreateCoupleDialog = ({ open, onOpenChange }: CreateCoupleDialogProps) => {
  const [step, setStep] = useState<"name" | "code">("name");
  const [yourName, setYourName] = useState("");
  const [coupleCode, setCoupleCode] = useState("");
  const [copied, setCopied] = useState(false);

  const generateCode = () => {
    // Generate a 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setCoupleCode(code);
    setStep("code");
    toast.success("Couple created! Share your code with your partner.");
  };

  const copyCode = () => {
    navigator.clipboard.writeText(coupleCode);
    setCopied(true);
    toast.success("Code copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    setStep("name");
    setYourName("");
    setCoupleCode("");
    setCopied(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-gradient-warm border-none shadow-card rounded-3xl">
        {step === "name" ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-2xl text-center font-bold text-foreground">
                What's your name?
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-6 pt-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-foreground">Your name</Label>
                <Input
                  id="name"
                  placeholder="Enter your name"
                  value={yourName}
                  onChange={(e) => setYourName(e.target.value)}
                  className="border-primary/30 rounded-xl h-12 text-lg"
                />
              </div>
              <Button
                onClick={generateCode}
                disabled={!yourName.trim()}
                className="w-full bg-gradient-ritual text-white hover:opacity-90 h-12 rounded-xl text-lg"
              >
                Create Ritual
              </Button>
            </div>
          </>
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
