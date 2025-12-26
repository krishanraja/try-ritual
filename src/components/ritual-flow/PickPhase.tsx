 /**
 * PickPhase Component
 * 
 * Combined ritual ranking + availability selection with progressive disclosure.
 * Sections auto-collapse as user completes each step.
 * 
 * @created 2025-12-26
 * @updated 2025-12-26 - Added progressive disclosure, reduced header height
 */

import { useMemo, useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Clock, DollarSign, Star, Check, AlertCircle, ChevronDown, ChevronUp, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { AvailabilityGrid } from './AvailabilityGrid';
import type { Ritual, RitualPreference, AvailabilitySlot, TimeSlot } from '@/types/database';

interface PickPhaseProps {
  rituals: Ritual[];
  myPicks: RitualPreference[];
  partnerPicks: RitualPreference[];
  mySlots: AvailabilitySlot[];
  partnerSlots: AvailabilitySlot[];
  onRankRitual: (ritual: Ritual, rank: number) => Promise<void>;
  onRemoveRank: (rank: number) => Promise<void>;
  onToggleSlot: (dayOffset: number, timeSlot: TimeSlot) => Promise<void>;
  onSubmit: () => Promise<void>;
  error: string | null;
}

type ActiveSection = 'rituals' | 'availability';

export function PickPhase({
  rituals,
  myPicks,
  partnerPicks,
  mySlots,
  partnerSlots,
  onRankRitual,
  onRemoveRank,
  onToggleSlot,
  onSubmit,
  error
}: PickPhaseProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedRitual, setExpandedRitual] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<ActiveSection>('rituals');
  const hasAutoTransitioned = useRef(false);
  
  // Build lookup for my picks
  const myPicksByRitual = useMemo(() => {
    const map = new Map<string, number>();
    myPicks.forEach(p => map.set(p.ritual_title, p.rank));
    return map;
  }, [myPicks]);
  
  // Check if partner has picked this ritual (show indicator but not rank)
  const partnerPickedRituals = useMemo(() => {
    return new Set(partnerPicks.map(p => p.ritual_title));
  }, [partnerPicks]);
  
  // Validation
  const hasAllPicks = myPicks.length >= 3;
  const hasAvailability = mySlots.length > 0;
  const canSubmit = hasAllPicks && hasAvailability;
  
  // Find overlapping slots
  const hasOverlap = useMemo(() => {
    const myKeys = new Set(mySlots.map(s => `${s.day_offset}-${s.time_slot}`));
    return partnerSlots.some(s => myKeys.has(`${s.day_offset}-${s.time_slot}`));
  }, [mySlots, partnerSlots]);
  
  // Auto-transition to availability when all picks are done (only once)
  useEffect(() => {
    if (hasAllPicks && !hasAutoTransitioned.current) {
      hasAutoTransitioned.current = true;
      // Small delay for smooth UX
      const timer = setTimeout(() => {
        setActiveSection('availability');
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [hasAllPicks]);
  
  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onSubmit();
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleRankClick = async (ritual: Ritual) => {
    const currentRank = myPicksByRitual.get(ritual.title);
    
    if (currentRank) {
      // Already ranked - remove it
      await onRemoveRank(currentRank);
    } else {
      // Not ranked - assign next available rank
      const usedRanks = new Set(myPicks.map(p => p.rank));
      const nextRank = [1, 2, 3].find(r => !usedRanks.has(r));
      if (nextRank) {
        await onRankRitual(ritual, nextRank);
      }
    }
  };
  
  // Get selected ritual names for summary
  const selectedRitualNames = myPicks
    .sort((a, b) => a.rank - b.rank)
    .map(p => p.ritual_title.split(' ').slice(0, 2).join(' '));
  
  return (
    <div className="h-full flex flex-col">
      {/* Compact Header */}
      <div className="flex-none px-4 py-2">
        {error && (
          <div className="mb-2 flex items-center gap-2 text-xs text-destructive bg-destructive/10 rounded-lg p-2">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
        
        <div className="text-center mb-2">
          <h2 className="text-lg font-bold">Pick Your Top 3</h2>
          <p className="text-xs text-muted-foreground">
            Tap to rank: 1st choice, 2nd choice, 3rd choice
          </p>
        </div>
        
        {/* Compact Selected ranks indicator */}
        <div className="grid grid-cols-3 gap-1.5 max-w-[280px] mx-auto">
          {[1, 2, 3].map(rank => {
            const pick = myPicks.find(p => p.rank === rank);
            return (
              <button
                key={rank}
                onClick={() => pick && onRemoveRank(rank)}
                className={cn(
                  "h-10 rounded-lg border-2 flex items-center justify-center transition-all px-1.5 gap-1",
                  pick 
                    ? "bg-primary/10 border-primary hover:bg-primary/20" 
                    : "border-dashed border-muted-foreground/30"
                )}
              >
                {pick ? (
                  <>
                    <Star className="w-3 h-3 text-primary flex-shrink-0" fill="currentColor" />
                    <span className="text-[10px] font-medium truncate">
                      {pick.ritual_title.split(' ').slice(0, 2).join(' ')}
                    </span>
                  </>
                ) : (
                  <span className="text-xs text-muted-foreground">#{rank}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
      
      {/* Scrollable content with collapsible sections */}
      <div className="flex-1 overflow-y-auto min-h-0 px-4">
        <div className="space-y-3 pb-4">
          
          {/* SECTION 1: Ritual Selection */}
          <div className="bg-card rounded-xl border overflow-hidden">
            {/* Section header - clickable to expand/collapse */}
            <button
              onClick={() => setActiveSection(activeSection === 'rituals' ? 'availability' : 'rituals')}
              className={cn(
                "w-full flex items-center justify-between p-3 transition-colors",
                activeSection === 'rituals' ? "bg-primary/5" : "hover:bg-muted/50"
              )}
            >
              <div className="flex items-center gap-2">
                <div className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                  hasAllPicks 
                    ? "bg-green-500 text-white" 
                    : "bg-primary/20 text-primary"
                )}>
                  {hasAllPicks ? <Check className="w-3.5 h-3.5" /> : "1"}
                </div>
                <div className="text-left">
                  <div className="text-sm font-semibold">Choose Rituals</div>
                  {hasAllPicks && activeSection !== 'rituals' && (
                    <div className="text-[10px] text-muted-foreground truncate max-w-[180px]">
                      {selectedRitualNames.join(', ')}
                    </div>
                  )}
                </div>
              </div>
              <ChevronDown className={cn(
                "w-4 h-4 text-muted-foreground transition-transform",
                activeSection === 'rituals' && "rotate-180"
              )} />
            </button>
            
            {/* Ritual cards - collapsible */}
            <AnimatePresence>
              {activeSection === 'rituals' && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="p-3 pt-0 space-y-2">
                    {rituals.map((ritual, idx) => {
                      const myRank = myPicksByRitual.get(ritual.title);
                      const partnerPicked = partnerPickedRituals.has(ritual.title);
                      const isExpanded = expandedRitual === ritual.title;
                      
                      return (
                        <motion.div
                          key={ritual.title}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.03 }}
                        >
                          <Card 
                            className={cn(
                              "transition-all cursor-pointer overflow-hidden",
                              myRank && "ring-2 ring-primary bg-primary/5",
                              partnerPicked && !myRank && "ring-1 ring-purple-300"
                            )}
                            onClick={() => handleRankClick(ritual)}
                          >
                            <CardContent className="p-2.5">
                              <div className="flex items-start gap-2.5">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5 mb-0.5">
                                    <h3 className="font-semibold text-sm truncate">{ritual.title}</h3>
                                    {partnerPicked && (
                                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-600 flex-shrink-0">
                                        Partner likes
                                      </span>
                                    )}
                                  </div>
                                  
                                  <p className={cn(
                                    "text-[11px] text-muted-foreground mb-1.5",
                                    isExpanded ? "" : "line-clamp-2"
                                  )}>
                                    {ritual.description}
                                  </p>
                                  
                                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                                    <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-muted rounded">
                                      <Clock className="w-2.5 h-2.5" />
                                      {ritual.time_estimate}
                                    </span>
                                    <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-muted rounded">
                                      <DollarSign className="w-2.5 h-2.5" />
                                      {ritual.budget_band}
                                    </span>
                                  </div>
                                  
                                  {ritual.why && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setExpandedRitual(isExpanded ? null : ritual.title);
                                      }}
                                      className="text-[10px] text-primary mt-1.5 hover:underline flex items-center gap-0.5"
                                    >
                                      {isExpanded ? (
                                        <>Show less <ChevronUp className="w-2.5 h-2.5" /></>
                                      ) : (
                                        <>Why this ritual? <ChevronDown className="w-2.5 h-2.5" /></>
                                      )}
                                    </button>
                                  )}
                                  
                                  {isExpanded && ritual.why && (
                                    <p className="text-[10px] text-muted-foreground mt-1.5 italic bg-muted/50 p-1.5 rounded">
                                      {ritual.why}
                                    </p>
                                  )}
                                </div>
                                
                                {/* Compact Rank indicator */}
                                <div className="flex-shrink-0">
                                  {myRank ? (
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-purple-500 text-white flex items-center justify-center font-bold text-sm shadow-md">
                                      {myRank}
                                    </div>
                                  ) : (
                                    <div className="w-8 h-8 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
                                      <span className="text-[10px] text-muted-foreground">+</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          {/* SECTION 2: Availability Selection */}
          <div className="bg-card rounded-xl border overflow-hidden">
            {/* Section header - clickable to expand/collapse */}
            <button
              onClick={() => setActiveSection(activeSection === 'availability' ? 'rituals' : 'availability')}
              className={cn(
                "w-full flex items-center justify-between p-3 transition-colors",
                activeSection === 'availability' ? "bg-primary/5" : "hover:bg-muted/50",
                !hasAllPicks && "opacity-60"
              )}
            >
              <div className="flex items-center gap-2">
                <div className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                  hasAvailability 
                    ? "bg-green-500 text-white" 
                    : hasAllPicks 
                      ? "bg-primary/20 text-primary"
                      : "bg-muted text-muted-foreground"
                )}>
                  {hasAvailability ? <Check className="w-3.5 h-3.5" /> : "2"}
                </div>
                <div className="text-left">
                  <div className="text-sm font-semibold flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    Pick Times
                  </div>
                  {hasAvailability && activeSection !== 'availability' && (
                    <div className="text-[10px] text-muted-foreground">
                      {mySlots.length} slot{mySlots.length !== 1 ? 's' : ''} selected
                      {hasOverlap && <span className="text-green-600 ml-1">• Match found!</span>}
                    </div>
                  )}
                </div>
              </div>
              <ChevronDown className={cn(
                "w-4 h-4 text-muted-foreground transition-transform",
                activeSection === 'availability' && "rotate-180"
              )} />
            </button>
            
            {/* Availability grid - collapsible */}
            <AnimatePresence>
              {activeSection === 'availability' && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="p-3 pt-0">
                    <AvailabilityGrid
                      mySlots={mySlots}
                      partnerSlots={partnerSlots}
                      onToggle={onToggleSlot}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
      
      {/* Submit button */}
      <div className="flex-none px-4 py-3 pb-safe bg-background/95 backdrop-blur-sm border-t">
        <Button
          onClick={handleSubmit}
          disabled={!canSubmit || isSubmitting}
          className="w-full h-11 bg-gradient-to-r from-primary to-purple-500 text-white"
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Saving...
            </span>
          ) : !hasAllPicks ? (
            `Pick ${3 - myPicks.length} more ritual${3 - myPicks.length > 1 ? 's' : ''}`
          ) : !hasAvailability ? (
            'Select your availability'
          ) : !hasOverlap && partnerSlots.length > 0 ? (
            'No matching times - adjust or continue'
          ) : (
            <span className="flex items-center gap-2">
              <Check className="w-4 h-4" />
              Done - See Results
            </span>
          )}
        </Button>
      </div>
    </div>
  );
}