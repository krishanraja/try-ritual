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
  const [validating, setValidating] = useState(false);
  const [isCodeValid, setIsCodeValid] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const codeInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const navigate = useNavigate();
  const { refreshCouple, user } = useCouple();

  useEffect(() => {
    if (open) {
      setTimeout(() => codeInputRef.current?.focus(), 100);
    } else {
      // Reset state when drawer closes
      setCode('');
      setIsCodeValid(null);
      setErrorMessage('');
      setValidating(false);
      setLoading(false);
    }
  }, [open]);

  useEffect(() => {
    const formattedCode = code.replace('-', '');
    if (formattedCode.length === 8) {
      validateCode();
    } else {
      setIsCodeValid(null);
      setErrorMessage('');
      // Cancel any ongoing validation
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    }
  }, [code]);

  const validateCode = async () => {
    console.log('[VALIDATION] Starting validation for code:', code);
    
    // Cancel previous validation if running
    if (abortControllerRef.current) {
      console.log('[VALIDATION] Aborting previous validation');
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();
    const currentController = abortControllerRef.current;

    setValidating(true);
    setErrorMessage('');
    setIsCodeValid(null);

    const cleanCode = code.replace(/-/g, '');
    const formattedCode = cleanCode.length === 8 
      ? `${cleanCode.slice(0, 4)}-${cleanCode.slice(4)}` 
      : code;

    console.log('[VALIDATION] Formatted code:', formattedCode);

    // Create timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        console.log('[VALIDATION] Timeout reached (10s)');
        reject(new Error('TIMEOUT'));
      }, 10000);
    });

    // Create query promise
    const queryPromise = (async () => {
      console.log('[VALIDATION] Starting Supabase query...');
      const startTime = Date.now();
      
      try {
        const { data, error } = await supabase
          .from('couples')
          .select('id, partner_two, partner_one, code_expires_at, is_active')
          .eq('couple_code', formattedCode)
          .eq('is_active', true)
          .maybeSingle();

        const duration = Date.now() - startTime;
        console.log(`[VALIDATION] Query completed in ${duration}ms`);
        console.log('[VALIDATION] Query result:', { data, error });

        if (error) {
          console.error('[VALIDATION] Query error:', error);
          throw error;
        }

        return data;
      } catch (err) {
        console.error('[VALIDATION] Query exception:', err);
        throw err;
      }
    })();

    try {
      // Race between query and timeout
      const data = await Promise.race([queryPromise, timeoutPromise]);

      // Check if this validation was cancelled
      if (currentController.signal.aborted) {
        console.log('[VALIDATION] Validation was cancelled');
        return;
      }

      console.log('[VALIDATION] Processing validation result:', data);

      if (!data) {
        console.log('[VALIDATION] No data found - invalid code');
        setIsCodeValid(false);
        setErrorMessage('Code not found. Check with your partner for the correct code.');
        return;
      }

      if (data.partner_two) {
        console.log('[VALIDATION] Couple already complete');
        setIsCodeValid(false);
        setErrorMessage('This couple is already complete.');
        return;
      }

      if (user && data.partner_one === user.id) {
        console.log('[VALIDATION] User trying to join own code');
        setIsCodeValid(false);
        setErrorMessage("You can't join your own code!");
        return;
      }

      if (new Date(data.code_expires_at) < new Date()) {
        console.log('[VALIDATION] Code expired');
        setIsCodeValid(false);
        setErrorMessage('This code has expired. Ask your partner for a new one.');
        return;
      }

      console.log('[VALIDATION] Code is valid!');
      setIsCodeValid(true);
      setErrorMessage('');
    } catch (error: any) {
      // Check if this validation was cancelled
      if (currentController.signal.aborted) {
        console.log('[VALIDATION] Validation was cancelled during error handling');
        return;
      }

      console.error('[VALIDATION] Error during validation:', error);

      if (error.message === 'TIMEOUT') {
        console.log('[VALIDATION] Showing timeout error to user');
        setIsCodeValid(false);
        setErrorMessage('Validation timed out. Please check your connection and try again.');
      } else {
        console.log('[VALIDATION] Showing generic error to user');
        setIsCodeValid(false);
        setErrorMessage('Error validating code. Please try again.');
      }
    } finally {
      // Only update validating state if this validation wasn't cancelled
      if (!currentController.signal.aborted) {
        console.log('[VALIDATION] Validation complete');
        setValidating(false);
      } else {
        console.log('[VALIDATION] Skipping state update - validation was cancelled');
      }
    }
  };

  const handleJoin = async () => {
    console.log('[JOIN] Starting join process');
    
    const cleanCode = code.replace(/-/g, '');
    if (cleanCode.length !== 8) {
      console.log('[JOIN] Invalid code length');
      toast.error('Please enter a valid 8-character code');
      return;
    }

    if (!isCodeValid) {
      console.log('[JOIN] Code not valid, aborting');
      toast.error(errorMessage || 'Invalid code');
      return;
    }

    setLoading(true);
    const startTime = Date.now();

    try {
      if (!user) {
        console.error('[JOIN] No user found');
        throw new Error('Not authenticated');
      }

      console.log('[JOIN] User ID:', user.id);
      console.log('[JOIN] Checking for existing solo couple...');
      
      const { data: existingCouple, error: existingError } = await supabase
        .from('couples')
        .select('id, partner_two')
        .eq('partner_one', user.id)
        .maybeSingle();

      if (existingError) {
        console.error('[JOIN] Error checking existing couple:', existingError);
        throw existingError;
      }

      console.log('[JOIN] Existing couple check result:', existingCouple);

      if (existingCouple && !existingCouple.partner_two) {
        console.log('[JOIN] Deleting existing solo couple:', existingCouple.id);
        const { error: deleteError } = await supabase
          .from('couples')
          .delete()
          .eq('id', existingCouple.id);

        if (deleteError) {
          console.error('[JOIN] Error deleting solo couple:', deleteError);
          throw deleteError;
        }
        console.log('[JOIN] Solo couple deleted successfully');
      }

      const formattedCode = `${cleanCode.slice(0, 4)}-${cleanCode.slice(4)}`;
      console.log('[JOIN] Finding couple with code:', formattedCode);

      const { data: couple, error: fetchError } = await supabase
        .from('couples')
        .select('*')
        .eq('couple_code', formattedCode)
        .eq('is_active', true)
        .maybeSingle();

      if (fetchError) {
        console.error('[JOIN] Error fetching couple:', fetchError);
        throw fetchError;
      }

      console.log('[JOIN] Found couple:', couple);

      if (!couple) {
        console.error('[JOIN] No couple found');
        throw new Error('Code not found');
      }
      if (couple.partner_two) {
        console.error('[JOIN] Couple already complete');
        throw new Error('This couple is already complete');
      }
      if (couple.partner_one === user.id) {
        console.error('[JOIN] User trying to join own couple');
        throw new Error("You can't join your own code");
      }
      if (new Date(couple.code_expires_at) < new Date()) {
        console.error('[JOIN] Code expired');
        throw new Error('This code has expired');
      }

      console.log('[JOIN] Updating couple with partner_two...');
      const { error: updateError } = await supabase
        .from('couples')
        .update({ partner_two: user.id })
        .eq('id', couple.id)
        .is('partner_two', null);

      if (updateError) {
        console.error('[JOIN] Error updating couple:', updateError);
        throw updateError;
      }

      const duration = Date.now() - startTime;
      console.log(`[JOIN] Join successful in ${duration}ms`);
      console.log('[JOIN] Refreshing couple data...');

      await refreshCouple();
      
      console.log('[JOIN] Couple refreshed, showing success message');
      toast.success('Successfully joined! 🎉');
      
      onOpenChange(false);
      setCode('');
      navigate('/home');
    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error(`[JOIN] Join failed after ${duration}ms:`, error);
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
              <div className="relative">
                <Input
                  ref={codeInputRef}
                  id="code"
                  placeholder="XXXX-XXXX"
                  value={code}
                  onChange={(e) => {
                    let val = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
                    if (val.length > 4 && !val.includes('-')) {
                      val = val.slice(0, 4) + '-' + val.slice(4);
                    }
                    setCode(val.slice(0, 9));
                  }}
                  maxLength={9}
                  className={`h-16 text-center text-2xl font-bold font-mono tracking-widest rounded-xl ${
                    code.replace('-', '').length === 8
                      ? isCodeValid 
                        ? 'border-green-500 bg-green-50' 
                        : isCodeValid === false
                        ? 'border-destructive bg-destructive/10'
                        : ''
                      : ''
                  }`}
                />
                {validating && code.replace('-', '').length === 8 && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>
              {code.replace('-', '').length === 8 && !validating && errorMessage && (
                <p className="text-sm text-destructive">{errorMessage}</p>
              )}
              {code.replace('-', '').length === 8 && isCodeValid && (
                <p className="text-sm text-green-600">Code is valid! ✓</p>
              )}
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => {
                console.log('[DRAWER] Cancel clicked');
                onOpenChange(false);
              }}
              disabled={loading}
              className="flex-1 h-12 rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={handleJoin}
              disabled={loading || !isCodeValid}
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
