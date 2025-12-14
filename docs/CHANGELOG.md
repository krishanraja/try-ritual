# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## v1.6.4 (Branded Loading & Viewport Fixes)
**Date**: 2025-12-14

### ✨ UX Improvements

#### Branded Loading Experience
- **New Component**: `RitualSpinner.tsx` - Branded loading spinner using the Ritual icon
  - Replaces generic Loader2/Sparkles icons throughout the app
  - Animated with subtle pulse, scale, and rotating gradient ring
  - Available in multiple sizes: xs, sm, md, lg, xl
  - Optional loading text display

#### Favicon & PWA Improvements
- **Fixed**: Favicon now consistently displays across all browsers
  - Added `manifest.json` for PWA support with proper icon sizes
  - Multiple favicon formats: PNG (512x512, 192x192), ICO fallback
  - Apple touch icon for iOS home screen
- **Updated**: `index.html` with comprehensive icon link tags

#### Component Updates
- **SplashScreen.tsx**: Now features the branded Ritual icon with animated pulse and rotating gradient ring
- **Memories.tsx**: Uses branded RitualSpinner for loading state, branded icon for empty state
- **Landing.tsx**: Replaced generic spinning border with RitualSpinner
- **SynthesisAnimation.tsx**: Uses branded Ritual icon instead of generic Sparkles
- **WaitingForPartner.tsx**: Animated branded icon replaces Clock icon

### 🔧 Mobile Viewport Fixes

#### Memories Page
- **Fixed**: Empty state now fits within mobile viewport without scrolling
  - Reduced padding and spacing for compact layout
  - Flex layout ensures content centers within available space
  - Container dynamically switches between scrollable (with content) and fixed (empty state)
- Empty state uses branded Ritual icon instead of generic Sparkles

### 🔧 Files Changed
- `public/manifest.json` (new)
- `src/components/RitualSpinner.tsx` (new)
- `index.html`
- `src/components/SplashScreen.tsx`
- `src/components/SynthesisAnimation.tsx`
- `src/components/WaitingForPartner.tsx`
- `src/pages/Memories.tsx`
- `src/pages/Landing.tsx`

---

## v1.6.3 (SEO & Content Marketing)
**Date**: 2025-12-13

### 🔍 SEO Infrastructure

#### FAQ Page (`/faq`)
- SEO-optimized FAQ page with 20+ questions targeting high-volume keywords
- FAQ Schema markup for Google rich snippets
- Categories: Getting Started, Features, Relationship Tips, Technical, Pricing
- Search and filter functionality
- Accessible from Profile settings (non-intrusive)

#### Blog System (`/blog`)
- Full blog with article listings and individual article pages
- Article Schema markup for Google Search
- 6 initial articles targeting valuable keywords:
  - "50 Weekly Rituals for Couples That Actually Work"
  - "How to Keep Your Relationship Exciting: 15 Science-Backed Strategies"
  - "75 Best Date Ideas in London for Every Type of Couple"
  - "How to Build Relationship Traditions That Last a Lifetime"
  - "60 Best Date Ideas in Sydney for Couples"
  - "The Science of Couple Rituals: What Research Tells Us"
- Social sharing (Twitter, LinkedIn, Facebook)
- Related articles suggestions
- Category filtering and search

#### Structured Data (index.html)
- Organization schema for brand identity
- WebApplication schema for app stores
- SoftwareApplication schema for discovery
- WebSite schema with SearchAction for site links

#### Updated Files
- `sitemap.xml` - All pages including blog articles
- `robots.txt` - Enhanced with AI crawler rules, social media bots
- Profile footer - Added FAQ link, updated version

### 🔧 Technical
- New data files: `faqData.ts`, `blogData.ts`
- New pages: `FAQ.tsx`, `Blog.tsx`, `BlogArticle.tsx`
- Routes added to `App.tsx`
- Markdown-like content renderer for blog articles

---

## v1.6.2 (Loading Experience Polish)
**Date**: 2025-12-13

### ✨ UX Improvements

#### Coordinated Loading Experience
- **New Component**: `SplashScreen.tsx` - React-controlled splash screen that coordinates with data loading
- Splash screen now stays visible until CoupleContext has finished loading all data
- Smooth fade transition from splash to content - no jarring cuts
- Elements appear all at once in a coordinated reveal

#### Layout Stability (No More Layout Shift)
- **AppShell.tsx**: Removed entry animations from header and navigation
  - Header/nav now render instantly without sliding in
  - Prevents elements from moving as page loads
- **StreakBadge.tsx**: Removed `initial={{ scale: 0 }}` animation
  - Badge now uses CSS transitions only on hover
  - Shows skeleton while loading, then reveals stably
- **App.tsx**: Removed PageTransition wrapper - animations now only on route changes
- **index.html**: Updated native splash with consistent gradient background

#### Technical Details
- Splash screen listens to `loading` state from CoupleContext
- Native HTML splash removed by React component on mount
- Content rendered but invisible (`opacity: 0`) until splash fades
- `AnimatePresence` set to `initial={false}` to prevent first-load animations
- LazyFallback now uses `h-full` with `bg-gradient-warm` for consistency

### 🔧 Files Changed
- `src/components/SplashScreen.tsx` (new)
- `src/App.tsx`
- `src/main.tsx`
- `src/components/AppShell.tsx`
- `src/components/StreakBadge.tsx`
- `index.html`

---

## v1.6.1 (Production Readiness Audit)
**Date**: 2025-12-13

### 🔒 Security & Stability
- Full production readiness audit completed
- All edge functions verified for proper authentication and authorization
- RLS policies confirmed secure across all tables

### 🐛 Bug Fixes

#### Navigation & UX
- **NotFound.tsx**: Complete redesign with proper React Router navigation, back button, and consistent branding
- **Memories.tsx**: Fixed `window.location.href` → React Router `navigate()` for SPA behavior
- **Memories.tsx**: Added auth redirect for unauthenticated users
- **Memories.tsx**: Added empty state for users without a couple
- **Profile.tsx**: Added contact link to footer, updated version to v1.6.0

#### Data Flow & Error Handling
- **RitualCards.tsx**: Fixed potential null reference error in realtime subscription when `currentCycle` is undefined
- **CardDrawInput.tsx**: Added null safety checks for `user` and `couple` in useEffect hooks
- **CardDrawInput.tsx**: Added error logging for realtime subscription failures
- **EnhancedPostRitualCheckin.tsx**: Simplified notes step UX - removed duplicate buttons with same action

#### Loading States
- **Memories.tsx**: Improved loading state with proper spinner and message
- All pages now have consistent loading indicators

### ✅ Verified Security
- All 12 edge functions audited for:
  - Proper JWT authentication
  - Authorization checks (user belongs to couple)
  - Input validation
  - Error handling with context
  - Rate limiting where applicable
- `send-push`: Requires internal secret header (function-to-function only)
- `delete-account`: Proper cascade cleanup of all user data
- `nudge-partner`: Rate limiting (1/hour, weekly limit for free users)
- `synthesize-rituals`: Structured logging with request IDs

### 📝 Documentation
- Updated version to v1.6.1
- Updated COMPLIANCE-CHECKLIST.md with audit results
- Updated CHANGELOG.md with full audit findings

### 🔧 Technical
- Updated CoupleContext version to v5 for deployment verification
- `usePremium.canUploadPhotos` now correctly returns `true` for all users
- Build passes without TypeScript errors

---

## v1.6.0 (Ritual Experience Redesign)
**Date**: 2025-12-11

### 🎉 Major Features

#### Card Draw Input (Replaces QuickInput)
- **New Component**: `CardDrawInput.tsx` - Tap-based mood card selection
- 12 beautifully designed mood cards with emojis, labels, and gradient colors
- Max 5 selections per user
- Real-time partner progress display ("Partner picked X cards")
- ~30 second completion time (same as before, more engaging)

#### Photo Memories
- **New Component**: `PhotoCapture.tsx` - Client-side image compression & upload
- Storage bucket `ritual-photos` with proper RLS policies
- Photos compressed to ~500KB before upload
- Upload progress indicator with preview
- Integrated into post-ritual check-in flow

#### Memories Gallery (Replaces History)
- **New Page**: `Memories.tsx` - Polaroid-style memory grid
- Photo display with gradient fallback
- Rating hearts, tradition badges, partner reactions
- Stats summary: total rituals, streak, traditions, photos
- Empty state with encouraging message

#### Partner Reactions
- **New Table**: `memory_reactions` with RLS policies
- **New Component**: `MemoryReactions.tsx` - Emoji reaction picker
- 5 reaction options: ❤️ 🔥 😍 🥹 👏
- Real-time reaction display on memory cards

#### Partner Notifications
- **New Edge Function**: `notify-partner-completion` - Triggers on ritual completion
- **Updated**: `send-push` now sends actual web push notifications
- Uses VAPID keys for push authentication
- Auto-cleanup of expired subscriptions

#### Streak Badge Evolution
- Visual progression based on streak length:
  - Week 1: 🌱 Seedling
  - Week 2-3: 🌿 Growing
  - Week 4-7: 🔥 On Fire
  - Week 8+: 💎 Legendary
- Hover/tap to see badge name

### 🗑️ Removed (Dead Code Cleanup)
- `MagneticCanvas.tsx` - Unused experimental input
- `MagneticInput.tsx` - Unused page
- `EmotionalToken.tsx` - Only used by MagneticCanvas
- `PartnerGhost.tsx` - Only used by MagneticCanvas
- `useMagneticSync.ts` - Only used by MagneticCanvas
- `magneticCanvas.ts` types - Only used by above
- `History.tsx` - Replaced by Memories.tsx

### 🔧 Technical Changes
- Updated `synthesize-rituals` to accept card-based input format
- Navigation: `/history` → `/memories`
- Added `memory_reactions` table with full CRUD RLS
- Added `ritual-photos` storage bucket with couple-scoped RLS

### 📊 Database Changes
- **New Table**: `memory_reactions` (id, memory_id, user_id, reaction, created_at)
- **New Storage**: `ritual-photos` bucket (public, 5MB limit, image types only)
- **Deprecated**: `weekly_cycles.canvas_state_one/two`, `sync_completed_at` (documented as legacy)

---

## v1.5.0 (UX Stability Overhaul)
**Date**: 2025-12-11

### Fixed
- **Sign-out redirect**: Users now return to branded landing page (`/`) instead of unbranded `/auth` page
- **Accidental couple creation**: CreateCoupleDialog now requires explicit user confirmation before creating a couple record
- **Race condition**: Added `coupleLoading` state to prevent random homepage flashing during auth/couple data loading

### Added
- Two-step confirmation flow in CreateCoupleDialog (preview → confirm → share)
- "Cancel this space" option on Waiting for Partner screen for users who created a couple by accident
- Debug logging for loading state transitions in CoupleContext
- Branded `/auth` page with RitualLogo

### Changed
- CreateCoupleDialog no longer auto-creates couple on dialog open
- Improved messaging on Waiting for Partner screen
- Auth page now has consistent branding with rest of app

### UX Improvements
- Clear escape hatch for accidentally created couples
- Explicit user consent required before any data is written
- Consistent branding across all pages

---

## v1.4.1 (Security Audit)
**Date**: 2025-12-09

### Security Fixes
- **Fixed:** Partner profile email exposure - Frontend now only fetches `id` and `name` columns
- **Fixed:** Surprise rituals INSERT policy - Restricted to `service_role` only
- **Fixed:** Added UPDATE policy for `push_subscriptions` table
- **Fixed:** Added DELETE policy for `ritual_streaks` table
- **Fixed:** Added DELETE policy for `ritual_suggestions` table
- **Fixed:** Added DELETE policy for `weekly_cycles` (empty cycles only)
- **Fixed:** Anonymous analytics/feedback now require authentication (user_id NOT NULL)

### Added
- `docs/MASTER-INSTRUCTIONS.md` - Comprehensive engineering standards
- `docs/PROJECT_NOTES.md` - Running decisions and technical debt tracker
- `docs/COMPLIANCE-CHECKLIST.md` - Standards compliance tracking
- `PartnerProfile` type for secure partner data access
- `get_partner_name()` database function for secure partner name lookup
- Page transition loading indicator (subtle top bar animation)

### Changed
- CoupleContext now uses `PartnerProfile` type to prevent email exposure
- Updated docs/README.md with links to new documentation
- Auth settings: auto-confirm email enabled, anonymous users disabled

### Technical
- All RLS policies audited and updated
- Edge functions verified for proper authentication
- Structured logging confirmed in all edge functions

---

## v1.4 (UX Overhaul)
**Date**: 2025-12-02

### Added
- Profile page with couple code management and settings
- Inline notification system replacing generic toasts across entire app:
  - `InlineNotification` component for contextual feedback
  - `NotificationContainer` wrapper for state management
- Database optimizations:
  - Unique constraint on `weekly_cycles (couple_id, week_start_date)`
  - Index `idx_weekly_cycles_incomplete` for faster queries
  - Index `idx_ritual_memories_highly_rated` for highly-rated memories
- TypeScript type definitions for database tables (`src/types/database.ts`)
- Race condition handling in cycle creation with unique constraint error handling
- Security: Enabled leaked password protection in auth settings

### Changed
- **Complete notification refactor** - Replaced toast notifications with contextual inline feedback in:
  - Profile page (location updates, couple code, leave couple)
  - QuickInput page (cycle creation, submission, errors)
  - WaitingForPartner (nudges, clear answers)
  - JoinDrawer (join validation, success)
  - AgreementGame (coin flips, calendar downloads)
  - PostRitualCheckin (silent failures, no blocking toasts)
  - RitualPicker (ranking, scheduling, errors)
  - RitualCards (completions, errors)
  - MagneticInput (synthesis flow)
- **CoupleContext improvements**:
  - Now uses proper TypeScript types (Couple, Profile, WeeklyCycle)
  - `leaveCouple()` returns result objects instead of showing toasts
  - Removed toast dependencies and side effects
  - Cleaner separation of concerns
- Version display updated to v1.4.0 throughout app
- Leave couple notification now visible before navigation (1.5s delay)

### Fixed
- Race condition when both partners create `weekly_cycle` simultaneously
- Duplicate weekly cycles cleaned up (5 duplicates removed)
- Leave couple notification timing issue
- Type safety improved across couple context and database interactions

### Technical
- All files migrated away from `sonner` toast library
- Result-oriented function design (return objects vs side effects)
- Database constraints prevent duplicate data at source
- Performance indexes added for common queries

---

## [1.3.0] - 2024-12-02

### Fixed
- **Critical:** Week boundary bug - Users who submitted on Sunday saw "Ready for This Week?" on Monday
  - Changed `fetchCycle()` to look for most recent incomplete cycle first
  - Falls back to week_start_date matching only if no incomplete cycle found
  - Prevents state loss across week boundaries

### Changed
- Improved `CoupleContext.tsx` cycle fetching logic
- Added defensive ordering in cycle queries

---

## [1.2.0] - 2024-11-20

### Added
- Post-ritual check-in feature
  - Prompts users after ritual time passes
  - Collects completion status, rating, notes
  - Saves to ritual_feedback and ritual_memories
  - Updates streak tracking

- Streak tracking
  - Current streak counter
  - Longest streak record
  - Visual badge on Home page

- ICS calendar download
  - Generate .ics file for agreed rituals
  - Compatible with Apple Calendar, Google Calendar, Outlook

### Changed
- Improved WaitingForPartner component
  - Added nudge functionality
  - Better visual feedback
  - Partner name personalization

---

## [1.1.0] - 2024-11-10

### Added
- Agreement Game for ritual selection when no overlap
  - Shows partner's top 3 choices
  - One-click selection to reach agreement
  - Smooth transition to scheduled state

- Ritual swap feature in picker
  - "Not Feeling It" button on each ritual card
  - AI generates single replacement ritual
  - Uses same constraints as main synthesis

- Location awareness in AI synthesis
  - City, season, time-of-day context
  - Timezone-aware ritual suggestions
  - Northern/Southern hemisphere handling

### Changed
- Upgraded synthesis to use historical data
  - Avoids repeating completed rituals
  - Leans into highly-rated themes
  - Incorporates user reflections

- Improved RitualPicker UI
  - Carousel navigation
  - Voting interface with rank selection
  - Date/time picker integration

---

## [1.0.0] - 2024-11-01

### Added
- Core application features:
  - User authentication (email/password)
  - Couple creation and joining with 6-digit codes
  - Weekly input flow (2-minute sync)
  - AI ritual generation (4-5 options)
  - Ritual voting and agreement
  - Ritual scheduling
  - History view
  - Profile management

- Database schema:
  - profiles, couples, weekly_cycles
  - ritual_preferences, completions
  - ritual_feedback, ritual_memories
  - ritual_streaks, ritual_suggestions
  - ritual_library

- Edge functions:
  - synthesize-rituals (AI generation)
  - nudge-partner (reminder system)

- Realtime features:
  - Partner synchronization
  - Live status updates
  - Toast notifications

- UI/UX:
  - Mobile-first design
  - Warm gradient theme
  - Framer Motion animations
  - Magnetic canvas input
  - Celebration screens

### Technical Stack
- React 18.3.1
- Vite build tool
- TypeScript
- Tailwind CSS
- Supabase (Lovable Cloud)
- Lovable AI (Gemini)

---

## Development Milestones

### Phase 1: Prototype (October 2024)
- Basic concept validation
- Manual ritual generation
- Single-user flow

### Phase 2: Alpha (November 2024)
- Multi-user couples support
- AI integration
- Database design
- Realtime sync

### Phase 3: Beta (November 2024)
- Public testing
- Bug fixes
- UX refinement
- Performance optimization

### Phase 4: Launch (December 2024)
- Production deployment
- Documentation
- Marketing site
- Support channels

---

## Known Issues

### Resolved in v1.6.1
- [x] Missing loading skeletons - Added to Memories and other pages
- [x] Navigation can feel unintuitive in some edge cases - Fixed routing inconsistencies
- [x] Photo upload - Implemented in v1.6.0

### Medium Priority
- [ ] No error boundaries (graceful React error handling)
- [ ] synthesized_output structure inconsistent in old cycles
- [ ] No onboarding tutorial for new users

### Low Priority
- [ ] No dark mode
- [ ] Limited desktop optimization
- [ ] ESLint warnings (mostly @typescript-eslint/no-explicit-any)

---

## Upcoming Features

### v1.4 (Q1 2025)
- [ ] Fix all Critical bugs from UX audit
- [ ] Add database constraints
- [ ] Implement better notification system
- [ ] Add loading skeletons
- [ ] Simplify state management

### v1.5 (Q2 2025)
- [ ] Onboarding tutorial
- [ ] Photo upload for memories
- [ ] Push notifications
- [ ] Native calendar sync
- [ ] Improved ritual suggestions

### v2.0 (Q3 2025)
- [ ] Habit tracking dashboard
- [ ] AI-powered proactive suggestions
- [ ] Social features (optional sharing)
- [ ] Ritual templates
- [ ] Advanced analytics

---

## Breaking Changes

### v1.3.0
- Changed `fetchCycle()` behavior - now prioritizes incomplete cycles
  - **Impact:** Low - improves reliability
  - **Migration:** None required

### v1.2.0
- Added required `ritual_feedback` and `ritual_streaks` tables
  - **Impact:** Medium - requires database migration
  - **Migration:** Automatic via Lovable Cloud

### v1.0.0
- Initial release
  - **Impact:** N/A
  - **Migration:** N/A

---

## Deprecations

### v1.3.0
- `couples.synthesis_ready` flag - No longer used (TODO: remove)
- `weekly_cycles.canvas_state_one/two` - Legacy magnetic canvas state
- `weekly_cycles.sync_completed_at` - No longer used

---

## Security Updates

### v1.2.0
- Enhanced RLS policies for ritual_feedback
- Added rate limiting to nudge-partner

### v1.0.0
- Row Level Security enabled on all tables
- JWT authentication required for all edge functions
- Secure couple code generation (excludes ambiguous chars)

---

## Performance Improvements

### v1.3.0
- Optimized cycle fetching with composite query
- Reduced unnecessary realtime subscriptions

### v1.1.0
- Added database indexes on frequently queried columns
- Implemented query result caching

### v1.0.0
- Lazy loading for routes
- Optimized bundle size (~150KB gzipped)
- Efficient Framer Motion animations

---

## Contributors

- **Lead Developer:** [Your Name]
- **AI Partnership:** Lovable AI
- **Beta Testers:** [List beta testers]

---

For questions or detailed release notes, see the [GitHub Releases](https://github.com/yourorg/ritual/releases) page.
