-- Create ritual_preferences table for mutual agreement
CREATE TABLE public.ritual_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  weekly_cycle_id UUID NOT NULL REFERENCES public.weekly_cycles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ritual_title TEXT NOT NULL,
  ritual_data JSONB NOT NULL, -- Store full ritual data
  rank INTEGER NOT NULL CHECK (rank >= 1 AND rank <= 3),
  proposed_date DATE,
  proposed_time TIME,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(weekly_cycle_id, user_id, rank)
);

-- Enable RLS
ALTER TABLE public.ritual_preferences ENABLE ROW LEVEL SECURITY;

-- Users can view their couple's preferences
CREATE POLICY "Users can view their couple's preferences"
ON public.ritual_preferences
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.weekly_cycles wc
    JOIN public.couples c ON c.id = wc.couple_id
    WHERE wc.id = ritual_preferences.weekly_cycle_id
    AND (c.partner_one = auth.uid() OR c.partner_two = auth.uid())
  )
);

-- Users can insert their own preferences
CREATE POLICY "Users can insert their preferences"
ON public.ritual_preferences
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.weekly_cycles wc
    JOIN public.couples c ON c.id = wc.couple_id
    WHERE wc.id = ritual_preferences.weekly_cycle_id
    AND (c.partner_one = auth.uid() OR c.partner_two = auth.uid())
  )
);

-- Users can update their own preferences
CREATE POLICY "Users can update their preferences"
ON public.ritual_preferences
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own preferences
CREATE POLICY "Users can delete their preferences"
ON public.ritual_preferences
FOR DELETE
USING (auth.uid() = user_id);

-- Add agreement tracking to weekly_cycles
ALTER TABLE public.weekly_cycles
ADD COLUMN IF NOT EXISTS agreement_reached BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS agreed_ritual JSONB,
ADD COLUMN IF NOT EXISTS agreed_date DATE,
ADD COLUMN IF NOT EXISTS agreed_time TIME;