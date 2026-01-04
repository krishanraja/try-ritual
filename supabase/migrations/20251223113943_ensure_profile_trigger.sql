-- Ensure profile creation trigger exists and works
-- This migration verifies and recreates the trigger if missing, and makes it more robust

-- Update the trigger function to be idempotent and handle errors gracefully
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Use INSERT ... ON CONFLICT to make it idempotent
  -- This prevents errors if profile already exists (race condition)
  INSERT INTO public.profiles (id, name, email)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'name', 'User'),
    new.email
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN new;
EXCEPTION
  WHEN others THEN
    -- Log error but don't fail the transaction
    -- This ensures user creation succeeds even if profile creation fails
    RAISE WARNING 'Failed to create profile for user %: %', new.id, SQLERRM;
    RETURN new;
END;
$$;

-- Recreate trigger if missing
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Verify trigger exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'on_auth_user_created' 
    AND tgrelid = 'auth.users'::regclass
  ) THEN
    RAISE NOTICE 'Trigger on_auth_user_created verified and active';
  ELSE
    RAISE WARNING 'Trigger on_auth_user_created was not created!';
  END IF;
END $$;



















