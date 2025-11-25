import { useCouple } from '@/contexts/CoupleContext';
import { AlertCircle, CheckCircle, Clock, Heart } from 'lucide-react';

export const StatusIndicator = () => {
  const { user, couple, partnerProfile, currentCycle } = useCouple();

  if (!user) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <AlertCircle className="w-3 h-3" />
        <span>Not signed in</span>
      </div>
    );
  }

  if (!couple) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Heart className="w-3 h-3" />
        <span>Solo mode</span>
      </div>
    );
  }

  if (!couple.partner_two) {
    return (
      <div className="flex items-center gap-2 text-xs">
        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
        <span className="text-amber-600 dark:text-amber-400">Waiting for partner</span>
      </div>
    );
  }

  const hasPartnerOne = !!currentCycle?.partner_one_input;
  const hasPartnerTwo = !!currentCycle?.partner_two_input;
  const userIsPartnerOne = couple.partner_one === user.id;
  const userSubmitted = userIsPartnerOne ? hasPartnerOne : hasPartnerTwo;
  const partnerSubmitted = userIsPartnerOne ? hasPartnerTwo : hasPartnerOne;
  const hasSynthesized = currentCycle?.synthesized_output;

  if (hasSynthesized) {
    return (
      <div className="flex items-center gap-2 text-xs">
        <CheckCircle className="w-3 h-3 text-green-600" />
        <span className="text-green-600 dark:text-green-400">Rituals ready</span>
      </div>
    );
  }

  if (userSubmitted && partnerSubmitted) {
    return (
      <div className="flex items-center gap-2 text-xs">
        <Clock className="w-3 h-3 text-primary animate-pulse" />
        <span className="text-primary">Creating rituals...</span>
      </div>
    );
  }

  if (userSubmitted && !partnerSubmitted) {
    return (
      <div className="flex items-center gap-2 text-xs">
        <Clock className="w-3 h-3 text-muted-foreground" />
        <span className="text-muted-foreground">
          Waiting for {partnerProfile?.name || 'partner'}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-2 h-2 rounded-full bg-green-500" />
      <span className="text-muted-foreground">Connected</span>
    </div>
  );
};
