# Project Notes: Ritual

> **Purpose**: Running decisions log and technical debt tracker. Updated with each significant change.

---

## Project Overview

| Field | Value |
|-------|-------|
| **Project Name** | Ritual |
| **Version** | 1.7.0 |
| **Last Updated** | 2026-01-03 |
| **Status** | Production - Infinite Loading Fix Deployed |

---

## Architecture Decisions

### AD-001: State Management
- **Decision**: Use React Context + React Query for state management
- **Date**: Initial setup
- **Rationale**: Simple enough for current scope, React Query handles server state caching
- **Status**: ✅ Implemented

### AD-002: Authentication
- **Decision**: Supabase Auth with email/password
- **Date**: Initial setup
- **Rationale**: Supabase Auth handles auth flows out of the box
- **Status**: ✅ Implemented

### AD-003: Styling System
- **Decision**: Tailwind CSS + shadcn/ui components + CSS variables for design tokens
- **Date**: Initial setup
- **Rationale**: Consistent design system, easy to customize, good DX
- **Status**: ✅ Implemented

### AD-004: Animation Library
- **Decision**: Framer Motion for page transitions and micro-interactions
- **Date**: Initial setup
- **Rationale**: Best-in-class React animation library, good performance
- **Status**: ✅ Implemented

### AD-005: AI Integration
- **Decision**: Google Gemini via edge functions for ritual synthesis
- **Date**: Initial setup
- **Rationale**: Good quality, Google Gemini API with structured output support
- **Status**: ✅ Implemented

### AD-006: Card Draw Input (replaces MagneticCanvas)
- **Decision**: Replace MagneticCanvas with simple tap-to-select mood cards
- **Date**: 2025-12-11
- **Rationale**: MagneticCanvas was fiddly and unintuitive. Card selection is faster (same ~30s) and more familiar to users.
- **Status**: ✅ Implemented

### AD-007: Photo Memories
- **Decision**: Client-side compression + Supabase Storage for ritual photos
- **Date**: 2025-12-11
- **Rationale**: Photos drive emotional attachment and return visits. Compress to ~500KB to balance quality vs storage/bandwidth.
- **Status**: ✅ Implemented

### AD-008: Partner Reactions
- **Decision**: Single reaction per user per memory, emoji-based
- **Date**: 2025-12-11
- **Rationale**: Creates emotional feedback loop without complexity.
- **Status**: ✅ Implemented

### AD-009: Coordinated Loading Experience
- **Decision**: React-controlled splash screen that waits for data before revealing content
- **Date**: 2025-12-13
- **Rationale**: Eliminates layout shift and provides Google-esque loading experience.
- **Status**: ✅ Implemented

### AD-010: SEO Content Strategy
- **Decision**: Implement comprehensive SEO with FAQ page and blog system
- **Date**: 2025-12-13
- **Rationale**: Drive organic traffic through content marketing.
- **Status**: ✅ Implemented (6 initial articles, 20+ FAQs)

### AD-011: Branded Loading Experience
- **Decision**: Use branded Ritual icon for all loading states instead of generic icons
- **Date**: 2025-12-14
- **Rationale**: Reinforces brand identity, creates cohesive UX.
- **Status**: ✅ Implemented

### AD-012: Network-First Service Worker
- **Decision**: Use network-first caching for all API calls
- **Date**: 2026-01-03
- **Rationale**: Stale-while-revalidate caused infinite loading when cache was stale. Network-first ensures fresh data.
- **Status**: ✅ Implemented

### AD-013: Progressive Timeout System
- **Decision**: Multi-stage timeouts with user feedback at each stage
- **Date**: 2026-01-03
- **Rationale**: Users should never wait indefinitely. Progressive feedback builds trust.
- **Key Thresholds**:
  - 3s: Message change
  - 5s: Action buttons appear
  - 8s: Warning state
  - 10s: Force continue
  - 30s: Synthesis timeout with retry
- **Status**: ✅ Implemented

---

## Technical Debt

### TD-001: Missing Error Boundaries
- **Priority**: ~~High~~ Resolved
- **Description**: No React error boundaries wrapping routes
- **Action**: Added ErrorBoundary component to wrap routes
- **Status**: ✅ Resolved (2025-01-XX)

### TD-002: No Testing Infrastructure
- **Priority**: Medium
- **Description**: No Vitest/Jest setup, no smoke tests
- **Impact**: Regressions can slip through unnoticed
- **Action**: Set up Vitest with basic smoke tests
- **Status**: 🔴 Open

### TD-003: Inconsistent Logging
- **Priority**: ~~Medium~~ Resolved
- **Description**: Some edge functions have structured logging, others don't
- **Action**: All edge functions now use structured JSON logging
- **Status**: ✅ Resolved (2025-12-11)

### TD-004: Missing Loading Skeletons
- **Priority**: ~~Low~~ Resolved
- **Description**: Some data-fetching states show nothing during load
- **Action**: Added skeleton components for key loading states
- **Status**: ✅ Resolved (2025-12-13)

### TD-005: No Reduced Motion Support
- **Priority**: Low
- **Description**: Animations don't respect prefers-reduced-motion
- **Impact**: Accessibility concern for motion-sensitive users
- **Action**: Add reduced motion media query checks
- **Status**: 🔴 Open

### TD-006: Legacy MagneticCanvas Fields
- **Priority**: Low
- **Description**: `weekly_cycles.canvas_state_one/two` and `sync_completed_at` are unused
- **Impact**: Database bloat, confusing schema
- **Action**: Migration to remove columns (low priority, no harm keeping)
- **Status**: 🟡 Documented as deprecated

### TD-007: Duplicate Documentation Files
- **Priority**: Low
- **Description**: Root-level .md files duplicated docs/ contents
- **Action**: Consolidated into docs/AGENT_HISTORY.md
- **Status**: ✅ Resolved (2026-01-03)

---

## Key Decisions Log

### 2026-01-03: v1.7.0 Infinite Loading Fix
- Created comprehensive fix for infinite loading screens
- Implemented network-first service worker caching
- Added 30-second synthesis timeout with auto-retry
- Enhanced SplashScreen with progressive timeouts
- Added polling fallback for realtime failures
- Updated vercel.json with cache-control headers
- Consolidated all documentation into comprehensive guides

### 2025-01-27: v1.6.6 Mobile UX & Auth Fixes
- Fixed SplashScreen with progressive timeouts (3s/8s)
- Enhanced submit button with logging and error display
- Redesigned LeaveConfirmDialog for mobile-first
- Fixed Supabase key configuration issues
- Added connection test utility

### 2025-12-14: v1.6.4 Branded Loading & Viewport Fixes
- Created `RitualSpinner` component with branded icon and animations
- Fixed favicon inconsistency with multi-format icon set
- Added `manifest.json` for PWA support
- Replaced all generic Loader2/Sparkles icons with branded spinner
- Fixed Memories page viewport issue

### 2025-12-13: v1.6.3 SEO & Coordinated Loading
- Full audit of all pages, components, hooks, and edge functions
- Implemented FAQ page with schema.org markup
- Created blog system with article pages
- Implemented coordinated splash screen loading

### 2025-12-11: v1.6.0 Ritual Experience Redesign
- Replaced MagneticCanvas with CardDrawInput
- Added photo upload with client-side compression
- Created Memories gallery to replace History page
- Added partner reactions on memories
- Implemented web push notifications

---

## Database Schema Notes

### Core Tables
- `profiles` - User profile data (linked to auth.users)
- `couples` - Couple pairings with codes
- `weekly_cycles` - Weekly ritual cycles with inputs/outputs
- `ritual_preferences` - User ritual rankings per cycle
- `ritual_memories` - Completed ritual history with photos
- `memory_reactions` - Partner emoji reactions on memories

### Storage
- `ritual-photos` - Photo uploads for memories (public bucket, 5MB limit)

### Edge Functions (14 total)
- `synthesize-rituals` - AI ritual generation
- `trigger-synthesis` - Auto-trigger on both submit
- `nudge-partner` - Partner reminders
- `send-push` - Web push notifications
- `notify-partner-completion` - Completion notifications
- `cleanup-orphaned-cycles` - Stale cycle cleanup
- `create-checkout` - Stripe checkout
- `stripe-webhook` - Stripe events
- `customer-portal` - Stripe portal
- `check-subscription` - Premium status
- `delete-account` - Account deletion
- `send-contact-email` - Contact form
- `deliver-surprise-ritual` - Surprise rituals
- `parse-bucket-list` - Bucket list parsing

---

## Environment Variables

### Required Environment Variables
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`

### Edge Function Secrets
- `GOOGLE_AI_API_KEY` - For Google Gemini AI synthesis
- `STRIPE_SECRET_KEY` - For payments
- `STRIPE_WEBHOOK_SECRET` - For Stripe webhooks
- `RESEND_API_KEY` - For email delivery
- `VAPID_PUBLIC_KEY` - For push notifications
- `VAPID_PRIVATE_KEY` - For push notifications
- `INTERNAL_FUNCTION_SECRET` - For function-to-function calls

---

## Performance Notes

- Page transitions kept under 300ms
- React Query cache time: 5 minutes default
- Images optimized for mobile-first
- Edge functions deployed to edge for low latency
- Photos compressed client-side to ~500KB before upload
- Service worker uses network-first for API calls

---

## Known Issues

1. **Safari iOS**: Some animations may jitter on older devices
2. **PWA**: Service worker may need hard refresh after updates
3. **Email**: Some transactional emails may hit spam filters
4. **Push Notifications**: Requires HTTPS in production

---

## Files Removed (v1.6)

The following dead code was removed:
- `src/pages/MagneticInput.tsx`
- `src/components/MagneticCanvas.tsx`
- `src/components/EmotionalToken.tsx`
- `src/components/PartnerGhost.tsx`
- `src/hooks/useMagneticSync.ts`
- `src/types/magneticCanvas.ts`
- `src/pages/History.tsx` (replaced by Memories.tsx)

---

*This document is updated with each significant architectural decision or technical debt item.*
