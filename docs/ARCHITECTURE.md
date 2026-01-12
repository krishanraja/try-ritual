# Architecture Documentation

## Technology Stack

### Frontend
- **Framework:** React 18.3.1
- **Build Tool:** Vite 5.x
- **Language:** TypeScript 5.x
- **Styling:** Tailwind CSS 3.x with custom design system
- **Animations:** Framer Motion 12.x
- **Routing:** React Router v6
- **State Management:** React Context API + React Query
- **UI Components:** Radix UI primitives + custom shadcn/ui components

### Backend (Supabase)
- **Database:** PostgreSQL with Row Level Security
- **Authentication:** Supabase Auth (email/password, Google OAuth)
- **Realtime:** Supabase Realtime (database changes + presence)
- **Storage:** Supabase Storage (`ritual-photos` bucket)
- **Edge Functions:** Deno runtime (14 functions)

### AI Integration
- **Provider:** Google Gemini API
- **Models:**
  - `google/gemini-2.5-pro` - Main synthesis (4-5 rituals)
  - `google/gemini-2.5-flash` - Swap ritual generation

### Deployment
- **Platform:** Vercel
- **Domain:** Custom domain support
- **CI/CD:** Automatic deployment on push
- **CDN:** Global edge distribution
- **Caching:** Network-first service worker + immutable assets

---

## Architecture Patterns

### State Management Architecture

```
┌─────────────────────────────────────────┐
│         CoupleContext (Global)          │
│  - user, session                        │
│  - couple, partnerProfile               │
│  - currentCycle, cycleState             │
│  - loading state                        │
│  - refreshCouple(), refreshCycle()      │
└────────────┬────────────────────────────┘
             │
             │ provides
             ▼
┌─────────────────────────────────────────┐
│        Page Components                   │
│  - Landing, QuickInput, RitualPicker    │
│  - RitualCards, Memories, Profile       │
└─────────────────────────────────────────┘
```

**Key Design Decision:** Single source of truth in `CoupleContext` with aggressive refresh patterns to ensure state consistency across realtime updates.

### Database Architecture

```
auth.users (Supabase managed)
    │
    ├──→ profiles (public.profiles)
    │      │
    │      └──→ couples (partner_one, partner_two)
    │             │
    │             ├──→ weekly_cycles
    │             │     ├──→ completions
    │             │     ├──→ ritual_feedback
    │             │     └──→ ritual_preferences
    │             │
    │             ├──→ ritual_memories
    │             │     └──→ memory_reactions
    │             │
    │             ├──→ ritual_streaks
    │             └──→ ritual_suggestions
    │
    ├──→ push_subscriptions
    │
    └──→ ritual_library (global)
```

**Key Relationships:**
- 1 couple has many weekly_cycles (one per week)
- 1 weekly_cycle has 0-1 feedback, many preferences, many completions
- 1 couple has many memories, 1 streak record, many suggestions
- 1 memory has many reactions (one per partner)

---

## Component Architecture

### Component Hierarchy

```
App
└── SplashScreen (coordinated loading)
    └── AppShell
        ├── Header (logo, status, join button)
        ├── Main Content (Route)
        │   ├── Landing (dashboard)
        │   │   ├── WaitingForPartner
        │   │   └── SynthesisAnimation
        │   ├── Auth (sign in/up)
        │   ├── QuickInput
        │   │   └── CardDrawInput
        │   ├── RitualPicker
        │   │   ├── RitualCarousel
        │   │   └── AgreementGame
        │   ├── RitualCards
        │   │   ├── RitualCard
        │   │   └── EnhancedPostRitualCheckin
        │   │       ├── PhotoCapture
        │   │       └── RatingStars
        │   ├── Memories
        │   │   ├── MemoryCard
        │   │   └── MemoryReactions
        │   └── Profile
        └── Bottom Nav
```

### Key Component Patterns

**1. No-Cutoff Layout Principle (CRITICAL)**

**NEVER** use fixed viewport heights (`h-screen`, `h-[100dvh]`) inside page components. AppShell handles viewport constraints. Pages MUST use proper flex layouts:

```tsx
// ✅ CORRECT: Page component pattern
<div className="h-full flex flex-col">
  {/* Fixed header - flex-none */}
  <div className="flex-none px-4 py-3">
    <h1>Title</h1>
  </div>
  
  {/* Scrollable content - flex-1 with overflow */}
  <div className="flex-1 overflow-y-auto min-h-0">
    {/* Content that may need scrolling */}
  </div>
  
  {/* Fixed footer/button - flex-none */}
  <div className="flex-none px-4 py-3">
    <Button>Action</Button>
  </div>
</div>

// ❌ WRONG: Using fixed heights
<div className="h-[100dvh]">  // NEVER inside pages
  <div className="pb-24">  // NEVER padding hacks
```

**Key Rules:**
- `h-full` on root div (inherits from AppShell)
- `flex-none` for fixed elements (headers, buttons)
- `flex-1 overflow-y-auto min-h-0` for scrollable content
- **NEVER** use `pb-24` or similar padding hacks
- **NEVER** use `h-screen` or `h-[100dvh]` inside pages

**2. Progressive Timeout Pattern**

All loading states must have progressive feedback:

```tsx
// ✅ CORRECT: Progressive timeouts
useEffect(() => {
  const t1 = setTimeout(() => setMessage("Taking a moment..."), 3000);
  const t2 = setTimeout(() => setShowActions(true), 5000);
  const t3 = setTimeout(() => setWarning(true), 8000);
  const t4 = setTimeout(() => forceComplete(), 10000);
  return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
}, []);
```

**3. Loading States**

Every async operation shows loading state with timeout-based feedback.

**4. Optimistic Updates**

UI updates immediately, with rollback on error.

---

## Edge Functions (14 total)

### Core Functions

#### synthesize-rituals
**Purpose:** Generate personalized rituals using Google Gemini AI

**Input (Card-based v1.6+):**
```typescript
{
  action: 'synthesize' | 'swap',
  coupleId: string,
  partnerOneInput: { selectedCards: string[], desire?: string },
  partnerTwoInput: { selectedCards: string[], desire?: string },
  userCity: string,
  currentRitual?: object // for swap action
}
```

**Output:**
```typescript
{
  rituals: [{
    title: string,
    description: string,
    time_estimate: string,
    budget_band: string,
    category: string,
    why: string
  }]
}
```

#### trigger-synthesis
**Purpose:** Auto-trigger synthesis when both partners submit
**Triggered:** Database trigger on weekly_cycles update
**Idempotent:** Yes (uses lock mechanism)

#### send-push
**Purpose:** Send web push notifications
**Security:** Requires `x-internal-secret` header (function-to-function only)

**Input:**
```typescript
{
  user_id: string,
  title: string,
  body: string,
  url?: string,
  type?: 'completion' | 'nudge' | 'general'
}
```

#### notify-partner-completion
**Purpose:** Notify partner when ritual is completed
**Flow:**
1. Get current user's name
2. Determine partner's user_id
3. Call send-push with completion notification
4. Partner receives: "💕 {name} completed '{ritual}' - tap to see!"

### Utility Functions

- **nudge-partner** - Send reminder to partner
- **cleanup-orphaned-cycles** - Clean stale cycles
- **delete-account** - Full account deletion
- **send-contact-email** - Contact form

### Premium Functions

- **create-checkout** - Stripe checkout session
- **stripe-webhook** - Handle Stripe events
- **customer-portal** - Stripe billing portal
- **check-subscription** - Verify premium status

### Content Functions

- **deliver-surprise-ritual** - Surprise ritual delivery
- **parse-bucket-list** - Parse bucket list input

---

## Security Model

### Authentication
- Email/password via Supabase Auth
- Auto-confirm enabled for non-production
- Session persisted in localStorage
- JWT tokens in Authorization header

### Row Level Security (RLS)

**Key Policies:**
- Users can only see their own profile
- Users can see their partner's profile if in active couple
- Users can only access data for couples they're in
- Anyone can view joinable couples (where partner_two IS NULL)
- Partner one can delete couple
- Partner two can leave couple (sets partner_two to NULL)
- Memory reactions: Only couple members can view/add

### Edge Function Security
- `send-push` requires internal secret header
- All other functions require valid JWT
- Service role key used only for admin operations
- Input sanitization for AI prompts (prompt injection protection)

### Content Security Policy
Configured in `vercel.json`:
- Scripts: self + inline (required for Vite)
- Styles: self + Google Fonts
- Images: self + Supabase
- Connect: Supabase + Stripe

---

## Caching Strategy

### Service Worker (`public/sw.js`)

**Network-First for API Calls:**
```javascript
// All Supabase API calls use network-first
if (event.request.url.includes('supabase.co')) {
  // Try network, fall back to cache only if offline
  event.respondWith(networkFirst(event.request));
}
```

**Cache-First for Static Assets:**
- Hashed filenames in `/assets/*` are cached immutably
- Fonts and images cached with stale-while-revalidate

### CDN Headers (`vercel.json`)

| Path | Cache-Control |
|------|---------------|
| `/sw.js` | no-cache, no-store, must-revalidate |
| `/index.html` | no-cache, must-revalidate |
| `/assets/*` | public, max-age=31536000, immutable |

### React Query

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000,   // 10 minutes
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});
```

---

## Routing

### Route Map

| Path | Component | Access |
|------|-----------|--------|
| `/` | Landing | Public (unauthenticated) or Dashboard (authenticated) |
| `/auth` | Auth | Public |
| `/input` | QuickInput | Authenticated + Couple |
| `/picker` | RitualPicker | Authenticated + Couple |
| `/rituals` | RitualCards | Authenticated + Couple |
| `/memories` | Memories | Authenticated + Couple |
| `/profile` | Profile | Authenticated |
| `/faq` | FAQ | Public |
| `/blog` | Blog | Public |
| `/blog/:slug` | BlogPost | Public |

**IMPORTANT:** The home route is `/`, NOT `/home`. Always use `navigate('/')` when redirecting to the home/landing page.

### SPA Routing

Configured in `vercel.json`:
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

---

## Performance Considerations

### Optimization Strategies

1. **Lazy Loading:** Routes code-split automatically by Vite
2. **Memoization:** Heavy computations memoized with useMemo
3. **Component Memoization:** MemoryCard and nav items memoized
4. **Debouncing:** Input handlers debounced
5. **Realtime Throttling:** Realtime updates batched
6. **Query Caching:** React Query caches with smart invalidation
7. **Image Compression:** Client-side compression before upload (~500KB target)
8. **Chunk Splitting:** Vendor chunks split for better caching

### Bundle Size

| Chunk | Size (gzipped) |
|-------|----------------|
| Main bundle | ~140-180KB |
| react-vendor | ~40KB |
| radix-vendor | ~25KB |
| framer-vendor | ~30KB |
| Other vendors | ~30KB |

### Performance Targets

- Time to Interactive: < 2.5s
- First Contentful Paint: < 1.3s
- Cumulative Layout Shift: < 0.1

---

## Error Handling

### Error Boundary

```tsx
// Wraps entire app
<ErrorBoundary>
  <App />
</ErrorBoundary>

// Shows friendly error UI with:
// - Error message
// - "Try Again" button
// - "Go Home" button
```

### Timeout Handling

All async operations have timeouts:
- Supabase requests: 10 seconds
- Auth initialization: 3 seconds safety
- Splash screen: 10 seconds force dismiss
- Synthesis: 30 seconds with retry

### Error Recovery

```typescript
// Pattern used throughout
try {
  const result = await operation();
} catch (error) {
  console.error('[Context] Operation failed:', error);
  toast({ title: "Error", description: getUserFriendlyError(error) });
  // Retry logic or fallback
}
```

---

## Realtime Architecture

### Subscription Pattern

```typescript
// Stable channel names (no timestamp suffix)
const channel = supabase
  .channel(`couples-${user.id}`)
  .on('postgres_changes', { ... }, handleChange)
  .subscribe();

// Always cleanup
return () => supabase.removeChannel(channel);
```

### Channels Used

| Channel | Purpose |
|---------|---------|
| `couples-{userId}` | Couple updates (partner join/leave) |
| `cycles-{userId}` | Cycle updates (partner submit, synthesis) |
| `synthesis-{cycleId}` | Synthesis completion |

---

## File Structure

```
ritual/
├── docs/                    # Documentation
│   ├── ARCHITECTURE.md      # This file
│   ├── AGENT_HISTORY.md     # AI agent session log
│   ├── DATABASE.md          # Schema documentation
│   ├── API.md               # Edge function API
│   ├── HANDOFF.md           # Developer onboarding
│   ├── USER-FLOWS.md        # User journey maps
│   └── ...
├── public/
│   ├── sw.js                # Service worker
│   ├── manifest.json        # PWA manifest
│   └── ...
├── src/
│   ├── components/          # React components
│   │   ├── ui/              # shadcn/ui base
│   │   └── ...              # Feature components
│   ├── contexts/            # React contexts
│   ├── hooks/               # Custom hooks
│   ├── pages/               # Route pages
│   ├── utils/               # Utilities
│   └── integrations/        # Supabase client
├── supabase/
│   ├── functions/           # 14 edge functions
│   └── migrations/          # Database migrations
├── vercel.json              # Deployment config
└── package.json
```

---

*Last updated: January 2026*
