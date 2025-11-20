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
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [isCodeValid, setIsCodeValid] = useState<boolean | null>(null);
  const codeInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { refreshCouple, user } = useCouple();

  useEffect(() => {
    if (open) {
      setTimeout(() => codeInputRef.current?.focus(), 100);
    }
  }, [open]);

  useEffect(() => {
    if (code.length === 6) {
      validateCode();
    } else {
      setIsCodeValid(null);
    }
  }, [code]);

  const validateCode = async () => {
    setValidating(true);
    try {
      const { data } = await supabase
        .from('couples')
        .select('id, partner_two')
        .eq('couple_code', code)
        .maybeSingle();
      
      setIsCodeValid(!!data && !data.partner_two);
    } catch (error) {
      setIsCodeValid(false);
    } finally {
      setValidating(false);
    }
  };

  const handleJoin = async () => {
    if (!name.trim() || code.length !== 6) {
      toast.error('Please fill in all fields');
      return;
    }

    if (!isCodeValid) {
      toast.error('Invalid or already used code');
      return;
    }

    setLoading(true);
    try {
      if (!user) throw new Error('Not authenticated');

      // Update profile name
      await supabase
        .from('profiles')
        .update({ name: name.trim() })
        .eq('id', user.id);

      // Find and join couple
      const { data: couple } = await supabase
        .from('couples')
        .select('*')
        .eq('couple_code', code)
        .single();

      if (!couple) throw new Error('Invalid code');
      if (couple.partner_two) throw new Error('Code already used');
      if (couple.partner_one === user.id) throw new Error("Can't join your own code");

      await supabase
        .from('couples')
        .update({ partner_two: user.id })
        .eq('id', couple.id)
        .is('partner_two', null);

      await refreshCouple();
      toast.success('Successfully joined! 🎉');
      onOpenChange(false);
      setCode('');
      setName('');
      navigate('/');
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
              <Label htmlFor="name">Your Name</Label>
              <Input
                id="name"
                placeholder="Enter your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
                className="h-12 text-lg rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="code">Couple Code</Label>
              <div className="relative">
                <Input
                  ref={codeInputRef}
                  id="code"
                  placeholder="000000"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength={6}
                  className={`h-16 text-center text-3xl font-bold tracking-widest rounded-xl ${
                    code.length === 6 
                      ? isCodeValid 
                        ? 'border-green-500 bg-green-50' 
                        : 'border-destructive bg-destructive/10'
                      : ''
                  }`}
                />
                {validating && code.length === 6 && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>
              {code.length === 6 && !validating && isCodeValid === false && (
                <p className="text-sm text-destructive">This code is invalid or already used</p>
              )}
              {code.length === 6 && isCodeValid && (
                <p className="text-sm text-green-600">Code is valid! ✓</p>
              )}
            </div>
          </div>

          <Button
            onClick={handleJoin}
            disabled={loading || !isCodeValid || !name.trim()}
            className="w-full bg-gradient-ritual text-white hover:opacity-90 h-12 rounded-xl"
          >
            {loading ? 'Joining...' : 'Join Couple'}
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
};