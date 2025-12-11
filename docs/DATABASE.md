# Database Documentation

## Schema Overview

The database uses PostgreSQL (Supabase) with Row Level Security (RLS) enabled on all tables.

### Entity Relationship Diagram

```
auth.users (Supabase managed)
    │
    ├──→ profiles (public.profiles)
    │      │
    │      └──→ couples (partner_one, partner_two FK)
    │             │
    │             ├──→ weekly_cycles (couple_id FK)
    │             │     │
    │             │     ├──→ completions (weekly_cycle_id FK)
    │             │     ├──→ ritual_feedback (weekly_cycle_id FK)
    │             │     └──→ ritual_preferences (weekly_cycle_id FK)
    │             │
    │             ├──→ ritual_memories (couple_id FK)
    │             │     │
    │             │     └──→ memory_reactions (memory_id FK)
    │             │
    │             ├──→ ritual_streaks (couple_id FK, 1:1)
    │             ├──→ ritual_suggestions (couple_id FK)
    │             └──→ surprise_rituals (couple_id FK)
    │
    ├──→ push_subscriptions (user_id FK)
    │
    └──→ ritual_library (global, no FK)

Storage:
    └──→ ritual-photos bucket (couple_id scoped folders)
```

---

## Table Schemas

### profiles

Stores additional user information beyond Supabase auth.users.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | - | PK, matches auth.users.id |
| name | text | No | - | User's display name |
| email | text | Yes | - | User's email (from auth) |
| preferred_city | text | Yes | 'New York' | City for ritual customization |
| created_at | timestamptz | No | now() | Creation timestamp |

**Indexes:**
- PRIMARY KEY (id)

**RLS Policies:**
- Users can view their own profile
- Users can view their partner's profile (if in active couple)
- Users can update their own profile

**Trigger:** Created automatically by `handle_new_user()` function on auth.users INSERT.

---

### couples

Represents a couple's ritual space.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | PK |
| partner_one | uuid | No | - | FK to profiles.id (creator) |
| partner_two | uuid | Yes | - | FK to profiles.id (joiner) |
| couple_code | text | No | - | 6-digit join code (UNIQUE) |
| code_expires_at | timestamptz | Yes | now() + 24 hours | Code expiration |
| is_active | boolean | Yes | true | Soft delete flag |
| preferred_city | text | Yes | 'New York' | Default city for rituals |
| current_cycle_week_start | date | Yes | - | Cached week start (denormalized) |
| synthesis_ready | boolean | Yes | false | Legacy flag (deprecated) |
| created_at | timestamptz | No | now() | Creation timestamp |

**Indexes:**
- PRIMARY KEY (id)
- UNIQUE (couple_code)

**RLS Policies:**
- Authenticated users can create couples (as partner_one)
- Anyone can view joinable couples (partner_two IS NULL)
- Anyone can join open couples (update partner_two)
- Users can view their own couple
- Partner one can update couple
- Partner one can delete couple
- Partner two can leave couple (set partner_two = NULL)

**Constraints:**
- CHECK (partner_one != partner_two)

---

### weekly_cycles

Represents one week's ritual cycle for a couple.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | PK |
| couple_id | uuid | No | - | FK to couples.id |
| week_start_date | date | No | - | Monday of the week (YYYY-MM-DD) |
| partner_one_input | jsonb | Yes | - | P1's input data |
| partner_one_submitted_at | timestamptz | Yes | - | P1 submission timestamp |
| partner_two_input | jsonb | Yes | - | P2's input data |
| partner_two_submitted_at | timestamptz | Yes | - | P2 submission timestamp |
| synthesized_output | jsonb | Yes | - | AI-generated rituals array |
| generated_at | timestamptz | Yes | - | Synthesis timestamp |
| agreement_reached | boolean | Yes | false | True when couple agrees on ritual |
| agreed_ritual | jsonb | Yes | - | The chosen ritual object |
| agreed_date | date | Yes | - | Scheduled date |
| agreed_time | time | Yes | - | Scheduled time |
| nudged_at | timestamptz | Yes | - | Last nudge timestamp |
| swaps_used | integer | Yes | 0 | Number of ritual swaps used |
| nudge_count | integer | Yes | 0 | Number of nudges sent |
| canvas_state_one | jsonb | Yes | - | ⚠️ DEPRECATED - Legacy MagneticCanvas state |
| canvas_state_two | jsonb | Yes | - | ⚠️ DEPRECATED - Legacy MagneticCanvas state |
| sync_completed_at | timestamptz | Yes | - | ⚠️ DEPRECATED - Legacy field |
| created_at | timestamptz | No | now() | Creation timestamp |

**Indexes:**
- PRIMARY KEY (id)
- INDEX (couple_id)
- INDEX (week_start_date)
- UNIQUE (couple_id, week_start_date)

**RLS Policies:**
- Users can view their cycles
- Users can insert their cycles
- Users can update their cycles
- Users can delete empty cycles

**JSONB Schemas:**

**partner_one_input / partner_two_input (Card-based - v1.6+):**
```json
{
  "selectedCards": ["adventure", "cozy", "romantic"],
  "desire": "string" // Optional free text
}
```

**partner_one_input / partner_two_input (Legacy format):**
```json
{
  "energy": "high" | "medium" | "low" | "variable",
  "availability": "30min" | "1-2hrs" | "3+hrs" | "flexible",
  "budget": "$" | "$$" | "$$$" | "free",
  "craving": "intimacy" | "adventure" | "relaxation" | "creativity" | "spontaneity",
  "desire": "string"
}
```

**synthesized_output:**
```json
[
  {
    "title": "string",
    "description": "string",
    "time_estimate": "string",
    "budget_band": "string",
    "category": "string",
    "why": "string"
  }
]
```

---

### memory_reactions

Stores emoji reactions on ritual memories from partners.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | PK |
| memory_id | uuid | No | - | FK to ritual_memories.id |
| user_id | uuid | No | - | User who reacted |
| reaction | text | No | - | Emoji: ❤️, 🔥, 😍, 🥹, 👏 |
| created_at | timestamptz | Yes | now() | Creation timestamp |

**Indexes:**
- PRIMARY KEY (id)
- UNIQUE (memory_id, user_id) - One reaction per user per memory

**RLS Policies:**
- Couple members can view reactions on their memories
- Couple members can add reactions to their memories
- Users can update their own reactions
- Users can delete their own reactions

**Constraints:**
- CHECK (reaction IN ('❤️', '🔥', '😍', '🥹', '👏'))
- FOREIGN KEY (memory_id) REFERENCES ritual_memories(id) ON DELETE CASCADE

---

### ritual_memories

Long-term storage of completed rituals with photos and notes.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | PK |
| couple_id | uuid | No | - | FK to couples.id |
| ritual_title | text | No | - | Ritual title |
| ritual_description | text | Yes | - | Description |
| completion_date | date | No | - | When completed |
| rating | integer | Yes | - | 1-5 stars |
| notes | text | Yes | - | Reflection |
| photo_url | text | Yes | - | Storage URL for photo |
| is_tradition | boolean | Yes | false | Marked as tradition |
| tradition_count | integer | Yes | 1 | Times completed |
| created_at | timestamptz | No | now() | Creation timestamp |
| updated_at | timestamptz | No | now() | Update timestamp |

**Indexes:**
- PRIMARY KEY (id)
- INDEX (couple_id)
- INDEX (completion_date)
- INDEX (rating) WHERE rating >= 4

**RLS Policies:**
- Users can view their couple's memories
- Users can create their couple's memories
- Users can update their couple's memories
- Users can delete their couple's memories

---

### push_subscriptions

Stores web push notification subscriptions.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | PK |
| user_id | uuid | No | - | User who subscribed |
| endpoint | text | No | - | Push service endpoint URL |
| p256dh | text | No | - | Public key for encryption |
| auth | text | No | - | Auth secret for encryption |
| created_at | timestamptz | Yes | now() | Creation timestamp |

**Indexes:**
- PRIMARY KEY (id)

**RLS Policies:**
- Users can view their own subscriptions
- Users can insert their own subscriptions
- Users can update their own subscriptions
- Users can delete their own subscriptions

---

## Storage Buckets

### ritual-photos

Stores photos uploaded during post-ritual check-in.

| Property | Value |
|----------|-------|
| **Name** | ritual-photos |
| **Public** | Yes |
| **File Size Limit** | 5MB |
| **Allowed MIME Types** | image/jpeg, image/png, image/webp |

**Folder Structure:**
```
ritual-photos/
  └── {couple_id}/
      └── {timestamp}-{filename}.jpg
```

**RLS Policies:**
- Users can upload to their couple's folder
- Users can view their couple's photos
- Users can delete their couple's photos

---

## Database Functions

### handle_new_user()

**Purpose:** Automatically create profile when user signs up.

**Trigger:** AFTER INSERT ON auth.users

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'name', 'User'),
    new.email
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
```

---

### update_updated_at_column()

**Purpose:** Auto-update `updated_at` timestamp on row update.

**Used By:** ritual_feedback, ritual_memories, ritual_streaks, bucket_list_items

```sql
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;
```

---

### is_partner()

**Purpose:** Check if a given profile_id is the current user's partner.

```sql
CREATE OR REPLACE FUNCTION public.is_partner(profile_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM couples
    WHERE is_active = true
    AND (
      (partner_one = auth.uid() AND partner_two = profile_id)
      OR (partner_two = auth.uid() AND partner_one = profile_id)
    )
  )
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;
```

---

### get_partner_name()

**Purpose:** Securely get partner's name without exposing email.

```sql
CREATE OR REPLACE FUNCTION public.get_partner_name(partner_id uuid)
RETURNS text AS $$
  SELECT name FROM profiles WHERE id = partner_id AND is_partner(partner_id)
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;
```

---

## Deprecations

### Legacy MagneticCanvas Fields (v1.6)
The following fields on `weekly_cycles` are deprecated and no longer used:
- `canvas_state_one` - Was used for MagneticCanvas P1 state
- `canvas_state_two` - Was used for MagneticCanvas P2 state
- `sync_completed_at` - Was used for MagneticCanvas sync

These fields remain for backwards compatibility but will be removed in a future migration.

### Legacy synthesis_ready (v1.3)
The `couples.synthesis_ready` field is no longer used. Synthesis state is determined by checking `weekly_cycles.synthesized_output IS NOT NULL`.

---

## Migration History

See `supabase/migrations/` directory for full history.

**Recent Migrations:**
- `20251211_create_memory_reactions.sql` - Partner reactions table
- `20251211_create_ritual_photos_bucket.sql` - Photo storage bucket

---

## Performance Considerations

### Query Optimization
- Use indexes on frequently queried columns
- Avoid N+1 queries (use JOINs or batch fetches)
- Paginate large result sets

### JSONB Performance
- JSONB is slower than relational data
- But provides flexibility for evolving schemas
- Use GIN indexes for JSONB search (future)

### Connection Pooling
- Supabase uses PgBouncer automatically
- No need for client-side pooling
