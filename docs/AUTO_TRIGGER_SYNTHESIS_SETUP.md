# Auto-Trigger Synthesis Configuration Guide

## Overview

The database trigger `auto_trigger_synthesis_on_both_complete` automatically calls the `trigger-synthesis` edge function when both partners have submitted their weekly inputs. This eliminates the need for client-side calls that can fail silently.

## Prerequisites

1. **pg_net Extension**: Enabled automatically by the migration
2. **Database Settings**: Must be configured with Supabase URL and service role key

## Configuration Steps

### Step 1: Get Your Supabase Project URL

1. Go to Supabase Dashboard → Your Project
2. Copy your project URL (e.g., `https://abcdefghijklmnop.supabase.co`)

### Step 2: Get Your Service Role Key

1. Go to Supabase Dashboard → Settings → API
2. Find the **`service_role` `secret`** key
3. Click the eye icon to reveal it
4. **⚠️ SECURITY WARNING**: This key bypasses all RLS policies. Never expose it in client code.

### Step 3: Configure Trigger Settings

Run this SQL command in Supabase Dashboard → SQL Editor:

```sql
-- Insert configuration (replace with your actual values)
INSERT INTO public.trigger_config (supabase_url, service_role_key) 
VALUES (
  'https://your-project-id.supabase.co',  -- Replace with your project URL
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'  -- Replace with your service role key
)
ON CONFLICT (id) DO UPDATE 
SET 
  supabase_url = EXCLUDED.supabase_url, 
  service_role_key = EXCLUDED.service_role_key,
  updated_at = now();
```

**Note:** 
- Replace `your-project-id` with your actual Supabase project ID
- Replace the service role key with your actual key from Step 2
- The `ON CONFLICT` clause allows you to update the config if it already exists

### Step 4: Verify Configuration

Run this query to verify the settings are configured:

```sql
SELECT 
  supabase_url,
  CASE 
    WHEN service_role_key IS NOT NULL 
    THEN 'SET (hidden)' 
    ELSE 'NOT SET' 
  END as service_role_key_status,
  updated_at
FROM public.trigger_config
WHERE id = 'default';
```

You should see:
- `supabase_url`: Your project URL
- `service_role_key_status`: "SET (hidden)"
- `updated_at`: Timestamp of when it was configured

## How It Works

1. **Trigger Fires**: When a partner submits their input, the `weekly_cycles` table is updated
2. **Condition Check**: The trigger checks if:
   - Both `partner_one_input` and `partner_two_input` are NOT NULL
   - `synthesized_output` IS NULL (not already completed)
   - `generated_at` IS NULL (not already in progress)
3. **HTTP Call**: If conditions are met, the trigger makes an async HTTP POST request to:
   - URL: `{SUPABASE_URL}/functions/v1/trigger-synthesis`
   - Method: POST
   - Headers: `Authorization: Bearer {SERVICE_ROLE_KEY}`
   - Body: `{"cycleId": "<cycle-id>"}`
4. **Non-Blocking**: The HTTP call is async and non-blocking, so it doesn't slow down the input submission

## Testing

### Test 1: Verify Trigger Exists

```sql
SELECT 
  tgname as trigger_name,
  tgrelid::regclass as table_name,
  tgenabled as enabled
FROM pg_trigger
WHERE tgname = 'auto_trigger_synthesis_on_both_complete';
```

Should return one row with `enabled = 'O'` (enabled).

### Test 2: Manual Trigger Test

1. Create a test cycle with both partners' inputs:
```sql
UPDATE weekly_cycles
SET 
  partner_one_input = '{"test": true}',
  partner_two_input = '{"test": true}',
  synthesized_output = NULL,
  generated_at = NULL
WHERE id = '<some-cycle-id>';
```

2. Check Supabase Dashboard → Edge Functions → trigger-synthesis → Logs
3. You should see a log entry showing the function was invoked

### Test 3: Verify No Duplicate Triggers

The trigger is idempotent - it won't fire multiple times because:
- It checks `generated_at IS NULL` before triggering
- The `trigger-synthesis` function uses atomic locking

## Troubleshooting

### Issue: Trigger Not Firing

**Symptoms:**
- Both partners submit, but synthesis never starts
- No logs in `trigger-synthesis` edge function

**Diagnosis:**
1. Check if trigger exists:
```sql
SELECT * FROM pg_trigger WHERE tgname = 'auto_trigger_synthesis_on_both_complete';
```

2. Check database settings:
```sql
SELECT 
  current_setting('app.settings.supabase_url', true) as url,
  current_setting('app.settings.service_role_key', true) as key;
```

3. Check trigger logs in PostgreSQL:
```sql
-- Enable logging to see trigger warnings
SET log_min_messages = 'WARNING';
```

**Solutions:**
- Ensure database settings are configured (Step 3 above)
- Verify pg_net extension is enabled: `SELECT * FROM pg_extension WHERE extname = 'pg_net';`
- Check PostgreSQL logs for warnings from the trigger function

### Issue: pg_net Worker Not Running

**Symptoms:**
- Trigger fires but HTTP request never completes
- No logs in edge function

**Diagnosis:**
```sql
SELECT pid FROM pg_stat_activity WHERE backend_type ILIKE '%pg_net%';
```

If this returns nothing, the worker is not running.

**Solution:**
```sql
SELECT net.worker_restart();
```

### Issue: Permission Denied

**Symptoms:**
- Error: "permission denied for schema net"

**Solution:**
```sql
GRANT USAGE ON SCHEMA net TO postgres;
```

## Security Considerations

1. **Service Role Key**: 
   - Never commit this key to version control
   - Store it securely in database settings or Supabase Vault
   - Consider using Supabase Vault for production (more secure than database settings)

2. **Trigger Function**:
   - Uses `SECURITY DEFINER` to access database settings
   - Only fires when specific conditions are met (prevents abuse)
   - Errors are logged but don't fail the transaction

3. **HTTP Calls**:
   - Made to internal Supabase edge function (not external)
   - Uses service role key for authentication
   - Async and non-blocking (doesn't expose timing information)

## Alternative: Using Supabase Vault

For more secure key storage in production, consider using Supabase Vault:

1. Go to Supabase Dashboard → Vault
2. Store the service role key as a secret
3. Update the trigger function to retrieve from Vault instead of database settings

(Implementation details for Vault integration would go here if needed)

## Monitoring

### Check Trigger Activity

```sql
-- View recent trigger activity (if you add logging)
SELECT * FROM pg_stat_user_functions 
WHERE funcname = 'trigger_synthesis_on_both_complete';
```

### Monitor Edge Function Logs

1. Go to Supabase Dashboard → Edge Functions → trigger-synthesis
2. Click "Logs" tab
3. Look for entries with your cycle IDs

## Rollback

If you need to disable the trigger:

```sql
-- Disable trigger (keeps it but doesn't fire)
ALTER TABLE weekly_cycles DISABLE TRIGGER auto_trigger_synthesis_on_both_complete;

-- Or drop it completely
DROP TRIGGER IF EXISTS auto_trigger_synthesis_on_both_complete ON public.weekly_cycles;
```

To re-enable:
```sql
ALTER TABLE weekly_cycles ENABLE TRIGGER auto_trigger_synthesis_on_both_complete;
```

