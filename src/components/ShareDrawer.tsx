import { useState } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from './ui/drawer';
import { Button } from './ui/button';
import { Copy, Check, MessageCircle, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { shareCodeToWhatsApp, shareCodeToSMS, copyToClipboard } from '@/utils/shareUtils';

interface ShareDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  coupleCode: string;
}

export const ShareDrawer = ({ open, onOpenChange, coupleCode }: ShareDrawerProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const success = await copyToClipboard(coupleCode);
    if (success) {
      setCopied(true);
      toast.success('Code copied!');
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast.error('Failed to copy');
    }
  };

  const handleWhatsApp = () => {
    shareCodeToWhatsApp(coupleCode);
  };

  const handleSMS = () => {
    shareCodeToSMS(coupleCode);
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="bg-gradient-warm border-none">
        <DrawerHeader className="text-center">
          <DrawerTitle className="text-2xl font-bold">Share Your Code</DrawerTitle>
          <p className="text-muted-foreground mt-2">
            Try this 2-min ritual generator together! Get personalized ideas based on your combined vibes.
          </p>
        </DrawerHeader>

        <div className="px-6 pb-8 space-y-6">
          {/* Code Display */}
          <div className="bg-white/80 rounded-2xl p-6 text-center">
            <p className="text-sm text-muted-foreground mb-2">Your Couple Code</p>
            <p className="text-5xl font-bold text-primary tracking-wider mb-4">
              {coupleCode}
            </p>
            
            <Button
              onClick={handleCopy}
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

          {/* Share Options */}
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground text-center">Or share directly</p>
            
            <Button
              onClick={handleWhatsApp}
              className="w-full bg-[#25D366] hover:bg-[#20BA5A] text-white h-12 rounded-xl"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Share via WhatsApp
            </Button>

            <Button
              onClick={handleSMS}
              variant="outline"
              className="w-full border-2 border-primary/30 rounded-xl h-12"
            >
              <Mail className="w-4 h-4 mr-2" />
              Share via SMS
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
};