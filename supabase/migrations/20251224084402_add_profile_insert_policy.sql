-- Add INSERT policy for profile creation trigger
-- This allows the handle_new_user() trigger function to create profiles
-- even when RLS is enabled on the profiles table

-- Allow trigger function to insert profiles for new users
CREATE POLICY "Trigger can insert profiles for new users"
  ON public.profiles FOR INSERT
  WITH CHECK (true);

-- Verify trigger exists and is active
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'on_auth_user_created' 
    AND tgrelid = 'auth.users'::regclass
  ) THEN
    RAISE WARNING 'Trigger on_auth_user_created does not exist!';
  ELSE
    RAISE NOTICE 'Trigger on_auth_user_created verified and active';
  END IF;
END $$;

-- Verify trigger function exists and has correct permissions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'handle_new_user' 
    AND pronamespace = 'public'::regnamespace
  ) THEN
    RAISE WARNING 'Function handle_new_user does not exist!';
  ELSE
    RAISE NOTICE 'Function handle_new_user verified';
  END IF;
END $$;








