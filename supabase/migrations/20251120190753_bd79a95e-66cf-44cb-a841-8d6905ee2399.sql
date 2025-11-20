-- Add preferred_city to profiles table
ALTER TABLE public.profiles 
ADD COLUMN preferred_city TEXT DEFAULT 'New York' 
CHECK (preferred_city IN ('London', 'Sydney', 'Melbourne', 'New York'));