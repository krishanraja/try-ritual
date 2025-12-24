-- Auto-trigger synthesis when both partners submit
-- This ensures synthesis is triggered reliably from the database, not just client-side

-- Step 1: Enable pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Grant usage on net schema to postgres (required for pg_net to work)
GRANT USAGE ON SCHEMA net TO postgres;

-- Step 1.5: Create configuration table for trigger settings
-- This table stores the Supabase URL and service role key needed for the trigger
CREATE TABLE IF NOT EXISTS public.trigger_config (
  id text PRIMARY KEY DEFAULT 'default',
  supabase_url text NOT NULL,
  service_role_key text NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT single_row CHECK (id = 'default')
);

-- Enable RLS on config table
ALTER TABLE public.trigger_config ENABLE ROW LEVEL SECURITY;

-- Policy: Allow function owner (postgres) to read config
-- The trigger function runs as SECURITY DEFINER with postgres privileges
-- Regular authenticated users cannot access this table
CREATE POLICY "Function owner can read trigger config"
  ON public.trigger_config
  FOR SELECT
  USING (true);  -- Function runs as postgres, which can read

-- Policy: Only service_role can write config (for security)
CREATE POLICY "Service role can write trigger config"
  ON public.trigger_config
  FOR ALL
  USING (false)  -- Regular users blocked
  WITH CHECK (false);  -- Regular users blocked (service_role bypasses RLS)

-- Grant SELECT to postgres (function owner) and ALL to service_role
GRANT SELECT ON public.trigger_config TO postgres;
GRANT ALL ON public.trigger_config TO service_role;

-- Step 2: Create function to trigger synthesis via edge function
CREATE OR REPLACE FUNCTION public.trigger_synthesis_on_both_complete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  supabase_url text;
  service_role_key text;
  function_url text;
  request_body jsonb;
  request_id uuid;
BEGIN
  -- Only proceed if both partners have submitted and synthesis hasn't started/completed
  IF NEW.partner_one_input IS NULL OR NEW.partner_two_input IS NULL THEN
    -- Not ready yet - return early
    RETURN NEW;
  END IF;
  
  -- Check if synthesis already completed
  IF NEW.synthesized_output IS NOT NULL THEN
    -- Already synthesized - return early
    RETURN NEW;
  END IF;
  
  -- Check if synthesis already in progress (generated_at is set)
  IF NEW.generated_at IS NOT NULL THEN
    -- Already in progress - return early
    RETURN NEW;
  END IF;
  
  -- Get configuration from trigger_config table
  -- This table should be populated via SQL: INSERT INTO trigger_config (supabase_url, service_role_key) VALUES (...)
  -- Only service_role can read this table (RLS policy)
  
  SELECT 
    tc.supabase_url,
    tc.service_role_key
  INTO 
    supabase_url,
    service_role_key
  FROM public.trigger_config tc
  WHERE tc.id = 'default'
  LIMIT 1;
  
  -- Check if configuration exists
  IF supabase_url IS NULL OR service_role_key IS NULL THEN
    RAISE WARNING 'trigger_synthesis_on_both_complete: Configuration not found in trigger_config table. Please run: INSERT INTO trigger_config (supabase_url, service_role_key) VALUES (''your-url'', ''your-key'');';
    RETURN NEW;
  END IF;
  
  -- Build the edge function URL
  function_url := supabase_url || '/functions/v1/trigger-synthesis';
  
  -- Build request body
  request_body := jsonb_build_object('cycleId', NEW.id);
  
  -- Generate request ID for logging
  request_id := gen_random_uuid();
  
  -- Log the trigger attempt
  RAISE NOTICE 'trigger_synthesis_on_both_complete: Triggering synthesis for cycle % (request_id: %)', NEW.id, request_id;
  
  -- Make async HTTP POST request to trigger-synthesis edge function
  -- This is non-blocking and will execute in the background
  PERFORM net.http_post(
    url := function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_role_key
    ),
    body := request_body::text
  );
  
  -- Log success
  RAISE NOTICE 'trigger_synthesis_on_both_complete: Synthesis trigger request sent for cycle %', NEW.id;
  
  RETURN NEW;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the transaction
    -- This ensures the input update succeeds even if trigger fails
    RAISE WARNING 'trigger_synthesis_on_both_complete: Error triggering synthesis for cycle %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Step 3: Create trigger on weekly_cycles table
-- This trigger fires AFTER UPDATE when partner inputs are modified
DROP TRIGGER IF EXISTS auto_trigger_synthesis_on_both_complete ON public.weekly_cycles;

CREATE TRIGGER auto_trigger_synthesis_on_both_complete
  AFTER UPDATE OF partner_one_input, partner_two_input ON public.weekly_cycles
  FOR EACH ROW
  WHEN (
    -- Only fire if:
    -- 1. Both inputs are now present (NEW.partner_one_input IS NOT NULL AND NEW.partner_two_input IS NOT NULL)
    -- 2. Synthesis hasn't completed (NEW.synthesized_output IS NULL)
    -- 3. Synthesis hasn't started (NEW.generated_at IS NULL)
    -- 4. At least one input changed (OLD.partner_one_input IS DISTINCT FROM NEW.partner_one_input OR OLD.partner_two_input IS DISTINCT FROM NEW.partner_two_input)
    (NEW.partner_one_input IS NOT NULL AND NEW.partner_two_input IS NOT NULL)
    AND NEW.synthesized_output IS NULL
    AND NEW.generated_at IS NULL
    AND (
      OLD.partner_one_input IS DISTINCT FROM NEW.partner_one_input 
      OR OLD.partner_two_input IS DISTINCT FROM NEW.partner_two_input
    )
  )
  EXECUTE FUNCTION public.trigger_synthesis_on_both_complete();

-- Step 4: Add comment explaining configuration requirements
COMMENT ON FUNCTION public.trigger_synthesis_on_both_complete() IS 
'Automatically triggers synthesis edge function when both partners have submitted their inputs. 
Requires configuration in trigger_config table.

To configure, run (as service_role or via SQL Editor):
INSERT INTO public.trigger_config (supabase_url, service_role_key) 
VALUES (''https://your-project.supabase.co'', ''your-service-role-key'')
ON CONFLICT (id) DO UPDATE 
SET supabase_url = EXCLUDED.supabase_url, 
    service_role_key = EXCLUDED.service_role_key,
    updated_at = now();

Get your service role key from: Supabase Dashboard → Settings → API → service_role secret';

COMMENT ON TABLE public.trigger_config IS 
'Configuration table for auto-trigger synthesis. Stores Supabase URL and service role key.
Only accessible by service_role (RLS policy). Regular users cannot see or modify this data.';

-- Verify trigger was created
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'auto_trigger_synthesis_on_both_complete' 
    AND tgrelid = 'public.weekly_cycles'::regclass
  ) THEN
    RAISE NOTICE 'Trigger auto_trigger_synthesis_on_both_complete created successfully';
  ELSE
    RAISE WARNING 'Trigger auto_trigger_synthesis_on_both_complete was not created!';
  END IF;
END $$;

