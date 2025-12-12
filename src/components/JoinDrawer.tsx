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
    const formattedCode = `${cleanCode.slice(0, 4)}-${cleanCode.slice(4)}`;
    console.log('[JOIN] Calling join_couple_with_code for:', formattedCode);

    try {
      // Use SECURITY DEFINER function - bypasses RLS, guaranteed to work
      const { data, error } = await supabase
        .rpc('join_couple_with_code', { input_code: formattedCode });

      if (error) {
        console.error('[JOIN] RPC error:', error);
        throw new Error(error.message);
      }

      // Parse the JSONB result
      const result = data as { success: boolean; error?: string; couple_id?: string };

      if (!result?.success) {
        console.error('[JOIN] Join failed:', result?.error);
        throw new Error(result?.error || 'Failed to join couple');
      }

      console.log('[JOIN] ✅ Successfully joined couple:', result.couple_id);

      // Refresh couple data
      await refreshCouple();
      
      // Extra refreshes to ensure both partners sync
      setTimeout(() => refreshCouple(), 500);
      setTimeout(() => refreshCouple(), 1500);
      
      setNotification({ type: 'success', message: 'Successfully joined! 🎉' });
      setTimeout(() => {
        onOpenChange(false);
        navigate('/input');
      }, 1500);
    } catch (error: any) {
      console.error('[JOIN] Error:', error);
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
