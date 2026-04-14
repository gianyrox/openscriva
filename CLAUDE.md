# OpenScriva

Open-source, AI-native book writing application. Every user forks this repo into their own GitHub account, and their fork becomes a private "writing room" that holds both the app code and every book, essay, poem, journal, or page they write.

## Stack

- **Framework**: Next.js 16 (App Router, Turbopack)
- **Editor**: Plate.js v52 (ProseMirror-based rich text)
- **AI**: Anthropic Claude (Haiku / Sonnet) via BYO API key
- **State**: Zustand 5 with localStorage persistence
- **Storage**: GitHub repos via Octokit (manuscripts as markdown)
- **Auth**: GitHub OAuth via a GitHub App (repo access, not user accounts)
- **Analytics**: PostHog
- **Styling**: Tailwind CSS 3, CSS custom properties for theming
- **Language**: TypeScript (strict mode)

## Quick start

```bash
git clone https://github.com/gianyrox/openscriva.git
cd openscriva
cp .env.example .env.local       # fill in your own values
npm install
npm run dev                       # http://localhost:3000
```

## Project structure

```
app/                  # Next.js App Router pages and API routes
  api/                # API route handlers (GitHub OAuth, AI, export)
  book/               # Book editor pages
  shelf/              # Book shelf (library) page
  setup/              # Onboarding / API key setup wizard
components/
  editor/             # Plate.js editor components
  rightpanel/         # AI chat, notes, and review panels
  setup/              # Setup flow components
  shared/             # Reusable UI components
  shelf/              # Shelf components
  shell/              # App shell (header, layout chrome)
  sidebar/            # Left sidebar (chapter nav, outline)
lib/                  # Core business logic (no React)
  anthropic.ts        # Claude API client
  contextCompiler.ts  # Builds AI context from manuscript state
  github.ts           # GitHub API wrapper (Octokit)
  keys.ts             # API key management (encrypted cookies)
  storage.ts          # Manuscript read/write via GitHub
  markdown.ts         # Markdown <-> Plate serialization
  room.ts             # Fork-as-room logic
store/
  index.ts            # Zustand store (editor state, panels, preferences)
types/
  index.ts            # Shared TypeScript types
```

## Commands

```bash
npm run dev           # Start dev server (Turbopack)
npm run build         # Production build
npm run lint          # ESLint via next lint
bash scripts/check-secrets.sh --ci   # Secret scanner (required before every commit)
```

## Architecture

### Fork-as-room

When a user connects their GitHub account, the app forks `gianyrox/openscriva` into their personal account, marks the fork private, and treats it as their writing room. Books live in `books/<slug>/` and pages live in `pages/<slug>.md`. Every save commits back to the user's fork. See `lib/room.ts`.

### Editor

Plate.js (ProseMirror) rich text editor. Markdown is the source of truth — content is serialized to/from markdown for GitHub storage. Editor components live in `components/editor/`.

### AI

BYO API key model — users provide their own Anthropic API key, stored encrypted in an httpOnly cookie (`scriva-keys`). The AI is context-aware: `lib/contextCompiler.ts` assembles manuscript context (current chapter, world model, voice profile, narrative state) before sending to Claude.

### Storage

GitHub repositories are the storage backend. Each user has a fork of this repo. Chapters are markdown files. All read/write goes through `lib/github.ts` and `lib/storage.ts` using Octokit.

### Themes

Two themes: Paper (light) and Study (dark). Controlled by `data-theme` attribute on `<html>`. Themed via CSS custom properties in `globals.css`.

## Conventions

- **Named function expressions** throughout (not arrow functions)
- **CSS variables for theming** — all colors use `var(--color-*)` from `globals.css`
- **Path alias**: `@/*` maps to project root
- **Server components by default** — only add `"use client"` when React hooks or browser APIs are needed
- **API keys never hit the server** — all AI calls are made client-side with the user's own key
- **Secrets never go in commits** — pre-commit hook at `scripts/check-secrets.sh` blocks common patterns. CI runs gitleaks + the local scanner on every push.

## Environment variables

See `.env.example` for the full list. Minimum required:

- `ENCRYPTION_KEY` — 64-hex cookie encryption key. Generate with `openssl rand -hex 32`.
- `GITHUB_APP_ID`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GITHUB_APP_SLUG` — your own GitHub App for OAuth
- `ANTHROPIC_API_KEY` — server-side fallback (users supply their own in the UI)

`NEXT_PUBLIC_POSTHOG_KEY` and `NEXT_PUBLIC_POSTHOG_HOST` are optional.

## Contributing

See `CONTRIBUTING.md`. TL;DR:
1. Fork, branch off `main`
2. `npm run lint && npm run build && bash scripts/check-secrets.sh --ci` all clean before pushing
3. Conventional commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`
4. Open a PR. CI will run the same checks.

## Security

Report vulnerabilities to `security@agfarms.dev`. See `SECURITY.md`.

## License

MIT. See `LICENSE`.
