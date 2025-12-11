# Architecture Documentation

## Technology Stack

### Frontend
- **Framework:** React 18.3.1
- **Build Tool:** Vite
- **Language:** TypeScript
- **Styling:** Tailwind CSS 3.x with custom design system
- **Animations:** Framer Motion 12.x
- **Routing:** React Router v6
- **State Management:** React Context API + React Query
- **UI Components:** Radix UI primitives + custom shadcn/ui components

### Backend (Lovable Cloud - Supabase)
- **Database:** PostgreSQL
- **Authentication:** Supabase Auth (email/password)
- **Realtime:** Supabase Realtime (presence & database changes)
- **Storage:** Supabase Storage (`ritual-photos` bucket)
- **Edge Functions:** Deno runtime
  - `synthesize-rituals` - AI ritual generation
  - `nudge-partner` - Partner reminder system
  - `send-push` - Web push notifications
  - `notify-partner-completion` - Completion notifications

### AI Integration
- **Provider:** Lovable AI Gateway
- **Models:**
  - `google/gemini-2.5-pro` - Main synthesis (4-5 rituals)
  - `google/gemini-2.5-flash` - Swap ritual generation

### Deployment
- **Platform:** Lovable Cloud
- **Domain:** Custom domain support available
- **CI/CD:** Automatic deployment on code changes
- **Edge:** Global CDN distribution

## Architecture Patterns

### State Management Architecture

```
┌─────────────────────────────────────────┐
│         CoupleContext (Global)          │
│  - user, session                        │
│  - couple, partnerProfile               │
│  - currentCycle                         │
│  - loading state                        │
│  - refreshCouple(), refreshCycle()      │
└────────────┬────────────────────────────┘
             │
             │ provides
             ▼
┌─────────────────────────────────────────┐
│        Page Components                   │
│  - Home, QuickInput, RitualPicker       │
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
    │             │     │
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

## Component Architecture

### Component Hierarchy

```
App
└── AppShell
    ├── Header (logo, status, join button)
    ├── Main Content (Route)
    │   ├── Landing
    │   ├── Auth
    │   ├── Home
    │   │   ├── WaitingForPartner
    │   │   ├── SynthesisAnimation
    │   │   └── EnhancedPostRitualCheckin
    │   │       ├── PhotoCapture
    │   │       └── MemoryReactions
    │   ├── QuickInput
    │   │   └── CardDrawInput
    │   ├── RitualPicker
    │   │   ├── RitualCarousel
    │   │   └── AgreementGame
    │   ├── RitualCards
    │   │   └── CelebrationScreen
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

**2. Loading States**
Every async operation shows loading state with timeout-based "slow loading" indicator.

**3. Optimistic Updates**
UI updates immediately, with rollback on error.

## Edge Functions

### synthesize-rituals

**Purpose:** Generate personalized rituals using Lovable AI

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

### send-push

**Purpose:** Send web push notifications to users

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

**Security:** Requires `x-internal-secret` header (function-to-function only)

**Output:**
```typescript
{
  success: boolean,
  sent: number,
  failed: number,
  total: number
}
```

### notify-partner-completion

**Purpose:** Notify partner when ritual is completed

**Input:**
```typescript
{
  coupleId: string,
  ritualTitle: string,
  memoryId?: string
}
```

**Flow:**
1. Get current user's name
2. Determine partner's user_id
3. Call send-push with completion notification
4. Partner receives: "💕 {name} completed '{ritual}' - tap to see!"

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

## Routing Notes

**IMPORTANT:** The home route is `/`, NOT `/home`. Always use `navigate('/')` when redirecting to the home/landing page.

**Route Map:**
- `/` - Landing (unauthenticated) or Home (authenticated)
- `/auth` - Sign in / Sign up
- `/input` - Weekly card draw input
- `/picker` - Ritual voting carousel
- `/rituals` - Scheduled ritual view
- `/memories` - Photo memory gallery
- `/profile` - User settings

## Performance Considerations

### Optimization Strategies

1. **Lazy Loading:** Routes code-split automatically by Vite
2. **Memoization:** Heavy computations memoized with useMemo
3. **Debouncing:** Input handlers debounced
4. **Realtime Throttling:** Realtime updates batched to prevent UI thrashing
5. **Query Caching:** React Query caches with smart invalidation
6. **Image Compression:** Client-side compression before upload (~500KB target)

### Bundle Size
- Main bundle: ~150KB gzipped
- Lazy routes: 10-30KB each
- Total initial load: <200KB
