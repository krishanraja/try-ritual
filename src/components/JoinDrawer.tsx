import { useState, useEffect, useRef } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from './ui/drawer';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useCouple } from '@/contexts/CoupleContext';

interface JoinDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const JoinDrawer = ({ open, onOpenChange }: JoinDrawerProps) => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const codeInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { refreshCouple, user } = useCouple();

  useEffect(() => {
    if (open) {
      setTimeout(() => codeInputRef.current?.focus(), 100);
    } else {
      setCode('');
      setErrorMessage('');
      setLoading(false);
    }
  }, [open]);

  const handleJoin = async () => {
    console.log('[JOIN] ========== STARTING JOIN PROCESS ==========');
    console.log('[JOIN] Raw code input:', code);
    
    const cleanCode = code.replace(/-/g, '');
    console.log('[JOIN] Cleaned code (no dash):', cleanCode);
    
    if (cleanCode.length !== 8) {
      console.log('[JOIN] ❌ Code must be exactly 8 characters');
      toast.error('Code must be 8 characters');
      return;
    }

    if (!user) {
      console.error('[JOIN] ❌ No authenticated user');
      toast.error('Not authenticated');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const startTime = Date.now();
      
      // Format to XXXX-XXXX
      const formattedCode = `${cleanCode.slice(0, 4)}-${cleanCode.slice(4)}`;
      
      console.log('[JOIN] Searching for code:', formattedCode);

      // Check for existing solo couple first
      console.log('[JOIN] Checking for existing solo couple...');
      const { data: existingCouple, error: existingError } = await supabase
        .from('couples')
        .select('id, partner_two')
        .eq('partner_one', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (existingError) {
        console.error('[JOIN] ❌ Error checking existing couple:', existingError);
        throw existingError;
      }

      if (existingCouple && !existingCouple.partner_two) {
        console.log('[JOIN] Found solo couple, deleting:', existingCouple.id);
        const { error: deleteError } = await supabase
          .from('couples')
          .delete()
          .eq('id', existingCouple.id);

        if (deleteError) {
          console.error('[JOIN] ❌ Error deleting solo couple:', deleteError);
          throw deleteError;
        }
        console.log('[JOIN] ✅ Solo couple deleted');
      }

      // Simple direct query - no .or(), just exact match
      console.log('[JOIN] Querying for couple...');
      const { data: couple, error: fetchError } = await supabase
        .from('couples')
        .select('*')
        .eq('couple_code', formattedCode)
        .eq('is_active', true)
        .is('partner_two', null)
        .maybeSingle();

      if (fetchError) {
        console.error('[JOIN] ❌ Error fetching couple:', fetchError);
        throw fetchError;
      }

      console.log('[JOIN] Query result:', couple ? 'Found couple' : 'No couple found');

      if (!couple) {
        console.log('[JOIN] ❌ No matching couple found');
        throw new Error('Code not found. Check with your partner.');
      }

      if (couple.partner_two) {
        console.log('[JOIN] ❌ Couple already complete');
        throw new Error('This couple is already complete.');
      }

      if (couple.partner_one === user.id) {
        console.log('[JOIN] ❌ User trying to join own code');
        throw new Error("You can't join your own code!");
      }

      if (couple.code_expires_at && new Date(couple.code_expires_at) < new Date()) {
        console.log('[JOIN] ❌ Code expired');
        throw new Error('This code has expired. Ask your partner for a new one.');
      }

      console.log('[JOIN] ✅ Validation passed, updating couple...');
      const { error: updateError } = await supabase
        .from('couples')
        .update({ partner_two: user.id })
        .eq('id', couple.id)
        .is('partner_two', null);

      if (updateError) {
        console.error('[JOIN] ❌ Error updating couple:', updateError);
        throw updateError;
      }

      const duration = Date.now() - startTime;
      console.log(`[JOIN] ✅ Join successful in ${duration}ms`);

      await refreshCouple();
      
      toast.success('Successfully joined! 🎉');
      onOpenChange(false);
      setCode('');
      navigate('/home');
    } catch (error: any) {
      console.error('[JOIN] ❌ Join failed:', error.message || error);
      setErrorMessage(error.message || 'Failed to join couple');
      toast.error(error.message || 'Failed to join couple');
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
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">Couple Code</Label>
              <Input
                ref={codeInputRef}
                id="code"
                placeholder="XXXX-XXXX"
                value={code}
                onChange={(e) => {
                  let val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                  // Auto-format with dash for 8-character codes
                  if (val.length > 4) {
                    val = val.slice(0, 4) + '-' + val.slice(4);
                  }
                  setCode(val.slice(0, 9));
                }}
                maxLength={9}
                className="h-16 text-center text-2xl font-bold font-mono tracking-widest rounded-xl"
              />
              {errorMessage && (
                <p className="text-sm text-destructive">{errorMessage}</p>
              )}
            </div>
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
