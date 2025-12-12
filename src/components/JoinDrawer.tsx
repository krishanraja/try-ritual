import { useState, useEffect, useRef } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from './ui/drawer';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useCouple } from '@/contexts/CoupleContext';
import { NotificationContainer } from './InlineNotification';

interface JoinDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const JoinDrawer = ({ open, onOpenChange }: JoinDrawerProps) => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const codeInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { refreshCouple, user } = useCouple();

  useEffect(() => {
    if (open) {
      setTimeout(() => codeInputRef.current?.focus(), 100);
    } else {
      setCode('');
      setLoading(false);
    }
  }, [open]);

  const handleJoin = async () => {
    if (!user) {
      setNotification({ type: 'error', message: 'Not authenticated' });
      return;
    }

    const cleanCode = code.replace(/-/g, '').toUpperCase();
    
    if (cleanCode.length !== 8) {
      setNotification({ type: 'error', message: 'Code must be 8 characters' });
      return;
    }

    setLoading(true);
    console.log('[JOIN] Starting join flow for user:', user.id);

    try {
      // Format to XXXX-XXXX
      const formattedCode = `${cleanCode.slice(0, 4)}-${cleanCode.slice(4)}`;
      console.log('[JOIN] Validating code:', formattedCode);

      // Use secure validation function to prevent code enumeration
      const { data: validationResult, error: validationError } = await supabase
        .rpc('validate_couple_code', { input_code: formattedCode });

      if (validationError) {
        console.error('[JOIN] Validation error:', validationError);
        throw validationError;
      }

      // Validation
      if (!validationResult || validationResult.length === 0) {
        console.log('[JOIN] Code not found or invalid');
        throw new Error('Code not found or expired. Check with your partner.');
      }

      const coupleId = validationResult[0].couple_id;
      console.log('[JOIN] Code valid, couple ID:', coupleId);

      // Verify we're not joining our own couple
      const { data: coupleCheck } = await supabase
        .from('couples')
        .select('partner_one')
        .eq('id', coupleId)
        .single();

      if (coupleCheck?.partner_one === user.id) {
        throw new Error("You can't join your own code!");
      }

      // Update partner_two with retry logic
      let updateSuccess = false;
      let lastError: Error | null = null;
      
      for (let attempt = 1; attempt <= 3; attempt++) {
        console.log(`[JOIN] Update attempt ${attempt}/3`);
        
        const { error: updateError } = await supabase
          .from('couples')
          .update({ partner_two: user.id })
          .eq('id', coupleId);

        if (updateError) {
          console.error(`[JOIN] Update error on attempt ${attempt}:`, updateError);
          lastError = new Error(updateError.message);
          await new Promise(r => setTimeout(r, 500 * attempt)); // Exponential backoff
          continue;
        }

        // CRITICAL: Verify the update actually persisted
        console.log('[JOIN] Verifying update persisted...');
        const { data: verifiedCouple, error: verifyError } = await supabase
          .from('couples')
          .select('partner_two')
          .eq('id', coupleId)
          .single();

        if (verifyError) {
          console.error('[JOIN] Verification query failed:', verifyError);
          lastError = new Error('Could not verify connection');
          await new Promise(r => setTimeout(r, 500 * attempt));
          continue;
        }

        if (verifiedCouple?.partner_two === user.id) {
          console.log('[JOIN] ✅ Update verified successfully!');
          updateSuccess = true;
          break;
        } else {
          console.warn('[JOIN] ⚠️ Update not persisted, partner_two is:', verifiedCouple?.partner_two);
          lastError = new Error('Connection failed - please try again');
          await new Promise(r => setTimeout(r, 500 * attempt));
        }
      }

      if (!updateSuccess) {
        throw lastError || new Error('Failed to connect after 3 attempts');
      }

      // Refresh couple data multiple times to ensure sync
      console.log('[JOIN] Refreshing couple data...');
      await refreshCouple();
      
      // Extra refresh after a short delay to catch any race conditions
      setTimeout(() => refreshCouple(), 500);
      setTimeout(() => refreshCouple(), 1500);
      
      setNotification({ type: 'success', message: 'Successfully joined! 🎉' });
      setTimeout(() => {
        onOpenChange(false);
        navigate('/input');
      }, 1500);
    } catch (error: any) {
      console.error('[JOIN] Final error:', error);
      setNotification({ type: 'error', message: error.message || 'Failed to join couple' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="bg-gradient-warm border-none">
        <DrawerHeader className="text-center">
          <DrawerTitle className="text-2xl font-bold">Join a Couple</DrawerTitle>
          <p className="text-muted-foreground mt-2">
            Enter your partner's code to get started
          </p>
        </DrawerHeader>

        <div className="px-6 pb-8 space-y-6">
          {notification && (
            <NotificationContainer
              notification={notification}
              onDismiss={() => setNotification(null)}
            />
          )}
          <div className="space-y-2">
            <Label htmlFor="code">Couple Code</Label>
            <Input
              ref={codeInputRef}
              id="code"
              placeholder="XXXX-XXXX"
              value={code}
              onChange={(e) => {
                let val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                if (val.length > 4) {
                  val = val.slice(0, 4) + '-' + val.slice(4);
                }
                setCode(val.slice(0, 9));
              }}
              maxLength={9}
              className="h-16 text-center text-2xl font-bold font-mono tracking-widest rounded-xl"
            />
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="flex-1 h-12 rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={handleJoin}
              disabled={loading || code.replace(/-/g, '').length !== 8}
              className="flex-1 bg-gradient-ritual text-white hover:opacity-90 h-12 rounded-xl"
            >
              {loading ? 'Joining...' : 'Join Couple'}
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
};
