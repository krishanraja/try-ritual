import { Tables } from '@/integrations/supabase/types';

// Type aliases for better readability
export type Couple = Tables<'couples'>;
export type Profile = Tables<'profiles'>;
export type WeeklyCycle = Tables<'weekly_cycles'>;
export type RitualPreference = Tables<'ritual_preferences'>;
export type Completion = Tables<'completions'>;
export type RitualStreak = Tables<'ritual_streaks'>;
export type RitualMemory = Tables<'ritual_memories'>;
export type RitualFeedback = Tables<'ritual_feedback'>;
export type RitualSuggestion = Tables<'ritual_suggestions'>;
export type RitualLibrary = Tables<'ritual_library'>;

// Extended types with relationships
export interface CoupleWithProfiles extends Couple {
  partner_one_profile?: Profile;
  partner_two_profile?: Profile;
}

export interface WeeklyCycleWithData extends WeeklyCycle {
  couple?: Couple;
  preferences?: RitualPreference[];
  completions?: Completion[];
}
