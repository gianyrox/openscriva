# CLAUDE.md

## What This Is

Scriva is an open-source, AI-native book writing application. Manuscripts live in GitHub repos as markdown files.

## Stack

- **Framework**: Next.js 16 (App Router, Turbopack)
- **Editor**: Plate.js v52 (ProseMirror-based rich text)
- **AI**: Anthropic Claude (Haiku / Sonnet) via BYO API key
- **State**: Zustand 5 with localStorage persistence
- **Storage**: GitHub repos via Octokit (manuscripts as markdown)
- **Auth**: GitHub OAuth (repo access, not user accounts)
- **Analytics**: PostHog (proxied through Next.js rewrites), Vercel Analytics
- **Styling**: Tailwind CSS 3, CSS custom properties for theming
- **Language**: TypeScript (strict mode)
- **Fonts**: Literata (prose), Inter (UI), JetBrains Mono (code)

## Project Structure

```
app/                  # Next.js App Router pages and API routes
  api/                # API route handlers (GitHub OAuth, AI, export)
  book/               # Book editor page
  shelf/              # Book shelf (library) page
  setup/              # Onboarding / API key setup
components/
  editor/             # Plate.js editor components
  editors/            # Editor variants
  rightpanel/         # AI chat, notes, and review panels
  setup/              # Setup flow components
  shared/             # Reusable UI components
  shelf/              # Book shelf components
  shell/              # App shell (header, layout chrome)
  sidebar/            # Left sidebar (chapter nav, outline)
  collab/             # Collaboration features (branches, PRs)
lib/                  # Core business logic (no React)
  anthropic.ts        # Claude API client
  contextCompiler.ts  # Builds context for AI from manuscript state
  github.ts           # GitHub API wrapper (Octokit)
  keys.ts             # API key management (encrypted localStorage)
  storage.ts          # Manuscript read/write via GitHub
  markdown.ts         # Markdown <-> Plate serialization
  voiceDna.ts         # Voice profile analysis
  worldModel.ts       # Story world model extraction
  narrativeState.ts   # Narrative continuity tracking
  rag.ts              # Retrieval-augmented generation for manuscripts
  indexer.ts          # Manuscript content indexing
  draftBranch.ts      # Git branch management for drafts
  diff.ts             # Diff utilities for merge/review
store/
  index.ts            # Zustand store (editor state, panels, preferences)
types/
  index.ts            # Shared TypeScript types
  scriva.ts           # Domain-specific types
public/               # Static assets (fonts, images, icons)
```

## Key Commands

```bash
npm run dev           # Start dev server (Turbopack)
npm run build         # Production build
npm run lint          # ESLint via next lint
```

There are no tests yet. Playwright is in devDeps but unused.

## Architecture

### State Management

Zustand store at `store/index.ts` with `persist` middleware. Persists to localStorage under key `"scriva-store"`. Persisted fields: panels, preferences, currentBook, draftBranch. Theme is applied before hydration via an inline script in `app/layout.tsx`.

### Editor

Plate.js (ProseMirror) rich text editor. Markdown is the source of truth -- content is serialized to/from markdown for GitHub storage. Editor components live in `components/editor/`.

### AI

BYO API key model -- users provide their own Anthropic API key, stored encrypted in localStorage. The AI is context-aware: `lib/contextCompiler.ts` assembles manuscript context (current chapter, world model, voice profile, narrative state) before sending to Claude. Supports Haiku and Sonnet models.

### Storage

GitHub repositories are the storage backend. Each book is a repo. Chapters are markdown files. All read/write goes through `lib/github.ts` and `lib/storage.ts` using Octokit. Draft branches (`lib/draftBranch.ts`) provide version control. No server-side database.

### Auth

GitHub OAuth for repository access. Not a user account system -- the app needs repo permissions to read/write manuscript files. OAuth flow handled in `app/api/`.

### Themes

Two themes: Paper (light) and Study (dark). Controlled by `data-theme` attribute on `<html>`. Themed via CSS custom properties in `globals.css`, not Tailwind theme config. Theme preference persisted in Zustand store.

## Key Files

| File | Purpose |
|------|---------|
| `app/layout.tsx` | Root layout, font loading, theme hydration script |
| `app/book/page.tsx` | Main editor page |
| `app/page.tsx` | Landing page |
| `store/index.ts` | Global Zustand store |
| `lib/anthropic.ts` | Claude API client |
| `lib/contextCompiler.ts` | Builds AI context from manuscript |
| `lib/github.ts` | GitHub API wrapper |
| `lib/storage.ts` | Manuscript storage layer |
| `lib/keys.ts` | Encrypted API key management |
| `lib/markdown.ts` | Markdown serialization |
| `components/editor/` | Plate.js editor setup and plugins |
| `types/index.ts` | Shared type definitions |

## Conventions

- **Named function expressions** throughout the codebase (not arrow functions). Example: `function setChapter(chapterId) { ... }` rather than `(chapterId) => { ... }`.
- **CSS variables for theming** -- all colors use `var(--color-*)` from `globals.css`, not Tailwind theme extensions.
- **Inline styles on landing page** -- `app/page.tsx` has legacy inline styles that should eventually migrate to Tailwind.
- **Path alias**: `@/*` maps to project root (e.g., `@/lib/github`, `@/store`).
- **No tests yet** -- Playwright is in devDeps but no test files exist.
- **Server components by default** -- only add `"use client"` when React hooks or browser APIs are needed.
- **API keys never hit the server** -- all AI calls are made client-side with the user's own key.

## Beads (Task Tracking)

Task tracking uses a hosted Nucleus API, not a local `bd` CLI. See `.nucleus/config.json` for the API URL if present.
