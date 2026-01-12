# Ritual 💕

A beautifully designed couple's ritual planning app that helps partners stay connected through meaningful weekly rituals.

## Overview

Ritual helps couples maintain strong relationships through consistent, personalized rituals. Each week, both partners submit their preferences, and AI synthesizes them into thoughtful ritual suggestions that work for both.

**Live App:** [tryritual.co](https://tryritual.co)

## Features

- **🎴 Card-Based Input** - Tap mood cards to express what you're craving (Adventure, Cozy, Romantic, etc.)
- **🤖 AI Synthesis** - Gemini 2.5 generates personalized rituals based on both partners' inputs
- **🗳️ Agreement System** - Vote on your favorites and reach consensus
- **📸 Photo Memories** - Capture and save moments from completed rituals
- **💕 Partner Reactions** - React to your partner's memory photos with emojis
- **🔥 Streak Tracking** - Build consistency with weekly streak badges
- **🔔 Push Notifications** - Get notified when your partner completes a ritual
- **📍 Location-Aware** - Rituals tailored to your city and current season

## Tech Stack

### Frontend
- **Framework:** React 18 + TypeScript
- **Build:** Vite 5
- **Styling:** Tailwind CSS + shadcn/ui components
- **Animations:** Framer Motion
- **State:** React Context + React Query
- **Routing:** React Router v6

### Backend (Supabase)
- **Database:** PostgreSQL with Row Level Security
- **Auth:** Supabase Auth (email/password, Google OAuth)
- **Realtime:** Supabase Realtime subscriptions
- **Storage:** Supabase Storage for photos
- **Edge Functions:** 14 Deno functions for backend logic

### AI
- **Provider:** Google Gemini API
- **Models:** Gemini 2.5 Pro (synthesis), Gemini 2.5 Flash (swap)

### Deployment
- **Platform:** Vercel
- **CI/CD:** Automatic on push
- **CDN:** Global edge distribution

## Quick Start

### Prerequisites
- Node.js 18+ or Bun
- Git

### Local Development

```bash
# Clone the repository
git clone <repository-url>
cd ritual

# Install dependencies
npm install

# Start development server
npm run dev
```

Visit http://localhost:5173

### Environment Variables

Create a `.env` file in the root directory:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
VITE_SUPABASE_PROJECT_ID=your-project-id
```

## Project Structure

```
ritual/
├── docs/                    # Comprehensive documentation
├── public/                  # Static assets, PWA files
├── src/
│   ├── components/          # React components
│   │   ├── ui/              # shadcn/ui base components
│   │   └── ...              # Feature components
│   ├── contexts/            # React contexts (CoupleContext)
│   ├── hooks/               # Custom hooks
│   ├── pages/               # Route pages
│   ├── utils/               # Utility functions
│   └── integrations/        # Supabase client
├── supabase/
│   ├── functions/           # Edge functions
│   └── migrations/          # Database migrations
└── package.json
```

## Documentation

| Document | Description |
|----------|-------------|
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | System architecture, patterns, tech decisions |
| [HANDOFF.md](docs/HANDOFF.md) | Developer onboarding guide |
| [DATABASE.md](docs/DATABASE.md) | Database schema, RLS policies |
| [API.md](docs/API.md) | Edge function API reference |
| [USER-FLOWS.md](docs/USER-FLOWS.md) | User journey and state machines |
| [AGENT_HISTORY.md](docs/AGENT_HISTORY.md) | AI agent session history and fixes |
| [CHANGELOG.md](CHANGELOG.md) | Version history and changes |

## Version History

- **v1.6.4** (2025-12-14) - Branded loading, viewport fixes
- **v1.6.3** (2025-12-13) - SEO, FAQ page, coordinated loading
- **v1.6.0** (2025-12-11) - Card input, photo memories, reactions
- **v1.5.0** (2025-12-09) - Loading improvements, onboarding
- See [CHANGELOG.md](CHANGELOG.md) for full history

## Recent Fixes (Jan 2026)

### Infinite Loading Screen Fix (2026-01-03)
Comprehensive fix for users getting stuck on loading screens:
- Service worker now uses network-first for API calls
- 30-second synthesis timeout with auto-retry
- Progressive splash screen timeouts (3s/5s/8s/10s)
- Polling fallback when realtime fails
- Retry buttons throughout the UI

### Authentication & Mobile UX (2025-01-27)
- Fixed Supabase key configuration issues
- Enhanced splash screen with progressive feedback
- Mobile-first dialog redesigns
- Submit button reliability improvements

See [docs/AGENT_HISTORY.md](docs/AGENT_HISTORY.md) for complete fix history.

## Scripts

```bash
npm run dev        # Start development server
npm run build      # Production build
npm run preview    # Preview production build
npm run lint       # Run ESLint
npm run test       # Run tests
```

## Contributing

1. Create a feature branch: `git checkout -b feature/my-feature`
2. Make changes and commit: `git commit -m "feat: add feature"`
3. Push and create PR: `git push origin feature/my-feature`

Follow [Conventional Commits](https://www.conventionalcommits.org/) for commit messages.

## License

Private - All rights reserved.

---

Built with ❤️ for couples everywhere.
