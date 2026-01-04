# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Planned
- React Query deeper integration
- Presence tracking (partner online status)
- Offline support with IndexedDB
- Performance monitoring
- Voice-first ritual selection

---

## [1.8.0] - 2026-01-04

### Fixed - Multiplayer Sync & Great Minds UX Overhaul

This release permanently fixes the multiplayer synchronization issues and completely overhauls the "Great Minds" matching screen.

#### Critical Bug Fixes

1. **Stale Cache/Ghost UI** (`public/sw.js`)
   - Updated service worker to v4 with new BUILD_ID tracking
   - Added `GET_VERSION` and `FORCE_UPDATE` message handlers
   - Faster polling interval (3s vs 5s) for synthesis status

2. **Both Partners Hang After Submitting** (`src/hooks/useRitualFlow.ts`)
   - Added Universal Sync mechanism that runs in ALL phases (every 8s)
   - Detects state drift between partners and syncs from server
   - Added `forceSync()` action for manual recovery
   - Prevents race conditions when both submit simultaneously

3. **Card Cutoff on Great Minds Screen** (`src/components/ritual-flow/MatchPhase.tsx`)
   - Fixed flex container hierarchy for proper safe-area handling
   - Added `pt-safe-top` and `pb-safe` for notched devices
   - Changed to `overflow-x-hidden` to prevent animation clipping

#### New Features

1. **Ritual Selector Carousel** (`MatchPhase.tsx`)
   - When multiple rituals match, users can swipe/navigate between them
   - Shows "Match 1 of 3" badge with navigation arrows
   - Animated transitions between ritual cards

2. **Time Slot Picker** (`MatchPhase.tsx`)
   - Navigate between overlapping time slots with arrows
   - Expand to pick specific 1-hour slot within time band
   - Morning: 8-11 AM, Afternoon: 12-4 PM, Evening: 5-9 PM

3. **Picker Rotation** (`useRitualFlow.ts`, `MatchPhase.tsx`)
   - One partner picks the final time slot each week
   - Rotates automatically based on `last_slot_picker_id` on couples table
   - Non-picker sees "Partner will pick the exact time this week"

4. **Database Schema Updates** (`supabase/migrations/20260104000000_add_slot_picker_rotation.sql`)
   - `couples.last_slot_picker_id` - Tracks who picked last
   - `weekly_cycles.slot_picker_id` - Designated picker for this cycle
   - `weekly_cycles.slot_selected_at` - When slot was confirmed

#### Files Modified
- `public/sw.js` - Version tracking and force update
- `src/hooks/useRitualFlow.ts` - Universal sync, forceSync, overlappingSlots, isSlotPicker
- `src/components/ritual-flow/MatchPhase.tsx` - Complete UX overhaul
- `src/pages/RitualFlow.tsx` - Pass new props to MatchPhase
- `supabase/migrations/20260104000000_add_slot_picker_rotation.sql` - New schema

---

## [1.7.1] - 2026-01-03

### Fixed - Mobile Dialog & Double Loading Screen

This release permanently fixes two persistent issues that previous fixes failed to address.

#### Issue 1: Leave Couple Dialog Unusable on Mobile (6th+ Fix Attempt)

**Why Previous Fixes Failed:**
Previous "fixes" documented in v1.6.6 claimed to fix the dialog but used transform-based centering (`translate-y-[-50%]`) which:
- Doesn't recalculate when virtual keyboard appears on iOS/Android
- Positions relative to initial viewport, not visible viewport
- Conflicts with max-height constraints

**Architectural Fix Applied:**

1. **DialogContent Flexbox Centering** (`src/components/ui/dialog.tsx`)
   - Removed transform-based centering entirely on mobile
   - DialogOverlay now uses flexbox centering (`flex items-center justify-center`)
   - DialogContent is a relative element within the flex container
   - Added `overflow-hidden` for proper flex child constraint
   - Single `max-height` value using `min(calc(100vh-2rem),calc(100dvh-2rem))`
   - Safe-area-inset padding for notched devices

2. **LeaveConfirmDialog Structure** (`src/components/LeaveConfirmDialog.tsx`)
   - Proper flex structure with `flex-shrink-0` for header/footer
   - Scrollable content area with `flex-1 min-h-0 overflow-y-auto`
   - Negative margin scrolling for full-width scroll

3. **DeleteAccountDialog Structure** (`src/components/DeleteAccountDialog.tsx`)
   - Applied same structural fixes as LeaveConfirmDialog

#### Issue 2: Double Loading Screens on Cache-Cleared Load

**Root Cause:**
Two splash screens were shown sequentially:
1. Native splash in `index.html` - "Loading your experience..."
2. React splash in `SplashScreen.tsx` - "Weekly moments, lasting connection"

The native splash was removed in `useEffect`, which runs AFTER first render, causing both to be visible simultaneously with different messages.

**Architectural Fix Applied:**

1. **SplashScreen Synchronous Removal** (`src/components/SplashScreen.tsx`)
   - Native splash now removed in `useLayoutEffect` (synchronous, before paint)
   - React splash starts with `opacity: 1` (no fade-in) for seamless transition
   - Background gradient matches native splash exactly

2. **Native Splash Visual Match** (`index.html`)
   - Updated native splash to match React splash visually
   - Same tagline: "Weekly moments, lasting connection"
   - Same loading indicator style (dots instead of text)

#### Files Modified
- `src/components/ui/dialog.tsx` - Complete rewrite of mobile centering
- `src/components/LeaveConfirmDialog.tsx` - Flex structure fixes
- `src/components/DeleteAccountDialog.tsx` - Flex structure fixes
- `src/components/SplashScreen.tsx` - useLayoutEffect for synchronous removal
- `index.html` - Native splash visual match

---

## [1.7.0] - 2026-01-03

### Fixed - Infinite Loading Screen Comprehensive Fix

This release permanently fixes the recurring issue where users get stuck on loading screens with "Creating rituals..." that never completes.

#### Root Causes Identified
- Service worker caching API responses (stale-while-revalidate)
- No timeout on synthesis pipeline
- No polling fallback when realtime fails
- No user-visible error recovery

#### Fixes Applied

1. **Service Worker - Network-First for All API Calls** (`public/sw.js`)
   - Changed from stale-while-revalidate to network-first for ALL Supabase API calls
   - Added version-based cache invalidation (cache busts on each deploy)
   - Added manual cache clearing capability via postMessage
   - Ensures users always get fresh data, with offline fallback

2. **Synthesis Timeout with Auto-Retry** (`src/hooks/useRitualFlow.ts`)
   - Added 30-second synthesis timeout
   - Auto-retries once when timeout is hit
   - Shows user-visible error when synthesis fails
   - Added polling fallback (every 5s) when realtime might be disconnected
   - Exposes `synthesisTimedOut` and `isRetrying` states to UI

3. **Landing Page Retry Button** (`src/pages/Landing.tsx`)
   - Added "Creating rituals..." card when both partners submit
   - Added timeout detection (30s) with "Taking Longer Than Expected" error state
   - Retry button allows users to manually trigger synthesis
   - Auto-triggers synthesis when both partners have submitted

4. **StatusIndicator Timeout** (`src/components/StatusIndicator.tsx`)
   - Added 30-second timeout tracking for "Creating rituals..." state
   - Shows "Tap to retry" when stuck
   - Clickable to navigate to /flow page for more options

5. **SplashScreen Progressive Feedback** (`src/components/SplashScreen.tsx`)
   - At 3s: Changes message to "Taking a moment..."
   - At 5s: Shows "Having trouble?" with Refresh/Continue buttons
   - At 8s: Shows error state with amber styling
   - At 10s: Force dismisses splash (guaranteed exit)

6. **Cache-Control Headers** (`vercel.json`)
   - `/sw.js`: no-cache, no-store, must-revalidate
   - `/index.html`: no-cache, must-revalidate
   - `/assets/*`: immutable caching (hashed filenames)

#### Files Modified
- `public/sw.js`
- `src/hooks/useRitualFlow.ts`
- `src/pages/Landing.tsx`
- `src/components/StatusIndicator.tsx`
- `src/components/SplashScreen.tsx`
- `vercel.json`

---

## [1.6.6] - 2025-01-27

### Fixed - Mobile UX & Authentication Issues

#### Infinite Loading Screen
- Added progressive timeout system to SplashScreen (3s warning, 8s critical dismissal)
- Enhanced CoupleContext loading state diagnostics with multiple safety checkpoints
- Improved error state handling for failed loads
- Added comprehensive logging to track loading state transitions

#### Submit & Continue Button Not Working
- Added comprehensive logging to submit flow (handleSubmit and submitInput)
- Fixed button z-index and pointer-events issues
- Enhanced error display with detailed error messages
- Added preventDefault/stopPropagation to prevent event propagation issues
- Improved validation error messages

#### Leave Couple Dialog Mobile UX
- Redesigned dialog for mobile-first UX
- Reduced max-width for mobile viewports (calc(100vw-2rem))
- Added flexbox layout for better scrolling behavior
- Improved input field mobile interaction (h-12, text-base)
- Enhanced countdown timer clarity with descriptive text
- Ensured buttons meet 44x44px touch target minimum
- Fixed keyboard behavior (input doesn't get covered)

#### Authentication System Audit
- Enhanced Supabase client initialization with error handling
- Added 10-second timeout to all fetch requests
- Improved CoupleContext error handling
- Added connection test utility for debugging
- Fixed Supabase key configuration issues

### Changed
- SplashScreen timeout increased from 4s to 8s with progressive warnings
- Dialog component now uses flexbox layout for better mobile scrolling
- Submit button error handling now displays errors prominently

### Files Modified
- `src/components/SplashScreen.tsx`
- `src/contexts/CoupleContext.tsx`
- `src/components/ritual-flow/InputPhase.tsx`
- `src/hooks/useRitualFlow.ts`
- `src/components/LeaveConfirmDialog.tsx`
- `src/components/ui/dialog.tsx`
- `src/integrations/supabase/client.ts`

---

## [1.6.5] - 2025-01-XX

### Fixed - Adversarial Audit Response

All fixes from the adversarial audit implemented:

1. **Synthesis Timeout** - Added MAX_POLL_ATTEMPTS = 40 (2 minutes at 3s intervals)
2. **Abandoned Input Detection** - Warning after 24+ hours, cleanup edge function
3. **Timezone Handling** - Week boundaries now use couple's timezone
4. **AI Failure Fallback** - "Browse Sample Rituals Instead" after 2+ retries
5. **Orphaned State Cleanup** - New edge function for stale cycle cleanup
6. **Prompt Injection Protection** - Sanitizes user input before AI
7. **Sample Rituals Bug** - Fixed to show real rituals when available
8. **Session Recovery** - Critical state saved to localStorage
9. **Stale Cycle Cleanup** - Detects cycles older than 7 days
10. **Error Boundaries** - React Error Boundary wraps app

### Added
- `src/components/ErrorBoundary.tsx`
- `supabase/functions/cleanup-orphaned-cycles/index.ts`

---

## [1.6.4] - 2025-12-14

### Changed - Branded Loading & Viewport Fixes

#### Branded Loading Experience
- Created `RitualSpinner` component with branded icon and animations
- Fixed favicon inconsistency across browsers with multi-format icon set
- Added `manifest.json` for PWA support
- Replaced all generic Loader2/Sparkles icons with branded spinner
- Updated SplashScreen, SynthesisAnimation, WaitingForPartner

#### Viewport Fixes
- Fixed Memories page viewport issue - empty state fits without scrolling

---

## [1.6.3] - 2025-12-13

### Added - SEO & Content Strategy

#### SEO Implementation
- FAQ Page (`/faq`) with 20+ questions and FAQ Schema for rich snippets
- Blog System (`/blog`, `/blog/:slug`) with Article Schema
- Enhanced `robots.txt` for AI crawlers and social bots
- Complete `sitemap.xml` with all pages

#### Coordinated Loading Experience
- React-controlled splash screen that waits for data before revealing
- Eliminated layout shift on page load
- Removed entry animations from AppShell (prevents shift)

### Changed
- SplashScreen now coordinates with CoupleContext.loading

---

## [1.6.2] - 2025-12-12

### Fixed - Production Readiness Audit

- Fixed navigation inconsistencies (using React Router consistently)
- Fixed NotFound page with proper branding and navigation
- Fixed Memories page with auth redirect and empty states
- Fixed null safety issues in realtime subscriptions
- Simplified EnhancedPostRitualCheckin button UX

---

## [1.6.1] - 2025-12-11

### Added - Photo Memories & Reactions

#### Photo Upload
- Client-side compression before upload (~500KB target)
- Supabase Storage integration (`ritual-photos` bucket)
- Photo preview in memory cards

#### Partner Reactions
- Single reaction per user per memory (❤️ 🔥 😍 🥹 👏)
- Realtime reaction updates
- Emotional feedback loop between partners

#### Push Notifications
- Web Push implementation with VAPID
- `notify-partner-completion` edge function
- Partner notified when ritual completed

---

## [1.6.0] - 2025-12-11

### Changed - Ritual Experience Redesign

**Major version: Input system completely redesigned**

#### Card-Based Input
- Replaced MagneticCanvas with CardDrawInput (tap-based mood cards)
- 12 mood cards: Adventure, Cozy, Deep Talk, Playful, Romantic, etc.
- Max 5 cards selected, optional desire text
- Faster input (~30s vs previous 60s+)

#### Memories Gallery
- Replaced History page with Memories gallery
- Photo grid with memory cards
- Rating, notes, and photo display
- Partner reactions visible

#### Files Removed
- `src/pages/MagneticInput.tsx`
- `src/components/MagneticCanvas.tsx`
- `src/components/EmotionalToken.tsx`
- `src/components/PartnerGhost.tsx`
- `src/hooks/useMagneticSync.ts`
- `src/types/magneticCanvas.ts`
- `src/pages/History.tsx`

---

## [1.5.0] - 2025-12-09

### Added - Loading & Onboarding

- Top loading bar during page transitions
- Master Instructions integration (MASTER-INSTRUCTIONS.md)
- Compliance tracking (COMPLIANCE-CHECKLIST.md)
- PROJECT_NOTES.md for running decisions

---

## [1.4.0] - 2025-12-XX

### Fixed - Stability Improvements

- Week boundary bug fixes with unique constraints
- Navigation logic simplification
- Loading skeletons throughout app
- Mobile performance improvements

---

## [1.3.0] - Initial Tracked Version

### Features
- Core weekly ritual cycle
- AI-powered ritual generation (Gemini)
- Partner synchronization via Supabase Realtime
- Historical learning from past rituals
- Post-ritual feedback and ratings
- Streak tracking
- Location-aware rituals (city, season, time)

---

## Migration Notes

### From v1.5.x to v1.6.x
- MagneticCanvas removed - no migration needed (was experimental)
- History page replaced with Memories - data preserved in `ritual_memories` table
- Canvas state fields deprecated (`canvas_state_one`, `canvas_state_two`)

### From v1.6.x to v1.7.x
- Service worker updated - users may need hard refresh
- New `vercel.json` cache headers - automatic on deploy

---

*For detailed implementation notes, see [docs/AGENT_HISTORY.md](docs/AGENT_HISTORY.md)*
