/**
 * LeaveConfirmDialog - Confirmation dialog for leaving a couple
 * 
 * ARCHITECTURE FIX (2026-01-03):
 * - Properly structured for flex parent (DialogContent uses flex column)
 * - Scrollable content area with proper flex constraints
 * - Fixed height buttons that don't shrink
 * - Touch targets meet 44px minimum
 */
import { useState, useEffect } from 'react';
import { AlertTriangle, Heart, Calendar, Star, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
  partnerName?: string;
}

export function LeaveConfirmDialog({ open, onOpenChange, onConfirm, partnerName }: Props) {
  const [confirmText, setConfirmText] = useState('');
  const [countdown, setCountdown] = useState(5);
  const [canConfirm, setCanConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setConfirmText('');
      setCountdown(5);
      setCanConfirm(false);
      
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            setCanConfirm(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [open]);

  const handleConfirm = async () => {
    if (confirmText !== 'LEAVE' || !canConfirm) return;
    
    setLoading(true);
    try {
      await onConfirm();
    } finally {
      setLoading(false);
    }
  };

  const isValid = confirmText === 'LEAVE' && canConfirm;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* 
        DialogContent is a flex column with overflow-hidden.
        Children must use flex-shrink-0 for fixed elements and
        flex-1 overflow-y-auto for scrollable content.
      */}
      <DialogContent className="sm:max-w-md">
        {/* Header - fixed, doesn't shrink */}
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive text-lg sm:text-xl">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            Leave Couple?
          </DialogTitle>
        </DialogHeader>

        {/* Scrollable content area - takes remaining space, scrolls if needed */}
        <div className="flex-1 min-h-0 overflow-y-auto -mx-4 px-4 sm:-mx-6 sm:px-6">
          <div className="space-y-4 py-1">
            <p className="text-sm text-muted-foreground">
              This action cannot be undone. You will permanently lose access to:
            </p>

            <div className="space-y-3 bg-destructive/5 rounded-lg p-4">
              <div className="flex items-start gap-3 text-sm">
                <Heart className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                <span>All shared ritual history with {partnerName || 'your partner'}</span>
              </div>
              <div className="flex items-start gap-3 text-sm">
                <Calendar className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                <span>Your weekly ritual preferences and inputs</span>
              </div>
              <div className="flex items-start gap-3 text-sm">
                <Star className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                <span>Your couple's streak data and traditions</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium block">
                Type <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-xs">LEAVE</span> to confirm:
              </label>
              <Input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
                placeholder="LEAVE"
                className="font-mono text-base h-12"
                autoFocus={false}
                autoComplete="off"
                spellCheck={false}
              />
              {countdown > 0 && (
                <p className="text-xs text-muted-foreground">
                  Please wait {countdown} second{countdown !== 1 ? 's' : ''} before confirming
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Footer - fixed, doesn't shrink, always visible */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t flex-shrink-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1 h-12 min-h-[44px] text-base"
            type="button"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!isValid || loading}
            className="flex-1 h-12 min-h-[44px] text-base"
            type="button"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Leaving...
              </>
            ) : countdown > 0 ? (
              `Wait ${countdown}s...`
            ) : (
              'Leave Couple'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
