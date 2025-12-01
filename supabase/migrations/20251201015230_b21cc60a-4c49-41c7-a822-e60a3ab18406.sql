-- Create update_updated_at function if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create ritual_feedback table for post-event check-ins
CREATE TABLE IF NOT EXISTS public.ritual_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id uuid NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  weekly_cycle_id uuid NOT NULL REFERENCES public.weekly_cycles(id) ON DELETE CASCADE,
  did_complete boolean,
  connection_rating integer CHECK (connection_rating >= 1 AND connection_rating <= 5),
  would_repeat text CHECK (would_repeat IN ('yes', 'maybe', 'no')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ritual_feedback ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ritual_feedback
CREATE POLICY "Users can view their couple's feedback"
  ON public.ritual_feedback
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.couples
      WHERE couples.id = ritual_feedback.couple_id
      AND (couples.partner_one = auth.uid() OR couples.partner_two = auth.uid())
    )
  );

CREATE POLICY "Users can insert their couple's feedback"
  ON public.ritual_feedback
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.couples
      WHERE couples.id = ritual_feedback.couple_id
      AND (couples.partner_one = auth.uid() OR couples.partner_two = auth.uid())
    )
  );

CREATE POLICY "Users can update their couple's feedback"
  ON public.ritual_feedback
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.couples
      WHERE couples.id = ritual_feedback.couple_id
      AND (couples.partner_one = auth.uid() OR couples.partner_two = auth.uid())
    )
  );

-- Create index for faster lookups
CREATE INDEX idx_ritual_feedback_couple_id ON public.ritual_feedback(couple_id);
CREATE INDEX idx_ritual_feedback_weekly_cycle_id ON public.ritual_feedback(weekly_cycle_id);

-- Trigger for updated_at
CREATE TRIGGER update_ritual_feedback_updated_at
  BEFORE UPDATE ON public.ritual_feedback
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();