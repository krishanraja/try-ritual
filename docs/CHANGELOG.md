# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

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

### High Priority
- [ ] Missing loading skeletons
- [ ] No error boundaries
- [ ] Navigation can feel unintuitive in some edge cases

### Medium Priority
- [ ] synthesized_output structure inconsistent in old cycles
- [ ] No onboarding tutorial
- [ ] Partner status not always clear in all states

### Low Priority
- [ ] No dark mode
- [ ] Limited desktop optimization
- [ ] Missing push notifications
- [ ] No photo upload yet

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
