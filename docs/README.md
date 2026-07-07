# OpenScriva docs

Writer-facing documentation for OpenScriva — the open-source, AI-native writing environment where your book lives in your own GitHub repo and the AI already knows your characters, your citations, and your voice.

## Start here

- **[Getting started](./onboarding.md)** — the first-run path for a new writer. Connect GitHub, add your Anthropic key, pick a writing type, make your first move, and meet the structured "mind" without being overwhelmed.
- **[Template library](./templates.md)** — start from a scaffolded structure instead of a blank page. Six starter templates (novel, short story, how-to, serial, screenplay, worldbuilding bible), plus the seed-file format and how templates are stored.
- **[FAQ](./faq.md)** — the questions writers ask first: what the AI costs on your own key, where your manuscript lives and whether it's private, and what's Free vs Pro.

## How OpenScriva is built

Three commitments define the product:

1. **Your GitHub repo is the backend.** Every book lives in a private fork you own; every save is a git commit.
2. **The AI is bring-your-own-key and runs in your browser.** Your manuscript and your key never touch an OpenScriva server.
3. **Your book has a structured "mind."** Characters, world, plot, voice, and citations live as plain JSON in your repo and feed the AI before every call, so it stays consistent with your book.

## What's live vs. roadmap

- **Live now:** editor, autosave + git history, the full AI loop, the structured mind, EPUB/PDF/markdown export, galley preview.
- **v1.5:** hosted publishing to a public URL, custom domains, reader analytics; async collaboration and the Studio tier. Template one-click seeding (the picker + `scaffoldFromTemplate`) also lands here — see [templates.md](./templates.md).
- **v2:** real-time co-editing, margin comments, and auto-population of the world model from your prose.
