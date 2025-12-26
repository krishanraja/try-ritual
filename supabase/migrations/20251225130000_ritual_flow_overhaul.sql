-- Migration: Ritual Flow Overhaul
-- Purpose: Add proposer tracking and time range support for ritual selection
-- Date: 2025-12-25

-- Add proposer_user_id to weekly_cycles (determined by who submitted first)
ALTER TABLE public.weekly_cycles
ADD COLUMN IF NOT EXISTS proposer_user_id UUID REFERENCES auth.users(id);

-- Add time range columns (replacing single agreed_time)
ALTER TABLE public.weekly_cycles
ADD COLUMN IF NOT EXISTS agreed_time_start TIME,
ADD COLUMN IF NOT EXISTS agreed_time_end TIME;

-- Add time range columns to ritual_preferences
ALTER TABLE public.ritual_preferences
ADD COLUMN IF NOT EXISTS proposed_time_start TIME,
ADD COLUMN IF NOT EXISTS proposed_time_end TIME;

-- Create a trigger function to automatically set proposer_user_id
-- based on who submitted their input first
CREATE OR REPLACE FUNCTION public.set_proposer_user_id()
RETURNS TRIGGER AS $$
BEGIN
  -- Only set proposer if not already set and both inputs exist
  IF NEW.proposer_user_id IS NULL 
     AND NEW.partner_one_input IS NOT NULL 
     AND NEW.partner_two_input IS NOT NULL THEN
    
    -- Determine who submitted first based on timestamps
    IF NEW.partner_one_submitted_at IS NOT NULL AND NEW.partner_two_submitted_at IS NOT NULL THEN
      -- Get the couple to find partner IDs
      DECLARE
        v_partner_one UUID;
        v_partner_two UUID;
      BEGIN
        SELECT partner_one, partner_two 
        INTO v_partner_one, v_partner_two
        FROM public.couples 
        WHERE id = NEW.couple_id;
        
        -- The partner who submitted first is the proposer
        IF NEW.partner_one_submitted_at <= NEW.partner_two_submitted_at THEN
          NEW.proposer_user_id := v_partner_one;
        ELSE
          NEW.proposer_user_id := v_partner_two;
        END IF;
      END;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic proposer assignment
DROP TRIGGER IF EXISTS set_proposer_on_update ON public.weekly_cycles;
CREATE TRIGGER set_proposer_on_update
  BEFORE UPDATE ON public.weekly_cycles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_proposer_user_id();

-- Add index for proposer lookups
CREATE INDEX IF NOT EXISTS idx_weekly_cycles_proposer 
ON public.weekly_cycles(proposer_user_id);

-- Comment for documentation
COMMENT ON COLUMN public.weekly_cycles.proposer_user_id IS 
  'The user who submitted their input first; they decide tie-breakers in ritual selection';

COMMENT ON COLUMN public.weekly_cycles.agreed_time_start IS 
  'Start of the agreed time window for the ritual';

COMMENT ON COLUMN public.weekly_cycles.agreed_time_end IS 
  'End of the agreed time window for the ritual';

COMMENT ON COLUMN public.ritual_preferences.proposed_time_start IS 
  'Start of user''s proposed availability window';

COMMENT ON COLUMN public.ritual_preferences.proposed_time_end IS 
  'End of user''s proposed availability window';




