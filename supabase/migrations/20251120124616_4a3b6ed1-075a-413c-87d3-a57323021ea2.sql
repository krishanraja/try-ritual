-- Create ritual_streaks table for gamification
CREATE TABLE IF NOT EXISTS public.ritual_streaks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  couple_id UUID NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_completion_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(couple_id)
);

-- Create ritual_memories table for memory book
CREATE TABLE IF NOT EXISTS public.ritual_memories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  couple_id UUID NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  ritual_title TEXT NOT NULL,
  ritual_description TEXT,
  completion_date DATE NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  notes TEXT,
  photo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create ritual_suggestions table for AI-powered suggestions
CREATE TABLE IF NOT EXISTS public.ritual_suggestions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  couple_id UUID NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  suggested_ritual JSONB NOT NULL,
  reason TEXT NOT NULL,
  based_on_history JSONB,
  shown_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  accepted BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ritual_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ritual_memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ritual_suggestions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ritual_streaks
CREATE POLICY "Users can view their couple's streak"
ON public.ritual_streaks FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.couples
    WHERE couples.id = ritual_streaks.couple_id
    AND (couples.partner_one = auth.uid() OR couples.partner_two = auth.uid())
  )
);

CREATE POLICY "Users can update their couple's streak"
ON public.ritual_streaks FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.couples
    WHERE couples.id = ritual_streaks.couple_id
    AND (couples.partner_one = auth.uid() OR couples.partner_two = auth.uid())
  )
);

CREATE POLICY "Users can insert their couple's streak"
ON public.ritual_streaks FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.couples
    WHERE couples.id = ritual_streaks.couple_id
    AND (couples.partner_one = auth.uid() OR couples.partner_two = auth.uid())
  )
);

-- RLS Policies for ritual_memories
CREATE POLICY "Users can view their couple's memories"
ON public.ritual_memories FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.couples
    WHERE couples.id = ritual_memories.couple_id
    AND (couples.partner_one = auth.uid() OR couples.partner_two = auth.uid())
  )
);

CREATE POLICY "Users can create their couple's memories"
ON public.ritual_memories FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.couples
    WHERE couples.id = ritual_memories.couple_id
    AND (couples.partner_one = auth.uid() OR couples.partner_two = auth.uid())
  )
);

CREATE POLICY "Users can update their couple's memories"
ON public.ritual_memories FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.couples
    WHERE couples.id = ritual_memories.couple_id
    AND (couples.partner_one = auth.uid() OR couples.partner_two = auth.uid())
  )
);

CREATE POLICY "Users can delete their couple's memories"
ON public.ritual_memories FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.couples
    WHERE couples.id = ritual_memories.couple_id
    AND (couples.partner_one = auth.uid() OR couples.partner_two = auth.uid())
  )
);

-- RLS Policies for ritual_suggestions
CREATE POLICY "Users can view their couple's suggestions"
ON public.ritual_suggestions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.couples
    WHERE couples.id = ritual_suggestions.couple_id
    AND (couples.partner_one = auth.uid() OR couples.partner_two = auth.uid())
  )
);

CREATE POLICY "System can create suggestions"
ON public.ritual_suggestions FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can update their couple's suggestions"
ON public.ritual_suggestions FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.couples
    WHERE couples.id = ritual_suggestions.couple_id
    AND (couples.partner_one = auth.uid() OR couples.partner_two = auth.uid())
  )
);

-- Create indexes for performance
CREATE INDEX idx_ritual_streaks_couple_id ON public.ritual_streaks(couple_id);
CREATE INDEX idx_ritual_memories_couple_id ON public.ritual_memories(couple_id);
CREATE INDEX idx_ritual_memories_completion_date ON public.ritual_memories(completion_date DESC);
CREATE INDEX idx_ritual_suggestions_couple_id ON public.ritual_suggestions(couple_id);
CREATE INDEX idx_ritual_suggestions_shown_at ON public.ritual_suggestions(shown_at DESC);

-- Add realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.ritual_streaks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ritual_memories;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ritual_suggestions;