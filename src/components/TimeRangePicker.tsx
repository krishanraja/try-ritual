/**
 * TimeRangePicker Component
 * 
 * Allows users to select a time range (availability window) instead of
 * a single specific time. This enables better matching between partners.
 * 
 * @created 2025-12-25 - Ritual Flow Overhaul
 */

import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TimeRangePickerProps {
  startTime: string;
  endTime: string;
  onStartTimeChange: (time: string) => void;
  onEndTimeChange: (time: string) => void;
  className?: string;
}

// Common time slots for quick selection
const QUICK_SLOTS = [
  { label: 'Morning', start: '09:00', end: '12:00' },
  { label: 'Afternoon', start: '12:00', end: '17:00' },
  { label: 'Evening', start: '17:00', end: '21:00' },
  { label: 'Night', start: '19:00', end: '23:00' },
];

export function TimeRangePicker({
  startTime,
  endTime,
  onStartTimeChange,
  onEndTimeChange,
  className,
}: TimeRangePickerProps) {
  const [activeQuickSlot, setActiveQuickSlot] = useState<string | null>(null);

  // Check if current selection matches a quick slot
  useEffect(() => {
    const match = QUICK_SLOTS.find(
      (slot) => slot.start === startTime && slot.end === endTime
    );
    setActiveQuickSlot(match?.label ?? null);
  }, [startTime, endTime]);

  const handleQuickSlotClick = (slot: typeof QUICK_SLOTS[0]) => {
    onStartTimeChange(slot.start);
    onEndTimeChange(slot.end);
    setActiveQuickSlot(slot.label);
  };

  const formatTimeForDisplay = (time: string): string => {
    try {
      const [hours, minutes] = time.split(':').map(Number);
      const period = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
      return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
    } catch {
      return time;
    }
  };

  return (
    <div className={cn('space-y-3', className)}>
      {/* Quick slots */}
      <div className="grid grid-cols-4 gap-2">
        {QUICK_SLOTS.map((slot) => (
          <button
            key={slot.label}
            type="button"
            onClick={() => handleQuickSlotClick(slot)}
            className={cn(
              'py-2 px-1 rounded-lg text-xs font-medium transition-all',
              'border',
              activeQuickSlot === slot.label
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-muted/50 text-muted-foreground border-transparent hover:bg-muted hover:border-border'
            )}
          >
            {slot.label}
          </button>
        ))}
      </div>

      {/* Custom time range inputs */}
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <label className="text-xs text-muted-foreground mb-1 block">From</label>
          <div className="relative">
            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              type="time"
              value={startTime}
              onChange={(e) => {
                onStartTimeChange(e.target.value);
                setActiveQuickSlot(null);
              }}
              className="w-full h-10 pl-9 pr-3 rounded-lg border bg-background text-sm"
            />
          </div>
        </div>
        
        <div className="flex-none pt-5 text-muted-foreground text-sm">to</div>
        
        <div className="flex-1">
          <label className="text-xs text-muted-foreground mb-1 block">Until</label>
          <div className="relative">
            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              type="time"
              value={endTime}
              onChange={(e) => {
                onEndTimeChange(e.target.value);
                setActiveQuickSlot(null);
              }}
              className="w-full h-10 pl-9 pr-3 rounded-lg border bg-background text-sm"
            />
          </div>
        </div>
      </div>

      {/* Visual preview */}
      <div className="bg-primary/5 rounded-lg p-3 border border-primary/20">
        <div className="flex items-center gap-2 text-sm">
          <Clock className="w-4 h-4 text-primary" />
          <span className="text-muted-foreground">Available:</span>
          <span className="font-medium text-primary">
            {formatTimeForDisplay(startTime)} - {formatTimeForDisplay(endTime)}
          </span>
        </div>
      </div>
    </div>
  );
}




