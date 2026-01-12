# API Documentation

## Edge Functions

Ritual uses Supabase Edge Functions (Deno runtime) for backend logic.

### Base URL
```
{SUPABASE_URL}/functions/v1
```

**Note:** Replace `{SUPABASE_URL}` with your Supabase project URL (e.g., `https://your-project-id.supabase.co`). 
The URL is automatically provided to edge functions via the `SUPABASE_URL` environment variable.

### Authentication
All edge functions require JWT authentication:
```
Authorization: Bearer <user-jwt-token>
```

---

## 1. synthesize-rituals

**Purpose:** Generate personalized rituals using Google Gemini AI based on partners' inputs and historical data.

### Endpoint
```
POST /functions/v1/synthesize-rituals
```

### Request Body

**Main Synthesis:**
```json
{
  "action": "synthesize",
  "coupleId": "uuid",
  "partnerOneInput": {
    "energy": "high" | "medium" | "low" | "variable",
    "availability": "30min" | "1-2hrs" | "3+hrs" | "flexible",
    "budget": "$" | "$$" | "$$$" | "free",
    "craving": "intimacy" | "adventure" | "relaxation" | "creativity" | "spontaneity",
    "desire": "string" // optional
  },
  "partnerTwoInput": {
    "energy": "high" | "medium" | "low" | "variable",
    "availability": "30min" | "1-2hrs" | "3+hrs" | "flexible",
    "budget": "$" | "$$" | "$$$" | "free",
    "craving": "intimacy" | "adventure" | "relaxation" | "creativity" | "spontaneity",
    "desire": "string" // optional
  },
  "userCity": "London" | "Sydney" | "Melbourne" | "New York"
}
```

**Swap Ritual:**
```json
{
  "action": "swap",
  "coupleId": "uuid",
  "currentRitual": {
    "title": "string",
    "description": "string",
    // ... full ritual object
  },
  "partnerOneInput": { /* same as above */ },
  "partnerTwoInput": { /* same as above */ },
  "userCity": "string"
}
```

### Response

**Success (200):**
```json
{
  "rituals": [
    {
      "title": "string",
      "description": "string",
      "time_estimate": "string",
      "budget_band": "string",
      "category": "string",
      "why": "string"
    }
  ]
}
```

For "swap" action:
```json
{
  "ritual": {
    "title": "string",
    "description": "string",
    "time_estimate": "string",
    "budget_band": "string",
    "category": "string",
    "why": "string"
  }
}
```

**Error Responses:**

**400 Bad Request:**
```json
{
  "error": "Missing required fields"
}
```

**402 Payment Required:**
```json
{
  "error": "AI credits depleted. Please add credits to continue."
}
```

**429 Rate Limit:**
```json
{
  "error": "Rate limit exceeded. Please try again in a moment."
}
```

**500 Internal Server Error:**
```json
{
  "error": "Error message"
}
```

### AI Models Used

- **Main Synthesis:** `google/gemini-2.5-pro` (higher quality, 4-5 rituals)
- **Swap:** `google/gemini-2.5-flash` (faster, single ritual)

### Historical Context

The function automatically fetches:
- **Completions:** All rituals the couple has completed (to avoid repeats)
- **Memories:** Highly-rated rituals (4-5 stars) to lean into successful themes
- **Notes:** User reflections to understand what works

### Location Context

Considers:
- **City:** Where the couple is located
- **Season:** Current season (northern/southern hemisphere aware)
- **Time of Day:** Morning, afternoon, evening, night
- **Local Time:** Current time in their timezone

### Example Request

```typescript
const response = await fetch(
  'https://gdojuuzlxpxftsfkmneu.supabase.co/functions/v1/synthesize-rituals',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      action: 'synthesize',
      coupleId: couple.id,
      partnerOneInput: {
        energy: 'high',
        availability: '1-2hrs',
        budget: '$$',
        craving: 'adventure',
        desire: 'Something outdoors'
      },
      partnerTwoInput: {
        energy: 'medium',
        availability: '1-2hrs',
        budget: '$',
        craving: 'relaxation',
        desire: 'Not too intense'
      },
      userCity: 'New York'
    })
  }
);

const data = await response.json();
console.log(data.rituals);
```

---

## 2. nudge-partner

**Purpose:** Send a reminder to partner who hasn't submitted their input yet.

### Endpoint
```
POST /functions/v1/nudge-partner
```

### Request Body
```json
{
  "cycleId": "uuid"
}
```

### Response

**Success (200):**
```json
{
  "success": true,
  "message": "Nudge sent successfully"
}
```

**Error Responses:**

**400 Bad Request:**
```json
{
  "error": "Missing cycleId"
}
```

**401 Unauthorized:**
```json
{
  "error": "Unauthorized"
}
```

**403 Forbidden:**
```json
{
  "error": "Unauthorized" // User not part of couple
}
```

**404 Not Found:**
```json
{
  "error": "Cycle not found"
}
```

**429 Rate Limit:**
```json
{
  "error": "Please wait an hour before sending another reminder"
}
```

**500 Internal Server Error:**
```json
{
  "error": "Error message"
}
```

### Rate Limiting

- **Limit:** Once per hour per cycle
- **Logic:** Checks `nudged_at` timestamp
- **Cooldown:** 60 minutes

### Side Effects

1. Updates `weekly_cycles.nudged_at` to current timestamp
2. Partner sees nudge banner on next page load (via realtime)
3. Nudge banner dismissible for 24 hours

### Example Request

```typescript
const response = await fetch(
  'https://gdojuuzlxpxftsfkmneu.supabase.co/functions/v1/nudge-partner',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      cycleId: currentCycle.id
    })
  }
);

if (response.ok) {
  toast({ title: "Reminder sent!" });
} else if (response.status === 429) {
  toast({ title: "You've already sent a reminder recently" });
}
```

---

## Supabase Client SDK

The app uses `@supabase/supabase-js` for database operations.

### Initialization

```typescript
import { supabase } from "@/integrations/supabase/client";
```

### Common Queries

**Fetch Current Cycle:**
```typescript
const { data, error } = await supabase
  .from('weekly_cycles')
  .select('*')
  .eq('couple_id', coupleId)
  .or('synthesized_output.is.null,agreement_reached.eq.false')
  .order('created_at', { ascending: false })
  .limit(1)
  .maybeSingle();
```

**Submit Input:**
```typescript
const { error } = await supabase
  .from('weekly_cycles')
  .update({
    partner_one_input: inputData,
    partner_one_submitted_at: new Date().toISOString()
  })
  .eq('id', cycleId);
```

**Save Preferences:**
```typescript
const { error } = await supabase
  .from('ritual_preferences')
  .insert([
    {
      weekly_cycle_id: cycleId,
      user_id: userId,
      ritual_title: ritual.title,
      rank: 1,
      ritual_data: ritual,
      proposed_date: '2025-01-15',
      proposed_time: '19:00'
    },
    // ... top 3 choices
  ]);
```

**Fetch Memories:**
```typescript
const { data: memories } = await supabase
  .from('ritual_memories')
  .select('*')
  .eq('couple_id', coupleId)
  .order('completion_date', { ascending: false });
```

### Realtime Subscriptions

**Subscribe to Couple Changes:**
```typescript
const channel = supabase
  .channel('couples')
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'couples',
      filter: `id=eq.${coupleId}`
    },
    (payload) => {
      console.log('Couple updated:', payload);
      refreshCouple();
    }
  )
  .subscribe();
```

**Subscribe to Cycle Changes:**
```typescript
const channel = supabase
  .channel('weekly_cycles')
  .on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'weekly_cycles',
      filter: `couple_id=eq.${coupleId}`
    },
    (payload) => {
      console.log('Cycle updated:', payload);
      refreshCycle();
    }
  )
  .subscribe();
```

**Cleanup:**
```typescript
return () => {
  supabase.removeChannel(channel);
};
```

---

## Error Handling

### Standard Error Response Format

```json
{
  "error": "Human-readable error message"
}
```

### Client-Side Error Handling Pattern

```typescript
try {
  const response = await fetch(url, options);
  
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Something went wrong');
  }
  
  const data = await response.json();
  return data;
} catch (error) {
  console.error('API Error:', error);
  toast({
    title: "Error",
    description: error.message,
    variant: "destructive"
  });
}
```

---

## Rate Limits

### Edge Functions
- **Google Gemini API:** Rate limits as per Google's API limits
- **Nudge Partner:** 1 request per hour per cycle

### Database Queries
- **No explicit limits** (Supabase handles connection pooling)
- **Best Practice:** Batch queries when possible, avoid N+1

---

## Authentication Flow

### Sign Up
```typescript
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'password123',
  options: {
    data: {
      name: 'User Name'
    }
  }
});
```

### Sign In
```typescript
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password123',
});
```

### Get Session
```typescript
const { data: { session } } = await supabase.auth.getSession();
```

### Sign Out
```typescript
await supabase.auth.signOut();
```

---

## Future API Improvements

1. **Batch Endpoints:** Combine multiple operations in single request
2. **GraphQL:** Add GraphQL layer for flexible queries
3. **Webhooks:** Notify external systems of events
4. **API Versioning:** Add v2 endpoints without breaking v1
5. **Request Validation:** Stricter input validation with JSON schemas
6. **Response Caching:** Cache AI responses for identical inputs
7. **Monitoring:** Add request logging and analytics
8. **Documentation:** OpenAPI/Swagger spec
