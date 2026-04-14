# Scriva

**Write.**

Open-source, AI-native book writing, editing, and publishing.

## Features

- Distraction-free editor with paper and study (dark) themes
- AI-powered polish, critique, and continue-writing tools
- Side-by-side split view for reference material and diff review
- Structured outline with drag-and-drop chapter management
- Full-text manuscript search
- Galley preview for print-ready reading
- Export to Markdown, PDF, and EPUB
- GitHub-based collaboration with PR reviews
- Voice guide and style analysis
- Keyboard-first workflow with focus mode

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Editor**: Tiptap (ProseMirror)
- **AI**: Anthropic Claude (Haiku / Sonnet)
- **Styling**: CSS variables with Tailwind utilities
- **Fonts**: Literata (prose), Inter (UI), JetBrains Mono (code)
- **State**: Zustand with localStorage persistence
- **Collaboration**: GitHub API via Octokit

## Getting Started

```bash
npm install
```

Add your API keys in the app settings or via environment variables:

```
ANTHROPIC_API_KEY=sk-ant-...
GITHUB_TOKEN=ghp_...
```

Then run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## License

MIT — see [LICENSE](./LICENSE).

## Links

- [openscriva.com](https://openscriva.com) (coming soon)
