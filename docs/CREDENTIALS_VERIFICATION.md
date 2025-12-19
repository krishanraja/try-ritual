# Credentials Verification Guide

This document helps verify that all Supabase credentials and Vercel environment variables are correctly configured.

## Vercel Environment Variables

### Required Variables

Set these in **Vercel Dashboard → Settings → Environment Variables**:

1. **`VITE_SUPABASE_URL`**
   - **Expected Value:** `https://ffowyysujkzwxisjckxh.supabase.co`
   - **Verification:** Should match your Supabase project URL exactly

2. **`VITE_SUPABASE_PUBLISHABLE_KEY`**
   - **Expected Value:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmb3d5eXN1amt6d3hpc2pja3hoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU3NTYzMjgsImV4cCI6MjA4MTMzMjMyOH0.oeA8atUZjEuH0aG_zJEHl1RpRS0yiNCWsuxCtahgVIk`
   - **Verification:** 
     - Should be a JWT token (3 parts separated by dots)
     - Decodes to project ID: `ffowyysujkzwxisjckxh`
     - Role should be `anon` (not `service_role`)

3. **`VITE_SUPABASE_PROJECT_ID`**
   - **Expected Value:** `ffowyysujkzwxisjckxh`
   - **Verification:** Should match the project ID in your Supabase URL

### How to Verify

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Check each variable matches the expected values above
3. Ensure variables are set for Production, Preview, and Development environments
4. After any changes, redeploy your application

### Verification Script

You can also verify in the browser console after deployment:
- Open your deployed app
- Check console for: `[Supabase Client] ✅ Configuration loaded successfully`
- No errors about missing or invalid environment variables

## Supabase Edge Function Secrets

### Required Secrets

Set these in **Supabase Dashboard → Project Settings → Edge Functions → Secrets**:

1. **`SERVICE_ROLE_KEY`** ⚠️ CRITICAL
   - **Expected Value:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmb3d5eXN1amt6d3hpc2pja3hoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTc1NjMyOCwiZXhwIjoyMDgxMzMyMzI4fQ.8-cmdOYjSMq8R8dSdiqyivyp3AI2Vd2X84aZ2GIss9g`
   - **⚠️ IMPORTANT:** Must be named exactly `SERVICE_ROLE_KEY` (NOT `SUPABASE_SERVICE_ROLE_KEY`)
   - **Verification:** 
     - Should be a JWT token
     - Decodes to project ID: `ffowyysujkzwxisjckxh`
     - Role should be `service_role`

2. **`GOOGLE_AI_API_KEY`**
   - **Required for:** synthesize-rituals, parse-bucket-list
   - **Verification:** Should be a valid Google AI API key

3. **`STRIPE_SECRET_KEY`**
   - **Required for:** create-checkout, check-subscription, customer-portal, stripe-webhook
   - **Verification:** Should start with `sk_`

4. **`STRIPE_WEBHOOK_SECRET`**
   - **Required for:** stripe-webhook
   - **Verification:** Should start with `whsec_`

5. **`RESEND_API_KEY`**
   - **Required for:** send-contact-email
   - **Verification:** Should be a valid Resend API key

### Auto-Provided Secrets (No Action Needed)

These are automatically provided by Supabase but can be explicitly set:
- `SUPABASE_URL` - Auto-injected
- `SUPABASE_ANON_KEY` - Auto-injected

### Secrets to Remove

These secrets are not used and should be removed to avoid confusion:

1. **`SUPABASE_SERVICE_ROLE_KEY`** - Redundant (code uses `SERVICE_ROLE_KEY`)
2. **`SUPABASE_DB_URL`** - Not used by any edge functions
3. **`OPENAI_API_KEY`** - Not used (project uses Google Gemini)

### Optional Secrets (For Future Push Notifications)

These are not needed yet but will be required when push notifications are implemented:
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `INTERNAL_FUNCTION_SECRET`

## Verification Checklist

### Vercel
- [ ] `VITE_SUPABASE_URL` = `https://ffowyysujkzwxisjckxh.supabase.co`
- [ ] `VITE_SUPABASE_PUBLISHABLE_KEY` matches provided anon key
- [ ] `VITE_SUPABASE_PROJECT_ID` = `ffowyysujkzwxisjckxh`
- [ ] All variables set for Production, Preview, and Development
- [ ] Application redeployed after setting variables

### Supabase Secrets
- [ ] `SERVICE_ROLE_KEY` is set (NOT `SUPABASE_SERVICE_ROLE_KEY`)
- [ ] `SERVICE_ROLE_KEY` value matches provided service role key
- [ ] `GOOGLE_AI_API_KEY` is set
- [ ] `STRIPE_SECRET_KEY` is set
- [ ] `STRIPE_WEBHOOK_SECRET` is set
- [ ] `RESEND_API_KEY` is set
- [ ] `SUPABASE_SERVICE_ROLE_KEY` removed (if exists)
- [ ] `SUPABASE_DB_URL` removed (if exists)
- [ ] `OPENAI_API_KEY` removed (if exists)

### Functionality Tests
- [ ] User can sign up and sign in
- [ ] User can create/join a couple
- [ ] Ritual synthesis works (tests AI integration)
- [ ] Photo upload works (tests storage)
- [ ] Stripe checkout works (tests payment integration)
- [ ] Contact form works (tests email integration)
- [ ] Realtime subscriptions work (partner updates appear in real-time)

## Troubleshooting

### "Configuration validation failed" Error

**Cause:** Environment variables not set or incorrect in Vercel.

**Solution:**
1. Check Vercel Dashboard → Settings → Environment Variables
2. Verify all three `VITE_*` variables are set
3. Ensure values match exactly (no extra spaces)
4. Redeploy application after changes

### "SERVICE_ROLE_KEY not configured" Error

**Cause:** Service role key missing or incorrectly named in Supabase.

**Solution:**
1. Go to Supabase Dashboard → Project Settings → Edge Functions → Secrets
2. Verify secret is named exactly `SERVICE_ROLE_KEY` (case-sensitive)
3. Ensure value matches the provided service role key
4. Check edge function logs for specific errors

### Edge Functions Not Working

**Check:**
1. All required secrets are set in Supabase Dashboard
2. Secret names match exactly (case-sensitive)
3. Edge functions are deployed
4. Check edge function logs for specific error messages

### Realtime Not Working

**Check:**
1. Realtime is enabled in Supabase Dashboard → Database → Replication
2. Tables are added to realtime publication
3. Browser console shows subscription status
4. Network tab shows WebSocket connection


