# Project Notes: Ritual

> **Purpose**: Running decisions log and technical debt tracker. Updated with each significant change.

---

## Project Overview

| Field | Value |
|-------|-------|
| **Project Name** | Ritual |
| **Version** | 1.6.4 |
| **Last Updated** | 2025-12-14 |
| **Status** | Production Ready + SEO + Branded UX |

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
- **Rationale**: Integrated with Lovable Cloud, handles auth flows out of the box
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
- **Rationale**: Good quality, integrated with Lovable AI, structured output support
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
- **Rationale**: Creates emotional feedback loop without complexity. Partner completes → other sees → reacts → original user sees reaction.
- **Status**: ✅ Implemented

### AD-009: Coordinated Loading Experience
- **Decision**: React-controlled splash screen that waits for data before revealing content
- **Date**: 2025-12-13
- **Rationale**: Eliminates layout shift and provides Google-esque loading experience. Elements appear all at once instead of popping in haphazardly.
- **Key Changes**:
  - New `SplashScreen.tsx` component wraps app and coordinates with `CoupleContext.loading`
  - Removed entry animations from `AppShell` header/nav to prevent shift
  - Removed scale animations from `StreakBadge` - uses CSS hover only
  - Native HTML splash removed by React on mount, then React splash fades out when data ready
- **Status**: ✅ Implemented

### AD-011: Branded Loading Experience
- **Decision**: Use branded Ritual icon for all loading states instead of generic icons
- **Date**: 2025-12-14
- **Rationale**: Reinforces brand identity, creates cohesive UX, eliminates generic AI-wheel/sparkle icons
- **Key Components**:
  - **RitualSpinner**: Animated branded spinner with pulse, scale, and rotating gradient effects
  - **Favicon**: Multi-format icon set with manifest.json for PWA support
- **Usage Rules**:
  - Use `<RitualSpinner />` for all loading states
  - Never use Loader2, generic Sparkles, or CSS border spinners
  - Empty states should use static ritual icon, not generic icons
- **Status**: ✅ Implemented

### AD-010: SEO Content Strategy
- **Decision**: Implement comprehensive SEO with FAQ page and blog system
- **Date**: 2025-12-13
- **Rationale**: Drive organic traffic through content marketing. FAQ targets featured snippets, Blog targets long-tail relationship keywords.
- **Key Components**:
  - **FAQ Page** (`/faq`): 20+ questions with FAQ Schema for rich snippets
  - **Blog System** (`/blog`, `/blog/:slug`): Article pages with Article Schema
  - **Target Keywords**: "weekly rituals for couples", "date ideas [city]", "relationship traditions", "keep relationship exciting"
  - **Structured Data**: Organization, WebApplication, SoftwareApplication, WebSite schemas
  - **robots.txt**: Enhanced for AI crawlers, social bots
  - **sitemap.xml**: All pages including individual blog articles
- **Content Strategy**:
  - City-specific date guides (London, Sydney - more to come)
  - Evergreen relationship advice
  - Research-backed content for authority
  - Internal linking to app conversion points
- **Status**: ✅ Implemented (6 initial articles, 20+ FAQs)

---

## Technical Debt

### TD-001: Missing Error Boundaries
- **Priority**: High
- **Description**: No React error boundaries wrapping routes
- **Impact**: Single component error can crash entire app
- **Action**: Add ErrorBoundary component to wrap routes
- **Status**: 🔴 Open

### TD-002: No Testing Infrastructure
- **Priority**: Medium
- **Description**: No Vitest/Jest setup, no smoke tests
- **Impact**: Regressions can slip through unnoticed
- **Action**: Set up Vitest with basic smoke tests
- **Status**: 🔴 Open

### TD-003: Inconsistent Logging
- **Priority**: Medium
- **Description**: Some edge functions have structured logging, others don't
- **Impact**: Debugging is harder in production
- **Action**: All edge functions now use structured JSON logging
- **Status**: ✅ Resolved (2025-12-11)

### TD-004: Missing Loading Skeletons
- **Priority**: Low
- **Description**: Some data-fetching states show nothing during load
- **Impact**: Poor perceived performance
- **Action**: Add skeleton components for key loading states
- **Status**: ✅ Resolved (2025-12-13) - Added to Landing, Memories, and other pages

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

---

## Key Decisions Log

### 2025-12-14: v1.6.4 Branded Loading & Viewport Fixes
- Created `RitualSpinner` component with branded icon and animations
- Fixed favicon inconsistency across browsers with multi-format icon set
- Added `manifest.json` for PWA support
- Replaced all generic Loader2/Sparkles icons with branded spinner
- Fixed Memories page viewport issue - empty state now fits without scrolling
- Updated SplashScreen, SynthesisAnimation, WaitingForPartner with branded icons

### 2025-12-13: v1.6.1 Production Readiness Audit
- Full audit of all pages, components, hooks, and edge functions
- Fixed navigation inconsistencies (using React Router consistently)
- Fixed NotFound page with proper branding and navigation
- Fixed Memories page with auth redirect and empty states
- Fixed null safety issues in realtime subscriptions
- Simplified EnhancedPostRitualCheckin button UX
- Updated all documentation with audit findings
- Verified all 12 edge functions for security compliance
- Build passes without TypeScript errors

### 2025-12-11: v1.6 Ritual Experience Redesign
- Replaced MagneticCanvas with CardDrawInput (tap-based mood cards)
- Added photo upload with client-side compression
- Created Memories gallery to replace History page
- Added partner reactions on memories
- Implemented actual web push notifications
- Created notify-partner-completion edge function
- Added streak badge visual evolution
- Deleted 6 dead code files (MagneticCanvas and related)

### 2024-12-09: Master Instructions Integration
- Added comprehensive engineering standards via MASTER-INSTRUCTIONS.md
- Created compliance tracking via COMPLIANCE-CHECKLIST.md
- Established this PROJECT_NOTES.md for running decisions

### 2024-12-09: Loading Indicator Enhancement
- Added subtle top loading bar during page transitions
- Uses Framer Motion for smooth scaleX animation
- Primary color at 60% opacity for subtlety

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

### Premium/Subscription
- `couples.premium_expires_at` - Premium status tracking
- `couples.stripe_customer_id` - Stripe integration

### Push Notifications
- `push_subscriptions` - Web push subscription data

### Analytics
- `user_analytics_events` - Session-based event tracking
- `user_feedback` - Contextual feedback collection

---

## Environment Variables

### Required (Auto-configured by Lovable Cloud)
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`

### Edge Function Secrets
- `LOVABLE_API_KEY` - For Lovable AI synthesis
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

---

## Known Issues

1. **Safari iOS**: Some animations may jitter on older devices
2. **PWA**: Service worker needs update for offline ritual viewing
3. **Email**: Some transactional emails may hit spam filters
4. **Push Notifications**: VAPID auth implementation may need refinement for all browsers

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
