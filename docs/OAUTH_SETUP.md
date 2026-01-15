# Google OAuth Configuration Guide

This document explains how to configure Google OAuth for Ritual to work correctly in both development and production environments.

## Overview

Ritual uses Supabase Auth with Google OAuth as a sign-in provider. The OAuth flow requires proper configuration in both Google Cloud Console and Supabase Dashboard.

## Current Configuration

- **Production Domain**: https://tryritual.co
- **Supabase Project ID**: ffowyysujkzwxisjckxh
- **Supabase URL**: https://ffowyysujkzwxisjckxh.supabase.co

## Configuration Steps

### 1. Google Cloud Console Setup

1. **Access Google Cloud Console**
   - Go to https://console.cloud.google.com/
   - Select your Ritual project

2. **Navigate to OAuth Credentials**
   - Go to **APIs & Services** → **Credentials**
   - Find your OAuth 2.0 Client ID
   - Click on it to edit

3. **Configure Authorized Redirect URIs**

   Add the following URIs:

   **Production:**
   ```
   https://ffowyysujkzwxisjckxh.supabase.co/auth/v1/callback
   ```

   **Development:**
   ```
   http://localhost:5173/auth/callback
   ```

   Note: The Supabase callback URL is the primary redirect URI. Supabase then redirects to your app's configured Site URL.

4. **Save Changes**
   - Click **Save**
   - Changes may take a few minutes to propagate

### 2. Supabase Dashboard Configuration

1. **Access Supabase Dashboard**
   - Go to https://supabase.com/dashboard
   - Select project: ffowyysujkzwxisjckxh

2. **Configure Authentication URLs**
   - Go to **Authentication** → **URL Configuration**

   **Site URL:**
   ```
   https://tryritual.co
   ```

   **Redirect URLs (whitelist):**
   ```
   https://tryritual.co/**
   http://localhost:5173/**
   ```

3. **Configure Google OAuth Provider**
   - Go to **Authentication** → **Providers**
   - Enable **Google** if not already enabled
   - Enter your Google OAuth Client ID and Secret
   - **Enable the provider**

4. **Save Changes**
   - Click **Save**
   - Changes are immediate

## Code Implementation

The OAuth redirect is configured in `/src/pages/Auth.tsx`:

```typescript
const handleGoogleAuth = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/`,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });
};
```

The `redirectTo` parameter uses `window.location.origin`, which automatically:
- Uses `https://tryritual.co` in production
- Uses `http://localhost:5173` in development

## OAuth Flow

1. User clicks "Sign in with Google" button
2. App calls `supabase.auth.signInWithOAuth()`
3. User is redirected to Google's consent screen
4. User approves and Google redirects to: `https://ffowyysujkzwxisjckxh.supabase.co/auth/v1/callback`
5. Supabase processes the callback and redirects to the configured Site URL
6. App's auth state listener detects the session and navigates to home

## Troubleshooting

### Issue: Redirects to localhost after Google sign-in

**Cause**: Google Cloud Console has localhost configured as the only authorized redirect URI.

**Solution**:
1. Add the Supabase production callback URL to Google Cloud Console (see step 1.3 above)
2. Ensure Supabase Site URL is set to `https://tryritual.co`

### Issue: "Redirect URI mismatch" error

**Cause**: The redirect URI in the OAuth request doesn't match any URI in Google Cloud Console.

**Solution**:
1. Check the error message for the exact URI being used
2. Add that exact URI to Google Cloud Console authorized redirect URIs
3. Common URIs to check:
   - Supabase callback: `https://ffowyysujkzwxisjckxh.supabase.co/auth/v1/callback`
   - With trailing slash: `https://ffowyysujkzwxisjckxh.supabase.co/auth/v1/callback/`

### Issue: Works locally but not in production

**Cause**: Only localhost redirect URI is configured.

**Solution**: Add production Supabase callback URL to Google Cloud Console.

### Issue: Session not persisting after redirect

**Cause**: Cookie/session storage issues or Site URL mismatch.

**Solution**:
1. Verify Supabase Site URL matches your production domain exactly
2. Check browser console for auth errors
3. Verify cookies are not being blocked
4. Check that your domain uses HTTPS (required for secure cookies)

## Environment Variables

No environment variables are needed for OAuth configuration. The OAuth client credentials are stored in:
- **Google**: Google Cloud Console
- **Supabase**: Supabase Dashboard → Authentication → Providers

## Testing

### Test in Development
1. Run `npm run dev`
2. Navigate to http://localhost:5173/auth
3. Click "Sign in with Google"
4. Should redirect back to http://localhost:5173/ after auth

### Test in Production
1. Navigate to https://tryritual.co/auth
2. Click "Sign in with Google"
3. Should redirect back to https://tryritual.co/ after auth

## Security Notes

- Never commit OAuth client secrets to git
- Always use HTTPS in production for secure cookie transmission
- The OAuth client ID can be public (it's in the frontend code)
- The OAuth client secret must remain private (stored in Supabase Dashboard only)
- Restrict authorized redirect URIs to only trusted domains

## References

- [Supabase OAuth Documentation](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Supabase Auth Configuration](https://supabase.com/docs/guides/auth/auth-helpers/auth-ui)
