/**
 * Anti-Fragile Guard Utilities
 * 
 * Provides safe accessors for potentially null/undefined data in the ritual flow.
 * Every function returns a predictable shape, ensuring the UI never crashes from
 * missing or malformed data.
 * 
 * @created 2025-12-25 - Ritual Flow Overhaul
 */

import type { RitualPreference } from '@/types/database';

/**
 * Ritual interface - consistent shape for all ritual data
 */
export interface SafeRitual {
  id: string | number;
  title: string;
  description: string;
  time_estimate: string;
  budget_band: string;
  category?: string;
  why?: string;
}

/**
 * Safe preference interface with guaranteed fields
 */
export interface SafePreference {
  rank: number;
  ritual: SafeRitual;
  proposed_date?: string;
  proposed_time?: string;
  proposed_time_start?: string;
  proposed_time_end?: string;
}

/**
 * Time range interface for availability windows
 */
export interface TimeRange {
  start: string; // HH:MM format
  end: string;   // HH:MM format
}

/**
 * Safely extracts rituals from synthesized_output
 * Handles all possible formats: null, array, { rituals: [...] }
 */
export function safeRituals(output: unknown): SafeRitual[] {
  if (!output) return [];
  
  // Direct array format (legacy or edge case)
  if (Array.isArray(output)) {
    return output.filter(isValidRitual);
  }
  
  // Standard { rituals: [...] } format
  if (typeof output === 'object' && output !== null) {
    const obj = output as Record<string, unknown>;
    if (Array.isArray(obj.rituals)) {
      return obj.rituals.filter(isValidRitual);
    }
  }
  
  console.warn('[guards] Unknown synthesized_output format:', typeof output);
  return [];
}

/**
 * Validates that an object has the required ritual fields
 */
function isValidRitual(item: unknown): item is SafeRitual {
  if (!item || typeof item !== 'object') return false;
  const obj = item as Record<string, unknown>;
  return (
    typeof obj.title === 'string' &&
    typeof obj.description === 'string' &&
    obj.title.length > 0
  );
}

/**
 * Safely extracts preferences from database results
 * Handles null arrays, missing ritual_data, etc.
 */
export function safePreferences(prefs: unknown[]): SafePreference[] {
  if (!Array.isArray(prefs)) return [];
  
  return prefs
    .filter((p): p is Record<string, unknown> => {
      if (!p || typeof p !== 'object') return false;
      const obj = p as Record<string, unknown>;
      return (
        typeof obj.rank === 'number' &&
        obj.rank >= 1 && 
        obj.rank <= 3 &&
        obj.ritual_data !== null &&
        typeof obj.ritual_data === 'object'
      );
    })
    .map(p => ({
      rank: p.rank as number,
      ritual: p.ritual_data as SafeRitual,
      proposed_date: p.proposed_date as string | undefined,
      proposed_time: p.proposed_time as string | undefined,
      proposed_time_start: p.proposed_time_start as string | undefined,
      proposed_time_end: p.proposed_time_end as string | undefined,
    }));
}

/**
 * Calculates overlapping time window between two ranges
 * Returns null if no overlap exists
 */
export function calculateTimeOverlap(
  range1: TimeRange | null | undefined,
  range2: TimeRange | null | undefined
): TimeRange | null {
  if (!range1 || !range2) return null;
  
  const start1 = timeToMinutes(range1.start);
  const end1 = timeToMinutes(range1.end);
  const start2 = timeToMinutes(range2.start);
  const end2 = timeToMinutes(range2.end);
  
  if (start1 === null || end1 === null || start2 === null || end2 === null) {
    return null;
  }
  
  const overlapStart = Math.max(start1, start2);
  const overlapEnd = Math.min(end1, end2);
  
  // No overlap if start >= end
  if (overlapStart >= overlapEnd) {
    return null;
  }
  
  return {
    start: minutesToTime(overlapStart),
    end: minutesToTime(overlapEnd),
  };
}

/**
 * Converts HH:MM string to minutes from midnight
 */
function timeToMinutes(time: string): number | null {
  if (!time || typeof time !== 'string') return null;
  
  const match = time.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  
  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  
  return hours * 60 + minutes;
}

/**
 * Converts minutes from midnight to HH:MM string
 */
function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

/**
 * Finds the best ritual based on combined rankings
 * Algorithm: Rituals ranked by both partners win; lowest combined rank is best
 */
export function findBestRitual(
  myPrefs: SafePreference[],
  partnerPrefs: SafePreference[]
): { ritual: SafeRitual; isOverlap: boolean } | null {
  if (myPrefs.length === 0) return null;
  
  // Build maps for quick lookup
  const myRankByTitle = new Map<string, number>();
  const myRitualByTitle = new Map<string, SafeRitual>();
  myPrefs.forEach(p => {
    myRankByTitle.set(p.ritual.title, p.rank);
    myRitualByTitle.set(p.ritual.title, p.ritual);
  });
  
  const partnerRankByTitle = new Map<string, number>();
  partnerPrefs.forEach(p => {
    partnerRankByTitle.set(p.ritual.title, p.rank);
  });
  
  // Find overlapping rituals
  const overlaps: Array<{ title: string; combinedRank: number }> = [];
  myRankByTitle.forEach((myRank, title) => {
    const partnerRank = partnerRankByTitle.get(title);
    if (partnerRank !== undefined) {
      overlaps.push({ title, combinedRank: myRank + partnerRank });
    }
  });
  
  // If there are overlaps, pick the best one
  if (overlaps.length > 0) {
    overlaps.sort((a, b) => a.combinedRank - b.combinedRank);
    const bestTitle = overlaps[0].title;
    const bestRitual = myRitualByTitle.get(bestTitle);
    if (bestRitual) {
      return { ritual: bestRitual, isOverlap: true };
    }
  }
  
  // No overlap - return null (caller should use proposer's pick)
  return null;
}

/**
 * Gets the top pick (rank 1) from preferences
 */
export function getTopPick(prefs: SafePreference[]): SafePreference | null {
  return prefs.find(p => p.rank === 1) ?? null;
}

/**
 * Safe date string formatter
 */
export function safeFormatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return 'TBD';
  
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return 'TBD';
    
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return 'TBD';
  }
}

/**
 * Safe time string formatter
 */
export function safeFormatTime(timeStr: string | null | undefined): string {
  if (!timeStr) return '7:00 PM';
  
  try {
    const [hours, minutes] = timeStr.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) return '7:00 PM';
    
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  } catch {
    return '7:00 PM';
  }
}

/**
 * Safe time range formatter
 */
export function safeFormatTimeRange(
  startStr: string | null | undefined,
  endStr: string | null | undefined
): string {
  const start = safeFormatTime(startStr);
  const end = safeFormatTime(endStr);
  
  if (start === end || !endStr) return start;
  return `${start} - ${end}`;
}




