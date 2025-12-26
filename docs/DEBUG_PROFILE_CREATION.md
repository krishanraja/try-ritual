# Debug Profile Creation on Signup

This document provides SQL queries and troubleshooting steps for debugging profile creation failures during user signup.

## Problem

Users see the error "Unable to create profile. Please try again" after successful signup. The signup succeeds but the profile creation trigger fails silently.

## Root Cause

The `profiles` table has Row Level Security (RLS) enabled, but there was no INSERT policy allowing the `handle_new_user()` trigger function to create profiles. Even though the trigger function uses `SECURITY DEFINER`, PostgreSQL still checks RLS policies for INSERT operations.

## Diagnostic SQL Queries

Run these queries in the Supabase SQL Editor to diagnose the issue:

### 1. Check if Trigger Exists

```sql
SELECT 
  tgname as trigger_name,
  tgrelid::regclass as table_name,
  tgenabled as enabled,
  tgisinternal as is_internal
FROM pg_trigger 
WHERE tgname = 'on_auth_user_created' 
  OR tgname LIKE '%profile%';
```

Expected result: Should show `on_auth_user_created` trigger on `auth.users` table.

### 2. Check Trigger Function

```sql
SELECT 
  proname as function_name,
  prosecdef as security_definer,
  proconfig as config,
  prosrc as source_code
FROM pg_proc 
WHERE proname = 'handle_new_user';
```

Expected result: Should show the function with `security_definer = true`.

### 3. Check RLS Policies on Profiles Table

```sql
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd as command,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY cmd, policyname;
```

Expected result: Should show policies for SELECT, UPDATE, and **INSERT** operations.

### 4. Check if RLS is Enabled

```sql
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename = 'profiles';
```

Expected result: `rls_enabled = true` (RLS should be enabled).

### 5. Verify INSERT Policy Exists

```sql
SELECT 
  policyname,
  cmd,
  permissive,
  roles
FROM pg_policies
WHERE tablename = 'profiles'
  AND cmd = 'INSERT';
```

Expected result: Should show at least one INSERT policy (e.g., "Trigger can insert profiles for new users").

### 6. Check Recent Profile Creation Attempts

```sql
-- Check for profiles created in the last hour
SELECT 
  id,
  name,
  email,
  created_at
FROM public.profiles
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC
LIMIT 10;
```

### 7. Check for Users Without Profiles

```sql
-- Find users in auth.users who don't have profiles
SELECT 
  au.id,
  au.email,
  au.created_at as user_created_at,
  au.raw_user_meta_data->>'name' as name_from_metadata
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL
ORDER BY au.created_at DESC
LIMIT 10;
```

## Checking Supabase Logs

### Postgres Logs

1. Go to Supabase Dashboard
2. Navigate to **Logs** > **Postgres Logs**
3. Filter for errors containing:
   - `profile`
   - `handle_new_user`
   - `on_auth_user_created`
   - `RLS policy violation`
   - `permission denied`

### Common Error Patterns

Look for these error messages in the logs:

- `new row violates row-level security policy` - RLS policy blocking INSERT
- `permission denied for table profiles` - Missing INSERT policy
- `function handle_new_user() does not exist` - Trigger function missing
- `trigger on_auth_user_created does not exist` - Trigger missing

## Testing the Trigger Manually

⚠️ **Warning**: Only run this in a development/test environment, not in production.

### Test Trigger Function Directly

```sql
-- This simulates what the trigger does
-- Replace 'USER_ID_HERE' with an actual user ID from auth.users
DO $$
DECLARE
  test_user_id uuid;
  test_name text := 'Test User';
  test_email text := 'test@example.com';
BEGIN
  -- Get a test user (or create one for testing)
  SELECT id INTO test_user_id 
  FROM auth.users 
  LIMIT 1;
  
  -- Try to insert profile (what trigger does)
  INSERT INTO public.profiles (id, name, email)
  VALUES (test_user_id, test_name, test_email)
  ON CONFLICT (id) DO NOTHING;
  
  RAISE NOTICE 'Profile insert test completed for user: %', test_user_id;
END $$;
```

## Fixing the Issue

### Solution 1: Add INSERT Policy (Recommended)

Run this migration to add the INSERT policy:

```sql
-- Allow trigger function to insert profiles for new users
CREATE POLICY "Trigger can insert profiles for new users"
  ON public.profiles FOR INSERT
  WITH CHECK (true);
```

This policy allows the trigger function to insert profiles. The `WITH CHECK (true)` is safe because:
- The trigger only runs during user creation
- The trigger function uses `SECURITY DEFINER` and validates the data
- The profile ID must match the user ID (enforced by foreign key)

### Solution 2: Verify Trigger is Active

```sql
-- Recreate trigger if missing
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### Solution 3: Verify Trigger Function

```sql
-- Recreate trigger function with proper permissions
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
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
    RAISE WARNING 'Failed to create profile for user %: %', new.id, SQLERRM;
    RETURN new;
END;
$$;
```

## Manual Profile Creation (Fallback)

If the trigger fails, you can manually create profiles for affected users:

```sql
-- Create profiles for users missing them
INSERT INTO public.profiles (id, name, email)
SELECT 
  au.id,
  COALESCE(au.raw_user_meta_data->>'name', 'User'),
  au.email
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;
```

## Browser Console Debugging

When testing signup, check the browser console for these log messages:

- `[AUTH] Attempting sign up for: <email>` - Signup started
- `[AUTH] Sign up successful, user: <user-id>` - Signup succeeded
- `[AUTH] Sign up response details: {...}` - Detailed signup response
- `[AUTH] Profile verified: {...}` - Profile exists ✅
- `[AUTH] Profile creation failed: {...}` - Profile missing ❌
- `[AUTH] Manual profile creation also failed: {...}` - Fallback failed ❌
- `[AUTH] Profile created manually as fallback` - Fallback succeeded ✅

## Prevention

To prevent this issue in the future:

1. **Always include INSERT policies** when enabling RLS on tables that triggers modify
2. **Test signup flow** after any database schema changes
3. **Monitor logs** for RLS policy violations
4. **Use the fallback mechanism** in Auth.tsx to handle edge cases

## Related Files

- Migration: `supabase/migrations/20251224084402_add_profile_insert_policy.sql`
- Auth Component: `src/pages/Auth.tsx` (lines 234-275)
- Trigger Function: `supabase/migrations/20251223113943_ensure_profile_trigger.sql`
- Profile Utils: `src/utils/profileUtils.ts`

## Additional Resources

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL SECURITY DEFINER Functions](https://www.postgresql.org/docs/current/sql-createfunction.html#SQL-CREATEFUNCTION-SECURITY)
- [PostgreSQL Triggers](https://www.postgresql.org/docs/current/triggers.html)








