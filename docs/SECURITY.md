# Security Documentation

## Overview

Ritual takes security seriously. This document outlines our security architecture, policies, and best practices.

---

## Authentication

### Supabase Auth

We use Supabase Auth for user authentication:

**Supported Methods:**
- Email + Password (primary)
- Google OAuth (enabled)
- Apple Sign-In (future)

**Session Management:**
- JWT tokens stored in localStorage
- Auto-refresh on expiry
- Secure HttpOnly cookies (server-side)

**Password Requirements:**
- Minimum 6 characters (Supabase default)
- TODO: Enforce stronger requirements

### Authentication Flow

```
1. User submits email + password
2. Supabase validates credentials
3. JWT access token + refresh token issued
4. Tokens stored in localStorage
5. Access token included in all API requests (Authorization header)
6. Auto-refresh before token expires
```

### Session Timeout

- **Access Token:** Expires after 1 hour
- **Refresh Token:** Expires after 7 days
- **Auto-Refresh:** Happens automatically before expiry

### Logout

```typescript
await supabase.auth.signOut();
// Clears localStorage, revokes tokens
```

---

## Row Level Security (RLS)

All database tables use PostgreSQL Row Level Security for fine-grained access control.

### Key Principles

1. **Default Deny:** No access unless explicitly granted
2. **User Context:** RLS policies use `auth.uid()` for current user
3. **Couple Scoping:** Users can only access data for couples they're in
4. **Partner Visibility:** Users can see partner's profile only if in active couple

### RLS Policies by Table

#### profiles

**SELECT:**
- ✅ User can view own profile
- ✅ User can view partner's profile (if in active couple)

**UPDATE:**
- ✅ User can update own profile
- ❌ Cannot update other profiles

**INSERT/DELETE:**
- ❌ Handled by auth trigger only

#### couples

**SELECT:**
- ✅ Users can view their own couple
- ✅ Anyone can view joinable couples (partner_two IS NULL)

**INSERT:**
- ✅ Authenticated users can create couples (as partner_one)

**UPDATE:**
- ✅ Partner one can update couple
- ✅ Partner two can leave couple (set partner_two = NULL)
- ✅ Anyone can join open couples (set partner_two)

**DELETE:**
- ✅ Partner one can delete couple
- ❌ Partner two cannot delete

#### weekly_cycles

**SELECT:**
- ✅ Users can view cycles for their couples

**INSERT:**
- ✅ Users can insert cycles for their couples

**UPDATE:**
- ✅ Users can update cycles for their couples

**DELETE:**
- ❌ No deletes allowed (use soft delete if needed)

#### ritual_preferences

**SELECT:**
- ✅ Users can view couple's preferences (both partners)

**INSERT:**
- ✅ Users can insert own preferences
- ✅ Must be for a cycle they belong to

**UPDATE:**
- ✅ Users can update own preferences

**DELETE:**
- ✅ Users can delete own preferences

#### completions

**SELECT:**
- ✅ Users can view completions for their cycles

**INSERT:**
- ✅ Users can insert completions for their cycles

**UPDATE/DELETE:**
- ❌ No updates or deletes

#### ritual_feedback

**SELECT:**
- ✅ Users can view their couple's feedback

**INSERT:**
- ✅ Users can insert feedback for their couple

**UPDATE:**
- ✅ Users can update their couple's feedback

**DELETE:**
- ❌ No deletes

#### ritual_memories

**SELECT:**
- ✅ Users can view their couple's memories

**INSERT:**
- ✅ Users can create memories for their couple

**UPDATE:**
- ✅ Users can update their couple's memories

**DELETE:**
- ✅ Users can delete their couple's memories

#### ritual_streaks

**SELECT:**
- ✅ Users can view their couple's streak

**INSERT:**
- ✅ Users can insert streak for their couple

**UPDATE:**
- ✅ Users can update their couple's streak

**DELETE:**
- ❌ No deletes

#### ritual_suggestions

**SELECT:**
- ✅ Users can view their couple's suggestions

**INSERT:**
- ✅ System can insert (policy: true) - for edge functions

**UPDATE:**
- ✅ Users can update their couple's suggestions (mark accepted)

**DELETE:**
- ❌ No deletes

#### ritual_library

**SELECT:**
- ✅ Everyone can view (public library)

**INSERT/UPDATE/DELETE:**
- ❌ Admin-only (not implemented yet)

---

## Edge Function Security

### Authentication

All edge functions verify JWT tokens:

```typescript
const supabaseClient = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_ANON_KEY') ?? '',
  {
    global: {
      headers: { Authorization: req.headers.get('Authorization')! },
    },
  }
);

const { data: { user } } = await supabaseClient.auth.getUser();
if (!user) {
  return new Response(
    JSON.stringify({ error: 'Unauthorized' }),
    { status: 401 }
  );
}
```

### Authorization

Functions verify user has access to requested resources:

```typescript
// Example: Verify user is part of couple
const { data: couple } = await supabaseClient
  .from('couples')
  .select('partner_one, partner_two')
  .eq('id', coupleId)
  .single();

if (!couple || (couple.partner_one !== user.id && couple.partner_two !== user.id)) {
  return new Response(
    JSON.stringify({ error: 'Forbidden' }),
    { status: 403 }
  );
}
```

### Rate Limiting

**nudge-partner:**
- 1 request per hour per cycle
- Enforced at application level (check `nudged_at` timestamp)

**synthesize-rituals:**
- Rate limits as per Google Gemini API limits
- 402 response when credits depleted

### CORS

All edge functions include CORS headers:

```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
```

**TODO:** Restrict CORS in production to specific origins.

---

## Data Privacy

### Personal Data Collected

- **Email:** For authentication
- **Name:** Display name
- **City:** For ritual personalization
- **Ritual Preferences:** Energy, budget, cravings
- **Ritual History:** Completions, ratings, notes

### Data Retention

- **Active Couples:** Data retained indefinitely
- **Deleted Couples:** Soft delete (is_active = false), data retained
- **TODO:** Implement hard delete option for GDPR compliance

### Data Sharing

- **Within Couple:** Partners see each other's profiles, inputs, and shared rituals
- **External:** No data shared with third parties
- **AI Processing:** Inputs sent to Google Gemini API for synthesis, not stored by AI provider

### User Rights

- **Access:** View all data via app interface
- **Update:** Edit profile, preferences
- **Delete:** Leave couple (sets partner_two = NULL)
- **Export:** TODO - Add data export feature

---

## Sensitive Data Handling

### Passwords

- **Storage:** Hashed by Supabase Auth (never stored in plaintext)
- **Transmission:** Always over HTTPS
- **Reset:** Email-based password reset flow

### JWT Tokens

- **Storage:** localStorage (client-side)
- **Transmission:** Authorization header
- **Expiry:** 1 hour (access token)
- **Refresh:** Automatic before expiry

### Couple Codes

- **Generation:** 6-character random alphanumeric
- **Uniqueness:** Enforced by database UNIQUE constraint
- **Expiry:** 24 hours after creation
- **Visibility:** Only joinable couples (partner_two IS NULL) visible

### Edge Function Secrets

- **GOOGLE_AI_API_KEY:** Stored in Supabase Secrets
- **SUPABASE_URL:** Environment variable
- **SUPABASE_ANON_KEY:** Environment variable
- **SUPABASE_SERVICE_ROLE_KEY:** Not used in edge functions (security best practice)

---

## Input Validation

### Frontend Validation

- **React Hook Form + Zod:** Type-safe form validation
- **Example:**
```typescript
const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1).max(50),
});
```

### Backend Validation

**Edge Functions:**
- Validate all inputs before processing
- Return 400 for invalid inputs
- Example:
```typescript
if (!coupleId || !partnerOneInput || !partnerTwoInput) {
  return new Response(
    JSON.stringify({ error: 'Missing required fields' }),
    { status: 400 }
  );
}
```

### Database Constraints

- **NOT NULL:** Required fields enforced
- **UNIQUE:** Couple codes unique
- **CHECK:** (future) Add value range checks
- **FOREIGN KEYS:** Referential integrity enforced

### XSS Prevention

- **React:** Automatic escaping of user content
- **Sanitization:** TODO - Add DOMPurify for rich text (future)

### SQL Injection Prevention

- **Parameterized Queries:** Supabase client uses prepared statements
- **No Raw SQL:** All queries via Supabase client (safe by default)

---

## API Security

### HTTPS Only

- All traffic over HTTPS
- HTTP redirects to HTTPS
- Enforced by Vercel deployment platform

### CORS Policy

**Current:** Open CORS (`*`)
**TODO:** Restrict to specific domains in production

### API Keys

- **Supabase Anon Key:** Public key, safe to expose (RLS enforced)
- **Google AI API Key:** Server-side only, never exposed to client

### Authentication

- JWT tokens required for all authenticated endpoints
- No API keys in query params or URLs

---

## Incident Response

### Security Incident Protocol

1. **Detect:** Monitor logs for anomalies
2. **Assess:** Determine impact and scope
3. **Contain:** Block compromised accounts, revoke tokens
4. **Remediate:** Patch vulnerability
5. **Notify:** Inform affected users (if required)
6. **Review:** Post-mortem and prevention

### Contact

For security issues, contact:
- **Email:** security@ritual.app
- **Response Time:** Within 24 hours

---

## Compliance

### GDPR (EU)

**Status:** Partially compliant

**TODO:**
- [ ] Add data export feature
- [ ] Add hard delete option
- [ ] Update privacy policy
- [ ] Add cookie consent banner

### CCPA (California)

**Status:** Not yet compliant

**TODO:**
- [ ] Add "Do Not Sell" option
- [ ] Implement data access requests
- [ ] Update privacy policy

---

## Security Best Practices

### For Developers

1. **Never commit secrets** to git
2. **Use environment variables** for all config
3. **Always validate inputs** on backend
4. **Test RLS policies** thoroughly
5. **Log security events** (failed auth, suspicious activity)
6. **Keep dependencies updated**
7. **Follow principle of least privilege**

### For Users

1. **Use strong passwords** (8+ characters, mix of types)
2. **Don't share your account**
3. **Log out on shared devices**
4. **Report suspicious activity**

---

## Known Security Limitations

1. **No 2FA:** Two-factor authentication not yet implemented
2. **Weak Password Policy:** Min 6 characters (should be 8+)
3. **No Rate Limiting:** Brute force protection limited
4. **No WAF:** No web application firewall yet
5. **Open CORS:** Should restrict in production
6. **localStorage Tokens:** More secure to use HttpOnly cookies

---

## Security Roadmap

### Short Term (Q1 2025)
- [ ] Add 2FA support
- [ ] Implement stricter password policy
- [ ] Add rate limiting to auth endpoints
- [ ] Restrict CORS in production
- [ ] Add security headers (CSP, HSTS, etc.)

### Medium Term (Q2 2025)
- [ ] Migrate to HttpOnly cookies for tokens
- [ ] Add penetration testing
- [ ] Implement GDPR compliance features
- [ ] Add security monitoring (Sentry)
- [ ] Add IP-based rate limiting

### Long Term (Q3 2025)
- [ ] SOC 2 compliance
- [ ] Bug bounty program
- [ ] Regular security audits
- [ ] Advanced threat detection

---

## Security Checklist for New Features

Before shipping new feature:

- [ ] All inputs validated
- [ ] RLS policies tested
- [ ] Authentication required where needed
- [ ] Authorization checks in place
- [ ] Error messages don't leak sensitive info
- [ ] No secrets in client-side code
- [ ] HTTPS enforced
- [ ] Logging added for security events
- [ ] Documentation updated

---

For questions or to report security issues, contact security@ritual.app.
