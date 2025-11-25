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
  const navigate = useNavigate();
  const { refreshCouple, user } = useCouple();

  useEffect(() => {
    if (open) {
      setTimeout(() => codeInputRef.current?.focus(), 100);
    }
  }, [open]);

  useEffect(() => {
    const formattedCode = code.replace('-', '');
    if (formattedCode.length === 8) {
      validateCode();
    } else {
      setIsCodeValid(null);
      setErrorMessage('');
    }
  }, [code]);

  const validateCode = async () => {
    setValidating(true);
    setErrorMessage('');
    try {
      // Query with properly formatted code (with hyphen)
      const cleanCode = code.replace(/-/g, '');
      const formattedCode = cleanCode.length === 8 
        ? `${cleanCode.slice(0, 4)}-${cleanCode.slice(4)}` 
        : code;

      const { data } = await supabase
        .from('couples')
        .select('id, partner_two, partner_one, code_expires_at, is_active')
        .eq('couple_code', formattedCode)
        .eq('is_active', true)
        .maybeSingle();
      
      if (!data) {
        setIsCodeValid(false);
        setErrorMessage('Code not found. Check with your partner for the correct code.');
        return;
      }

      if (data.partner_two) {
        setIsCodeValid(false);
        setErrorMessage('This couple is already complete.');
        return;
      }

      if (user && data.partner_one === user.id) {
        setIsCodeValid(false);
        setErrorMessage("You can't join your own code!");
        return;
      }

      // Check expiration
      if (new Date(data.code_expires_at) < new Date()) {
        setIsCodeValid(false);
        setErrorMessage('This code has expired. Ask your partner for a new one.');
        return;
      }

      setIsCodeValid(true);
    } catch (error) {
      setIsCodeValid(false);
      setErrorMessage('Error validating code. Please try again.');
    } finally {
      setValidating(false);
    }
  };

  const handleJoin = async () => {
    const cleanCode = code.replace(/-/g, '');
    if (cleanCode.length !== 8) {
      toast.error('Please enter a valid 8-character code');
      return;
    }

    if (!isCodeValid) {
      toast.error(errorMessage || 'Invalid code');
      return;
    }

    setLoading(true);
    try {
      if (!user) throw new Error('Not authenticated');

      // Format code for query (with hyphen)
      const formattedCode = `${cleanCode.slice(0, 4)}-${cleanCode.slice(4)}`;

      // Find and join couple
      const { data: couple } = await supabase
        .from('couples')
        .select('*')
        .eq('couple_code', formattedCode)
        .eq('is_active', true)
        .single();

      if (!couple) throw new Error('Code not found');
      if (couple.partner_two) throw new Error('This couple is already complete');
      if (couple.partner_one === user.id) throw new Error("You can't join your own code");
      if (new Date(couple.code_expires_at) < new Date()) throw new Error('This code has expired');

      const { error: updateError } = await supabase
        .from('couples')
        .update({ partner_two: user.id })
        .eq('id', couple.id)
        .is('partner_two', null);

      if (updateError) throw updateError;

      await refreshCouple();
      toast.success('Successfully joined! 🎉');
      onOpenChange(false);
      setCode('');
      navigate('/home');
    } catch (error: any) {
      toast.error(error.message || 'Failed to join');
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
                    // Auto-format with dash
                    if (val.length > 4 && !val.includes('-')) {
                      val = val.slice(0, 4) + '-' + val.slice(4);
                    }
                    setCode(val.slice(0, 9)); // Max length with dash
                  }}
                  maxLength={9}
                  className={`h-16 text-center text-2xl font-bold font-mono tracking-widest rounded-xl ${
                    code.replace('-', '').length === 8
                      ? isCodeValid 
                        ? 'border-green-500 bg-green-50' 
                        : 'border-destructive bg-destructive/10'
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

          <Button
            onClick={handleJoin}
            disabled={loading || !isCodeValid}
            className="w-full bg-gradient-ritual text-white hover:opacity-90 h-12 rounded-xl"
          >
            {loading ? 'Joining...' : 'Join Couple'}
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
};