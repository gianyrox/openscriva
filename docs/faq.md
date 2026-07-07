# OpenScriva FAQ

Short answers to the questions writers ask before they trust a tool with a book. For the full walkthrough, see [Getting started](./onboarding.md).

## Cost & the API key

### Do I have to bring my own AI key?
Yes. OpenScriva runs the AI on **your** Anthropic key, from your browser. That's what keeps your manuscript private and keeps the AI free of any platform markup — you pay Anthropic directly for exactly what you use.

### Where do I get a key and what does it cost to start?
Create one at [console.anthropic.com](https://console.anthropic.com) → **API Keys**. You add a small amount of credit to your Anthropic account, and calls draw from it. There is no minimum tied to OpenScriva.

### Roughly how much does the AI cost per use?
It depends on the model you pick per call (Haiku, Sonnet, or Opus) and how much of your book is in context. As a rough feel:

- **Haiku** is the cheapest — good for quick chat, small edits, and drafting where you want volume.
- **Sonnet** (the default) balances cost and quality for most continue/edit/critique work.
- **Opus** is the most capable and the most expensive — worth it for hard passages, not for everything.

A typical continue-writing or edit call sends a token-budgeted briefing (about 4,000 tokens of context by default) plus your text. For most writers that lands in the range of pennies to a few cents per call on Sonnet, and a fraction of that on Haiku. Anthropic's [pricing page](https://www.anthropic.com/pricing) has exact per-token rates. Because you're billed by Anthropic directly, you see and control the spend.

### Does OpenScriva take a cut of the AI cost?
No. OpenScriva carries zero inference cost and adds zero markup. The AI is free at every tier, including the free one. We never put the AI behind a paywall — you already pay for it.

### Is my key safe?
Your key is validated, then stored **encrypted in an httpOnly cookie** in your own browser. It is used only to call Anthropic from your browser. It never reaches an OpenScriva server, never gets logged, and never gets committed to your repo. Rotate or delete it from your Anthropic console any time and it stops working at once.

## Where my writing lives

### Where is my manuscript stored?
In a **private GitHub repository you own** — a fork of OpenScriva that becomes your "writing room." Books live in `books/<slug>/` and pages in `pages/<slug>.md`, all as plain markdown. Every save is a git commit to your fork.

### Is my writing private?
Yes. The fork is marked private the moment it's created. Only you — and anyone you explicitly invite as a collaborator — can see it. OpenScriva does not hold a copy of your manuscript on its servers, so there's no OpenScriva database to breach or leak.

### Does OpenScriva ever see my book?
No. The manuscript sits in your GitHub repo, and AI calls run from your browser with your key. Your book text and your key stay on your side of the line. The only server-side data OpenScriva keeps is billing identity for Pro accounts (your GitHub id and Stripe status) — never manuscript text, never keys.

### What if I stop using OpenScriva?
You keep everything. Your writing is already in your GitHub account as markdown with full version history. Clone it, move it, publish it elsewhere — no export dance, no lock-in. OpenScriva is MIT open-source, so you can even self-host the whole app and point it at the same repo.

### Do I lose work if my connection drops?
No. Saves autosave on a debounce and show `saving → saved` in the status bar. If a save fails you'll see `offline` or `error`, and the editor holds your unsaved text and retries when you reconnect. Wait for `saved` before closing the tab.

## Free vs Pro

OpenScriva ships with a free tier that is the whole writing product, and a paid Pro tier that sells hosted convenience. The AI is free on both.

### What's in Free?
Everything the solo writing loop needs:

- The full editor, focus mode, markdown source-of-truth, autosave, and git version history.
- The **full AI loop** — continue, inline edit with diff review, chat, critique — on your own key. No caps, no credits, no markup.
- The full structured mind — characters, world model, plot threads, voice profile, citations, writing rules, RAG index.
- **Unlimited books.** They live in your repo, so there's no reason to cap them.
- Export to **EPUB and markdown**, unlimited. PDF export on a shared best-effort queue.
- Local galley preview with a print stylesheet.
- Community support (GitHub issues, Discord).

### What does Pro add? ($12/mo, or $108/yr)
The conveniences that run on OpenScriva-hosted infrastructure — the things a self-hoster would otherwise build themselves:

- **Hosted book publishing** to public URLs (roadmap, v1.5 — see below).
- **Custom domain** for a published book.
- **Reader analytics** — views, completion rate, per-chapter drop-off.
- **Priority PDF/export** capacity, no shared queue.
- **Managed GitHub App** connect and **branding removal** on published books.
- Email support.

### Is publishing available today?
Not yet. Today "publishing" means **export** (EPUB / PDF / markdown) plus a **galley preview** that renders your whole book as a clean reading experience you can print or hand to Amazon KDP. **Hosted publishing to a public URL is on the roadmap (v1.5)** — that's the anchor feature Pro is built around, and Pro billing is sequenced to arrive with it. Everything in Free works right now.

### Is there a collaboration / team plan?
Collaboration exists in the codebase — invite a co-author, work on draft branches, review changes as pull requests, resolve conflicts — and it ships as a **v1.5 fast-follow** behind the solo experience. A **Studio** tier for co-authoring groups is planned to land with it. It is not part of the launch.

### Why is the free tier this generous?
Because it costs almost nothing to run. Your GitHub holds the files and your key runs the AI, so OpenScriva has no storage or inference bill on the core loop. Pro charges for the parts that do cost us money to host. And because the app is MIT open-source, anyone can self-host it for free — so Pro has to earn its price on convenience, which keeps us honest.

## Roadmap at a glance

Marked so you know what's live versus coming:

- **Live now:** editor, autosave + git history, full AI loop, structured mind, EPUB/PDF/markdown export, galley preview.
- **v1.5:** hosted publishing to a public URL, custom domains, reader analytics; async collaboration (invite → draft branch → PR review → conflict resolve) and the Studio tier.
- **v2:** real-time co-editing, margin comments, and auto-population of the world model from your prose.
