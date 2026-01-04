/**
 * RitualFlow Page
 * 
 * Unified flow for the entire ritual experience.
 * Replaces QuickInput and RitualPicker for the core flow.
 * 
 * @created 2025-12-26
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCouple } from '@/contexts/CoupleContext';
import { useRitualFlow } from '@/hooks/useRitualFlow';
import { AnimatedGradientBackground } from '@/components/AnimatedGradientBackground';
import { RitualLogo } from '@/components/RitualLogo';
import { RitualSpinner } from '@/components/RitualSpinner';
import {
  InputPhase,
  GeneratingPhase,
  PickPhase,
  MatchPhase,
  ConfirmedPhase,
  WaitingPhase,
} from '@/components/ritual-flow';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function RitualFlow() {
  const navigate = useNavigate();
  const { user, couple, partnerProfile, loading: authLoading, hasKnownSession } = useCouple();
  const flow = useRitualFlow();
  
  // Redirect if not authenticated or no couple
  // CRITICAL: Use hasKnownSession to avoid premature redirects during initial load
  // The authLoading state can briefly be false between auth completing and couple loading starting
  useEffect(() => {
    // Don't redirect while still loading
    if (authLoading) {
      return;
    }
    
    // Not authenticated - go to auth
    if (!user) {
      navigate('/auth');
      return;
    }
    
    // If we have a known session but couple is still null, wait for it to load
    // This prevents the race condition where authLoading becomes false before couple data arrives
    if (hasKnownSession && !couple) {
      // Still waiting for couple data to load - don't redirect yet
      console.log('[RitualFlow] Waiting for couple data to load...');
      return;
    }
    
    // No couple exists - go to home to create/join one
    if (!couple) {
      navigate('/');
      return;
    }
    
    // Couple exists but no partner yet - go to home
    if (!couple.partner_two) {
      navigate('/');
      return;
    }
  }, [authLoading, user, couple, navigate, hasKnownSession]);
  
  // Show loading while auth is resolving
  if (authLoading || flow.loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-gradient-warm">
        <RitualSpinner />
      </div>
    );
  }
  
  // No couple yet - should have redirected
  if (!couple?.partner_two) {
    return null;
  }
  
  const partnerName = partnerProfile?.name || 'your partner';
  
  return (
    <div className="h-full flex flex-col relative">
      <AnimatedGradientBackground variant="warm" />
      
      {/* Status header - always visible */}
      <div className="flex-none px-4 pt-4 pb-2 relative z-10">
        <div className="flex items-center justify-between mb-2">
          <RitualLogo size="sm" variant="icon" />
          <PartnerStatus 
            name={partnerName}
            theirProgress={flow.partnerProgress}
            status={flow.status}
          />
        </div>
        
        {/* Progress indicator */}
        <FlowProgress phase={flow.phase} />
      </div>
      
      {/* Main content */}
      <div className="flex-1 overflow-hidden min-h-0 relative z-10">
        <AnimatePresence mode="wait">
          {flow.phase === 'input' && (
            <PhaseWrapper key="input">
              <InputPhase
                selectedCards={flow.selectedCards}
                desire={flow.desire}
                onSelectCard={flow.selectCard}
                onSetDesire={flow.setDesire}
                onSubmit={flow.submitInput}
                error={flow.error}
                partnerProgress={flow.partnerProgress}
              />
            </PhaseWrapper>
          )}
          
          {flow.phase === 'waiting' && (
            <PhaseWrapper key="waiting">
              <WaitingPhase
                status={flow.status}
                partnerName={partnerName}
                myProgress={flow.myProgress}
                statusMessage={flow.statusMessage}
              />
            </PhaseWrapper>
          )}
          
          {flow.phase === 'generating' && (
            <PhaseWrapper key="generating">
              <GeneratingPhase
                status={flow.status}
                onRetry={flow.retryGeneration}
                error={flow.error}
              />
            </PhaseWrapper>
          )}
          
          {flow.phase === 'pick' && (
            <PhaseWrapper key="pick">
              <PickPhase
                rituals={flow.rituals}
                myPicks={flow.myProgress.picks}
                partnerPicks={flow.partnerProgress.picks}
                mySlots={flow.myProgress.availability}
                partnerSlots={flow.partnerProgress.availability}
                onRankRitual={flow.rankRitual}
                onRemoveRank={flow.removeRank}
                onToggleSlot={flow.toggleAvailability}
                onSubmit={flow.submitPicks}
                error={flow.error}
              />
            </PhaseWrapper>
          )}
          
          {flow.phase === 'match' && flow.matchResult && (
            <PhaseWrapper key="match">
              <MatchPhase
                matchResult={flow.matchResult}
                partnerName={partnerName}
                onConfirm={flow.confirmMatch}
                error={flow.error}
                allSlots={flow.overlappingSlots}
                isSlotPicker={flow.isSlotPicker}
              />
            </PhaseWrapper>
          )}
          
          {flow.phase === 'confirmed' && flow.cycle && (
            <PhaseWrapper key="confirmed">
              <ConfirmedPhase
                cycle={flow.cycle}
                onViewDetails={() => navigate('/rituals')}
              />
            </PhaseWrapper>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ============================================================================
// Supporting Components
// ============================================================================

function PhaseWrapper({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className="h-full"
    >
      {children}
    </motion.div>
  );
}

interface PartnerStatusProps {
  name: string;
  theirProgress: {
    inputDone: boolean;
    picksDone: boolean;
  };
  status: string;
}

function PartnerStatus({ name, theirProgress, status }: PartnerStatusProps) {
  // Determine what to show
  let statusText = '';
  let statusColor = 'text-muted-foreground';
  let dotColor = 'bg-gray-400';
  
  if (status.includes('awaiting_partner')) {
    statusText = `Waiting for ${name}`;
    statusColor = 'text-amber-600';
    dotColor = 'bg-amber-500';
  } else if (theirProgress.inputDone && !theirProgress.picksDone && status.includes('picks')) {
    statusText = `${name} is picking`;
    statusColor = 'text-blue-600';
    dotColor = 'bg-blue-500';
  } else if (theirProgress.picksDone) {
    statusText = `${name} is ready`;
    statusColor = 'text-green-600';
    dotColor = 'bg-green-500';
  } else if (theirProgress.inputDone) {
    statusText = `${name} submitted`;
    statusColor = 'text-green-600';
    dotColor = 'bg-green-500';
  } else if (status === 'generating') {
    statusText = 'Creating rituals...';
    statusColor = 'text-primary';
    dotColor = 'bg-primary animate-pulse';
  } else if (status === 'awaiting_agreement') {
    statusText = 'Ready to confirm';
    statusColor = 'text-green-600';
    dotColor = 'bg-green-500';
  } else if (status === 'agreed') {
    statusText = 'Rituals ready';
    statusColor = 'text-green-600';
    dotColor = 'bg-green-500';
  }
  
  if (!statusText) return null;
  
  return (
    <div className={cn("flex items-center gap-1.5 text-xs", statusColor)}>
      <div className={cn("w-2 h-2 rounded-full", dotColor)} />
      <span>{statusText}</span>
    </div>
  );
}

interface FlowProgressProps {
  phase: string;
}

function FlowProgress({ phase }: FlowProgressProps) {
  const steps = [
    { id: 'input', label: 'Mood' },
    { id: 'pick', label: 'Pick' },
    { id: 'match', label: 'Match' },
  ];
  
  const getStepStatus = (stepId: string) => {
    // Map phase to step completion
    if (phase === 'confirmed') return 'complete';
    if (phase === 'match' && stepId !== 'match') return 'complete';
    if ((phase === 'pick' || phase === 'waiting') && stepId === 'input') return 'complete';
    if (phase === 'generating' && stepId === 'input') return 'complete';
    
    // Current step
    if (phase === 'input' && stepId === 'input') return 'current';
    if ((phase === 'pick' || phase === 'waiting') && stepId === 'pick') return 'current';
    if (phase === 'match' && stepId === 'match') return 'current';
    if (phase === 'generating' && stepId === 'pick') return 'current';
    
    return 'upcoming';
  };
  
  return (
    <div className="flex items-center gap-1">
      {steps.map((step, idx) => {
        const status = getStepStatus(step.id);
        return (
          <div key={step.id} className="flex items-center">
            <div className={cn(
              "h-1.5 rounded-full transition-all duration-300",
              idx === 0 ? "w-8" : "w-12",
              status === 'complete' ? "bg-primary" : 
              status === 'current' ? "bg-primary/60" : 
              "bg-primary/20"
            )} />
            {idx < steps.length - 1 && <div className="w-1" />}
          </div>
        );
      })}
    </div>
  );
}

