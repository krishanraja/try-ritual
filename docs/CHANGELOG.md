# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased]

### Added - v1.4 (UX Overhaul - 2024-12-02)
- Comprehensive project documentation in `/docs` folder:
  - README.md (project overview, purpose, mission, vision)
  - ARCHITECTURE.md (technical stack, database schema, edge functions)
  - USER-FLOWS.md (journey diagrams, state machines)
  - DESIGN-SYSTEM.md (colors, typography, components)
  - ERROR-PATTERNS.md (lessons learned, prevention strategies)
  - DATABASE.md (complete schema documentation)
  - API.md (edge function documentation)
  - HANDOFF.md (developer guide)
  - SECURITY.md (RLS policies, auth flow)
  - ROADMAP.md (future features)
- `InlineNotification` component for contextual user feedback
- `NotificationContainer` wrapper component for notification state management
- Database unique constraint on `weekly_cycles (couple_id, week_start_date)`
- Performance indexes:
  - `idx_weekly_cycles_incomplete` for faster incomplete cycle queries
  - `idx_ritual_memories_highly_rated` for high-rated memories (rating >= 4)

### Changed
- **Profile Page**: Replaced all toast notifications with inline feedback system
  - Location updates: Show inline success/error messages (3s auto-dismiss for success)
  - Code copying: Show inline confirmation instead of toast
  - Leave couple errors: Display contextual error messages
- **CoupleContext**: 
  - Updated `leaveCouple()` to return `{ success: boolean; error?: string }` instead of showing toasts
  - Removed sonner toast dependency
  - Removed navigation toasts (partner joined, rituals ready)
- **Profile handleLeaveCouple**: Now consumes result object and shows inline notification

### Fixed
- **Database integrity**: Cleaned up 5 duplicate weekly_cycles records
- **Data constraints**: Prevented future duplicate cycles with unique constraint
- **UX Pattern**: Eliminated toast notification fatigue by moving to contextual feedback

### Removed
- All toast notifications from Profile page
- Sonner toast dependency from CoupleContext
- Auto-dismissing toasts for user-initiated actions

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
