-- Add unique constraint to couple_code to prevent duplicate codes
ALTER TABLE public.couples ADD CONSTRAINT couples_couple_code_unique UNIQUE (couple_code);

-- Add index for faster lookups by couple_code
CREATE INDEX IF NOT EXISTS idx_couples_couple_code ON public.couples(couple_code);