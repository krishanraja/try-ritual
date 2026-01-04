/**
 * MatchPhase Component
 * 
 * Shows matched rituals and allows selection of alternative rituals/time slots.
 * Features the "Great Minds" celebration and animated reveal.
 * 
 * MAJOR UPDATE (2026-01-04):
 * - Fixed card cutoff at top with proper safe area handling
 * - Added ritual selector when multiple matches exist
 * - Added time slot picker with 1-hour granularity
 * - Added picker rotation (one partner picks slot each week)
 * 
 * @created 2025-12-26
 * @updated 2026-01-04 - Complete UX overhaul
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Sparkles, Clock, Calendar, AlertCircle, ChevronLeft, ChevronRight, Heart, Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { MatchResult, dayOffsetToDate, getSlotDisplayName, TimeSlot } from '@/types/database';

interface MatchPhaseProps {
  matchResult: MatchResult;
  partnerName: string;
  onConfirm: () => Promise<void>;
  error: string | null;
  // New props for enhanced selection
  allSlots?: Array<{ dayOffset: number; timeSlot: TimeSlot }>;
  isSlotPicker?: boolean; // Whether this user gets to pick the slot this week
}

// 1-hour time slots within each time band
const HOUR_SLOTS: Record<TimeSlot, string[]> = {
  morning: ['8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM'],
  afternoon: ['12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM'],
  evening: ['5:00 PM', '6:00 PM', '7:00 PM', '8:00 PM', '9:00 PM'],
};

export function MatchPhase({
  matchResult,
  partnerName,
  onConfirm,
  error,
  allSlots = [],
  isSlotPicker = true, // Default to true for backwards compatibility
}: MatchPhaseProps) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [selectedRitualIndex, setSelectedRitualIndex] = useState(0);
  const [selectedSlotIndex, setSelectedSlotIndex] = useState(0);
  const [selectedHourSlot, setSelectedHourSlot] = useState<string | null>(null);
  const [showSlotPicker, setShowSlotPicker] = useState(false);
  
  const handleConfirm = async () => {
    setIsConfirming(true);
    try {
      await onConfirm();
    } finally {
      setIsConfirming(false);
    }
  };
  
  const { matchedRitual, matchedSlot, hasTimeConflict, rankings } = matchResult;
  
  // Filter to only rituals where both partners picked
  const mutualRituals = useMemo(() => 
    rankings.filter(r => r.myRank !== null && r.partnerRank !== null),
    [rankings]
  );
  
  // Get overlapping time slots
  const overlappingSlots = useMemo(() => {
    if (allSlots.length > 0) return allSlots;
    // Fallback to single matched slot
    return matchedSlot ? [matchedSlot] : [];
  }, [allSlots, matchedSlot]);
  
  // Currently selected ritual and slot
  const currentRitual = mutualRituals[selectedRitualIndex]?.ritual || matchedRitual;
  const currentSlot = overlappingSlots[selectedSlotIndex] || matchedSlot;
  const currentDate = currentSlot ? dayOffsetToDate(currentSlot.dayOffset) : null;
  
  // Get hour slots for current time band
  const availableHourSlots = currentSlot ? HOUR_SLOTS[currentSlot.timeSlot] : [];
  
  const canNavigateRituals = mutualRituals.length > 1;
  const canNavigateSlots = overlappingSlots.length > 1;
  
  const handlePrevRitual = () => {
    setSelectedRitualIndex(prev => (prev - 1 + mutualRituals.length) % mutualRituals.length);
  };
  
  const handleNextRitual = () => {
    setSelectedRitualIndex(prev => (prev + 1) % mutualRituals.length);
  };
  
  const handlePrevSlot = () => {
    setSelectedSlotIndex(prev => (prev - 1 + overlappingSlots.length) % overlappingSlots.length);
    setSelectedHourSlot(null); // Reset hour selection when changing time band
  };
  
  const handleNextSlot = () => {
    setSelectedSlotIndex(prev => (prev + 1) % overlappingSlots.length);
    setSelectedHourSlot(null);
  };
  
  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header with safe area padding */}
      <div className="flex-none px-4 pt-safe-top pb-2 text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', duration: 0.5 }}
          className="w-16 h-16 mx-auto mb-3 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center shadow-lg shadow-primary/30"
        >
          <Sparkles className="w-8 h-8 text-white" />
        </motion.div>
        
        <motion.h2 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-2xl font-bold mb-1"
        >
          Great Minds! ✨
        </motion.h2>
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-muted-foreground"
        >
          You both have rituals in common
        </motion.p>
      </div>
      
      {/* Error display */}
      {error && (
        <div className="mx-4 mb-3 flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-lg p-3">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      
      {/* Time conflict warning */}
      {hasTimeConflict && (
        <div className="mx-4 mb-3 flex items-center gap-2 text-sm text-amber-700 bg-amber-50 rounded-lg p-3">
          <Clock className="w-4 h-4 flex-shrink-0" />
          <span>No overlapping times yet. You may need to adjust your availability.</span>
        </div>
      )}
      
      {/* Main scrollable content - proper containment prevents cutoff */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 px-4">
        <div className="space-y-4 pb-4">
          
          {/* Ritual Selector Carousel */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="ring-2 ring-green-500 bg-green-50/50 overflow-visible">
              <CardContent className="p-4">
                {/* Best Match badge with ritual counter */}
                <div className="flex items-center justify-between mb-3">
                  <span className="inline-block px-3 py-1 bg-green-500 text-white text-xs font-semibold rounded-full">
                    {mutualRituals.length > 1 
                      ? `Match ${selectedRitualIndex + 1} of ${mutualRituals.length}` 
                      : 'Best Match'}
                  </span>
                  
                  {/* Ritual navigation arrows */}
                  {canNavigateRituals && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={handlePrevRitual}
                        className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center hover:bg-gray-50 transition-colors"
                        aria-label="Previous ritual"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        onClick={handleNextRitual}
                        className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center hover:bg-gray-50 transition-colors"
                        aria-label="Next ritual"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
                
                {/* Ritual content with animation */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={selectedRitualIndex}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    <h3 className="font-bold text-lg mb-2">{currentRitual?.title}</h3>
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {currentRitual?.description}
                    </p>
                    
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        You: <span className="font-semibold text-foreground">#{mutualRituals[selectedRitualIndex]?.myRank || '—'}</span>
                      </span>
                      <span className="text-muted-foreground/50">•</span>
                      <span className="flex items-center gap-1">
                        {partnerName}: <span className="font-semibold text-foreground">#{mutualRituals[selectedRitualIndex]?.partnerRank || '—'}</span>
                      </span>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </CardContent>
            </Card>
          </motion.div>
          
          {/* Time Slot Selector */}
          {currentSlot && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Card className="bg-white/90 backdrop-blur-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-medium">When</span>
                    </div>
                    
                    {/* Time slot navigation arrows */}
                    {canNavigateSlots && isSlotPicker && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={handlePrevSlot}
                          className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                          aria-label="Previous time slot"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="text-xs text-muted-foreground px-2">
                          {selectedSlotIndex + 1}/{overlappingSlots.length}
                        </span>
                        <button
                          onClick={handleNextSlot}
                          className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                          aria-label="Next time slot"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                  
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={selectedSlotIndex}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-3"
                    >
                      {/* Date and time band display */}
                      <div className="flex items-center gap-4 text-sm">
                        <span className="flex items-center gap-1.5 text-green-700 font-medium">
                          <Calendar className="w-4 h-4" />
                          {currentDate && format(currentDate, 'EEE, MMM d')}
                        </span>
                        <span className="flex items-center gap-1.5 text-green-700 font-medium">
                          <Clock className="w-4 h-4" />
                          {getSlotDisplayName(currentSlot.timeSlot)}
                        </span>
                      </div>
                      
                      {/* Hour slot picker (only for the designated picker) */}
                      {isSlotPicker && (
                        <>
                          <button
                            onClick={() => setShowSlotPicker(!showSlotPicker)}
                            className="w-full text-left text-xs text-primary font-medium hover:underline"
                          >
                            {showSlotPicker ? 'Hide specific times' : 'Pick a specific 1-hour slot →'}
                          </button>
                          
                          <AnimatePresence>
                            {showSlotPicker && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="overflow-hidden"
                              >
                                <div className="grid grid-cols-3 gap-2 pt-2">
                                  {availableHourSlots.map((slot) => (
                                    <button
                                      key={slot}
                                      onClick={() => setSelectedHourSlot(slot)}
                                      className={cn(
                                        "py-2 px-3 rounded-lg text-xs font-medium transition-all",
                                        selectedHourSlot === slot
                                          ? "bg-primary text-white shadow-md"
                                          : "bg-gray-100 hover:bg-gray-200"
                                      )}
                                    >
                                      {slot}
                                    </button>
                                  ))}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </>
                      )}
                      
                      {/* Not the picker - show waiting message */}
                      {!isSlotPicker && (
                        <p className="text-xs text-muted-foreground italic">
                          {partnerName} will pick the exact time this week
                        </p>
                      )}
                    </motion.div>
                  </AnimatePresence>
                </CardContent>
              </Card>
            </motion.div>
          )}
          
          {/* Other matched rituals (collapsed list) */}
          {rankings.filter(r => r.myRank !== null || r.partnerRank !== null).length > 1 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="space-y-2"
            >
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide px-1">
                Other matches
              </p>
              {rankings
                .filter((r, idx) => idx !== selectedRitualIndex && (r.myRank !== null || r.partnerRank !== null))
                .slice(0, 3)
                .map((item, idx) => (
                  <Card 
                    key={item.ritual.title}
                    className="bg-white/60 hover:bg-white/80 transition-colors cursor-pointer"
                    onClick={() => {
                      const actualIndex = rankings.findIndex(r => r.ritual.title === item.ritual.title);
                      const mutualIndex = mutualRituals.findIndex(r => r.ritual.title === item.ritual.title);
                      if (mutualIndex !== -1) {
                        setSelectedRitualIndex(mutualIndex);
                      }
                    }}
                  >
                    <CardContent className="p-3 flex items-center justify-between">
                      <span className="text-sm font-medium truncate">{item.ritual.title}</span>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground flex-shrink-0">
                        <span>You: #{item.myRank || '—'}</span>
                        <span>•</span>
                        <span>{partnerName}: #{item.partnerRank || '—'}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </motion.div>
          )}
        </div>
      </div>
      
      {/* Confirm button - fixed at bottom with safe area */}
      <div className="flex-none px-4 py-3 pb-safe bg-background/95 backdrop-blur-sm border-t">
        <Button
          onClick={handleConfirm}
          disabled={!currentRitual || (!currentSlot && !hasTimeConflict) || isConfirming}
          className="w-full h-12 bg-gradient-to-r from-primary to-purple-500 text-white"
        >
          {isConfirming ? (
            <span className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Locking in...
            </span>
          ) : !currentSlot && !hasTimeConflict ? (
            'No matching time slot'
          ) : (
            <span className="flex items-center gap-2">
              <Check className="w-4 h-4" />
              Go with {currentRitual?.title?.split(' ').slice(0, 3).join(' ')}
              {selectedHourSlot && ` at ${selectedHourSlot}`}
            </span>
          )}
        </Button>
      </div>
    </div>
  );
}
