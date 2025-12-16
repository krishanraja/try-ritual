# Deployment Environment Variables Checklist

**Project:** Ritual  
**Project ID:** `ffowyysujkzwxisjckxh`  
**URL:** `https://ffowyysujkzwxisjckxh.supabase.co`

---

## ✅ Local Development (.env file)

**Status:** ✅ **FIXED**

Your local `.env` file has been updated with the correct values:

```
VITE_SUPABASE_URL=https://ffowyysujkzwxisjckxh.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmb3d5eXN1amt6d3hpc2pja3hoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU3NTYzMjgsImV4cCI6MjA4MTMzMjMyOH0.oeA8atUZjEuH0aG_zJEHl1RpRS0yiNCWsuxCtahgVIk
VITE_SUPABASE_PROJECT_ID=ffowyysujkzwxisjckxh
```

**Next Step:** Restart your dev server (`npm run dev`)

---

## 🌐 Vercel Deployment

If you're deploying to Vercel, you need to set these environment variables in your Vercel dashboard:

### Required Variables

1. **VITE_SUPABASE_URL**
   - **Value:** `https://ffowyysujkzwxisjckxh.supabase.co`
   - **Environments:** Production, Preview, Development (check all)

2. **VITE_SUPABASE_PUBLISHABLE_KEY**
   - **Value:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmb3d5eXN1amt6d3hpc2pja3hoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU3NTYzMjgsImV4cCI6MjA4MTMzMjMyOH0.oeA8atUZjEuH0aG_zJEHl1RpRS0yiNCWsuxCtahgVIk`
   - **Environments:** Production, Preview, Development (check all)

3. **VITE_SUPABASE_PROJECT_ID**
   - **Value:** `ffowyysujkzwxisjckxh`
   - **Environments:** Production, Preview, Development (check all)

### How to Set in Vercel

1. Go to https://vercel.com
2. Select your **Ritual** project
3. Go to **Settings** → **Environment Variables**
4. Add each variable above
5. **Redeploy** your application after adding variables

---

## ☁️ Lovable Cloud Deployment

If you're using Lovable Cloud, set these in your project settings:

1. Go to your Lovable project dashboard
2. Navigate to **Project Settings** → **Environment Variables**
3. Add the same three variables as above
4. Redeploy after updating

---

## 🔧 Supabase Edge Functions

Edge functions automatically receive `SUPABASE_URL` and `SUPABASE_ANON_KEY`, but you may need to set:

### Required Secret

**SERVICE_ROLE_KEY**
- **Where to set:** Supabase Dashboard → Project Settings → Edge Functions → Secrets
- **⚠️ IMPORTANT:** Must be named exactly `SERVICE_ROLE_KEY` (NOT `SUPABASE_SERVICE_ROLE_KEY`)
- **How to get:** Supabase Dashboard → Settings → API → `service_role` `secret` key
- **⚠️ SECURITY:** This is a secret key - never expose in client code

### Functions That Need SERVICE_ROLE_KEY

- `delete-account`
- `stripe-webhook`
- `send-push`
- `deliver-surprise-ritual`
- `check-subscription`
- `customer-portal`
- `cleanup-orphaned-cycles`

---

## ✅ Verification Steps

### 1. Local Development
- [ ] Restart dev server
- [ ] Check browser console for `[Supabase Client] ✅ Configuration loaded successfully`
- [ ] Test authentication (sign in/sign up)
- [ ] Verify app loads without errors

### 2. Vercel/Lovable Cloud
- [ ] All three environment variables are set
- [ ] Variables are set for all environments (Production, Preview, Development)
- [ ] App has been redeployed after setting variables
- [ ] Production app loads without errors
- [ ] Authentication works in production

### 3. Supabase Edge Functions
- [ ] `SERVICE_ROLE_KEY` is set in Supabase Secrets
- [ ] Edge functions can access database (if they need to)
- [ ] Test any edge functions that require service role access

---

## 🔍 How to Verify Connection

### Browser Console Check

When the app loads, you should see in the browser console:

```
🚀 App Initialization
[INIT] Environment Variables Check:
  VITE_SUPABASE_URL: https://ffowyysujkzwxisjckxh.supabase.co... (47 chars) ✅
  VITE_SUPABASE_PUBLISHABLE_KEY: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (200+ chars, JWT: ✅) ✅
  VITE_SUPABASE_PROJECT_ID: ffowyysujkzwxisjckxh (20 chars) ✅

[Supabase Client] ✅ Configuration loaded successfully
[Supabase Client] ✅ Client created successfully
[Supabase Client] ✅ Client connection test passed
```

### If You See Errors

- **"Missing or invalid VITE_SUPABASE_URL"** → Check environment variable is set
- **"Invalid Supabase URL format"** → Verify URL starts with `https://` and ends with `.supabase.co`
- **"Invalid JWT format"** → Verify you're using the anon/public key, not service_role key
- **"Connection timeout"** → Check network connection and Supabase project status

---

## 📝 Summary

| Location | Status | Action Required |
|----------|--------|-----------------|
| Local `.env` | ✅ Fixed | Restart dev server |
| Vercel | ⚠️ Check | Set variables if deploying to Vercel |
| Lovable Cloud | ⚠️ Check | Set variables if using Lovable |
| Supabase Secrets | ⚠️ Check | Set `SERVICE_ROLE_KEY` for edge functions |

---

## 🚀 Next Steps

1. **Restart your local dev server** to test the fix
2. **Verify the app loads** and authentication works locally
3. **Update deployment environment variables** if you're deploying
4. **Redeploy** your application after updating environment variables
5. **Test in production** to ensure everything works

---

## 📞 Need Help?

If you encounter issues:
1. Check browser console for specific error messages
2. Verify environment variables match exactly (no extra spaces)
3. Ensure you're using the anon/public key (not service_role)
4. Check Supabase Dashboard to confirm project is active
5. Review `SUPABASE_CONNECTION_VERIFICATION.md` for detailed diagnostics


