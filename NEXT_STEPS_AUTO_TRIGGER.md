# Next Steps: Configure Auto-Trigger Synthesis

**Follow these steps EXACTLY in order. Each step is required.**

---

## Step 1: Open Supabase Dashboard

1. Go to https://supabase.com
2. Sign in to your account
3. Click on your project (the one you're using for this app)

---

## Step 2: Get Your Project URL

1. Look at the **top of the page** in your Supabase dashboard
2. You'll see your project URL - it looks like: `https://abcdefghijklmnop.supabase.co`
3. **Copy this entire URL** (including `https://`)
4. **Write it down** - you'll need it in Step 4

**Example:** If you see `https://xyzabc123.supabase.co`, that's your project URL.

---

## Step 3: Get Your Service Role Key

1. In the Supabase dashboard, look at the **left sidebar**
2. Click **Settings** (gear icon at the bottom)
3. Click **API** (under "Project Settings")
4. Scroll down to the section called **"Project API keys"**
5. Find the key labeled **`service_role` `secret`** (NOT the `anon` `public` key!)
6. Click the **eye icon** 👁️ next to it to reveal the key
7. Click the **copy button** 📋 to copy the entire key
8. **⚠️ SECURITY:** This key is secret - don't share it or commit it to code
9. **Write it down** - you'll need it in Step 4

**What it looks like:**
- It's a very long string starting with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- It's usually 200-300 characters long
- Make sure you copied the **entire** key

---

## Step 4: Run the SQL Configuration Commands

1. In the Supabase dashboard, look at the **left sidebar**
2. Click **SQL Editor** (icon looks like a database/terminal)
3. Click **"New query"** button (top right, or you'll see a blank editor)
4. **Copy and paste** the following SQL command into the editor:

```sql
-- Insert configuration (replace with YOUR actual values)
INSERT INTO public.trigger_config (supabase_url, service_role_key) 
VALUES (
  'https://your-project-id.supabase.co',  -- Replace with your URL from Step 2
  'your-service-role-key-here'            -- Replace with your key from Step 3
)
ON CONFLICT (id) DO UPDATE 
SET 
  supabase_url = EXCLUDED.supabase_url, 
  service_role_key = EXCLUDED.service_role_key,
  updated_at = now();
```

5. **Replace the placeholders:**
   - Replace `'https://your-project-id.supabase.co'` with your actual URL from Step 2
   - Replace `'your-service-role-key-here'` with your actual service role key from Step 3

**Example (with fake values):**
```sql
INSERT INTO public.trigger_config (supabase_url, service_role_key) 
VALUES (
  'https://xyzabc123.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5emFiYzEyMyIsInJvbGUiOiJzZXJ2aWNlX3JvbGUiLCJpYXQiOjE2NDUxMjM0NTYsImV4cCI6MTk2MDcwOTQ1Nn0.example'
)
ON CONFLICT (id) DO UPDATE 
SET 
  supabase_url = EXCLUDED.supabase_url, 
  service_role_key = EXCLUDED.service_role_key,
  updated_at = now();
```

6. Click the **"Run"** button (or press `Ctrl+Enter` / `Cmd+Enter`)
7. You should see a success message: "Success. No rows returned" or "INSERT 0 1"

---

## Step 5: Verify Configuration

1. Still in the **SQL Editor**, click **"New query"** again
2. **Copy and paste** this verification query:

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

3. Click **"Run"**
4. **Check the results:**
   - `supabase_url` should show your project URL
   - `service_role_key_status` should show `"SET (hidden)"`
   - `updated_at` should show the current timestamp

**✅ If you see both values correctly, you're done!**

**❌ If you see `"NOT SET"` or `NULL`, or get an error:**
   - Go back to Step 4 and make sure you:
     - Copied the entire service role key (it's very long)
     - Didn't accidentally include extra spaces or quotes
     - The INSERT command ran successfully
   - If you get a permission error, make sure you're running this in the SQL Editor (which uses service_role privileges)

---

## Step 6: Test the Trigger (Optional but Recommended)

1. Still in the **SQL Editor**, run this to verify the trigger exists:

```sql
SELECT 
  tgname as trigger_name,
  tgrelid::regclass as table_name,
  tgenabled as enabled
FROM pg_trigger
WHERE tgname = 'auto_trigger_synthesis_on_both_complete';
```

2. You should see one row with:
   - `trigger_name`: `auto_trigger_synthesis_on_both_complete`
   - `table_name`: `weekly_cycles`
   - `enabled`: `O` (means enabled)

---

## What Happens Next?

Once configured, the trigger will automatically work:

1. **When Partner 1 submits:** Nothing happens (waiting for Partner 2)
2. **When Partner 2 submits:** 
   - The trigger detects both inputs are present
   - It automatically calls the `trigger-synthesis` edge function
   - Synthesis starts in the background
   - You'll see logs in: **Edge Functions → trigger-synthesis → Logs**

---

## Troubleshooting

### Problem: "permission denied" error when inserting into trigger_config

**Solution:** 
- Make sure you're running the SQL in the Supabase Dashboard SQL Editor (which uses service_role privileges)
- If you're using a different SQL client, you may need to use the service_role key for authentication
- The table has RLS enabled, but SQL Editor runs with service_role which bypasses RLS

### Problem: Service role key shows "NOT SET" after configuration

**Possible causes:**
1. The key was truncated when copying - make sure you copied the entire key
2. Extra spaces or quotes were included - check your SQL command
3. The INSERT didn't run successfully - check for error messages

**Solution:** 
- Go back to Step 3 and copy the key again (make sure to get the entire key)
- Go back to Step 4 and run the INSERT command again
- Make sure the INSERT command shows "Success" or "INSERT 0 1" when you run it

### Problem: Trigger doesn't fire when both partners submit

**Check:**
1. Verify configuration (Step 5)
2. Check if pg_net extension is enabled:
   ```sql
   SELECT * FROM pg_extension WHERE extname = 'pg_net';
   ```
   Should return one row.

3. Check PostgreSQL logs for warnings:
   - Go to **Database → Logs** in Supabase dashboard
   - Look for warnings from `trigger_synthesis_on_both_complete`

### Problem: Edge function still not being called

**Check:**
1. Go to **Edge Functions → trigger-synthesis → Logs**
2. Look for any error messages
3. Verify the service role key is correct (it should start with `eyJ...`)

---

## Quick Reference

**Where to find things:**
- **Project URL:** Top of Supabase dashboard
- **Service Role Key:** Settings → API → `service_role` `secret`
- **SQL Editor:** Left sidebar → SQL Editor
- **Edge Function Logs:** Edge Functions → trigger-synthesis → Logs

**Commands to remember:**
```sql
-- Configure (run once)
INSERT INTO public.trigger_config (supabase_url, service_role_key) 
VALUES ('YOUR_URL', 'YOUR_KEY')
ON CONFLICT (id) DO UPDATE 
SET supabase_url = EXCLUDED.supabase_url, 
    service_role_key = EXCLUDED.service_role_key,
    updated_at = now();

-- Verify (check anytime)
SELECT 
  supabase_url,
  CASE 
    WHEN service_role_key IS NOT NULL 
    THEN 'SET (hidden)' 
    ELSE 'NOT SET' 
  END as key_status,
  updated_at
FROM public.trigger_config
WHERE id = 'default';
```

---

## Done! 🎉

Once you've completed Steps 1-5 and verified the configuration, the auto-trigger is ready to use. The next time both partners submit their inputs, synthesis will start automatically without any client-side code needing to call it.

