# Getting started with OpenScriva

Welcome. This guide walks you from a blank browser tab to your first saved paragraph. It takes about five minutes, and most of that is two one-time connections.

OpenScriva is built a little differently from other writing apps, and the difference is the whole point:

- **Your book lives in your own GitHub repository.** OpenScriva never stores your manuscript on a server it controls. Every save is a commit to a private repo you own.
- **The AI runs on your own Anthropic key.** Your key stays in your browser. Your manuscript text goes straight from your browser to Anthropic and back. OpenScriva sees neither.
- **Your book has a "mind" around it.** Alongside the prose, your repo holds a machine-readable layer — characters, world facts, plot threads, your voice — that the AI reads before it answers, so it stays consistent with the book you are actually writing.

That architecture is why you own everything and why nothing leaks. The setup steps below exist to stand it up. Once they're done, you write.

---

## The setup wizard (4 steps)

When you open the app for the first time you land on `/setup`. The wizard has four steps, shown as a progress bar across the top: **GitHub → API Key → Writing → Start**. You can move back and forth; nothing commits until the last step.

If you have connected before, the wizard detects your saved connections and skips straight past the steps you've already done — often straight to your shelf.

### Step 1 — Connect GitHub

**What happens:** you authorize OpenScriva's GitHub App. On first use, OpenScriva forks its own open-source repo (`gianyrox/openscriva`) into your account and marks the fork **private**. That private fork is your **writing room** — it holds every book, essay, poem, and journal you write.

**Why a fork?** The repo is your storage. Books live in `books/<slug>/`, pages in `pages/<slug>.md`, and each save is a real git commit to your fork. You get full version history for free, you can clone it to your laptop, and if you ever walk away from OpenScriva your writing is already yours, in plain markdown, in your account.

**Is this safe?**
- The fork is **private** the moment it's created. Nobody sees it but you and anyone you explicitly invite.
- OpenScriva only requests the GitHub access it needs to read and write your writing room.
- The repo also contains the app's own source (it's an MIT open-source project). That code sits quietly in the background; the app only ever treats `books/` and `pages/` as your content. You never have to look at it.

When the connection lands you'll see a short "Connected as @you" confirmation, and step 1 is marked done.

### Step 2 — Add your Anthropic API key

**What happens:** you paste an Anthropic API key. OpenScriva validates it, then stores it **encrypted in an httpOnly cookie** in your own browser.

**Why bring your own key?** Two reasons that both work in your favor:
1. **You pay Anthropic directly, at cost.** There's no platform markup on the AI. Heavy writers pay their real usage and nothing more.
2. **Your manuscript never touches an OpenScriva server.** AI calls are made from your browser with your key. The text of your book and your key both stay on your side.

**Where do I get a key?** Create one at [console.anthropic.com](https://console.anthropic.com) → **API Keys**. A key looks like `sk-ant-...`. New Anthropic accounts need a small amount of credit on file to make calls.

**Is this safe?**
- The key is encrypted before it's stored, and it lives in an httpOnly cookie your JavaScript can't read.
- It is used only to call Anthropic from your browser. It is never sent to an OpenScriva server, never logged, never committed to your repo.
- You can rotate or delete the key any time from your Anthropic console, and it stops working immediately.

> **What OpenScriva costs you here:** nothing for the AI itself — that bill is yours and Anthropic's. See the [FAQ](./faq.md) for a rough sense of per-chapter cost by model.

### Step 3 — Pick your writing type

Choose what you're writing: **Fiction**, **Nonfiction**, **Academic**, or **Custom**. This single choice configures the "mind" for you — it flips on the features that fit and leaves the rest off, so you're not staring at tools you don't need:

| Writing type | Turns on by default |
|---|---|
| **Fiction** | Characters, world-building, plot threads, narrative state, tension tracking, voice profile, RAG |
| **Nonfiction** | Citations, voice profile, chapter summaries, RAG |
| **Academic** | Citations, voice profile, chapter summaries, RAG |
| **Custom** | Voice profile only — a clean slate you build up yourself |

You can change any of these later. The writing type just sets sensible starting defaults.

### Step 4 — Your first move

Pick what to create right now:

- **A blank page** — start typing, no structure.
- **A book** — long-form with chapters (you can name it here).
- **An essay or article** — a single medium-length piece.
- **A poem** — verse, any form.
- **Morning pages / journal** — a dated daily-writing page.
- **I'm not sure yet** — skip straight to your shelf and decide later.

Hit **Finish Setup**. OpenScriva creates the book or page in your fork, drops you into the editor, and you're writing. Your first keystrokes autosave as a commit within a few seconds.

---

## Meeting the "mind" without being overwhelmed

The structured mind is OpenScriva's real edge, and the fastest way to lose a new writer is to make it feel like homework. So here's the honest version: **you can ignore all of it and still write a great book.** The editor works on its own. The mind is there for when you want the AI to stop forgetting your own story.

Start with just one habit:

1. **Write your first chapter.** Don't touch anything else.
2. When the AI first says something that contradicts your book — a character's eye color, a fact you established, a tone that's off — that's your cue.
3. Open the relevant panel and add **one** entry. For fiction that's usually a character. For nonfiction it's usually a citation or a writing rule.

That's the loop. Every entry you add is a fact the AI carries into every future answer. The mind grows as your book grows, one correction at a time, and it never needs to be "finished."

### What's in the mind

All of it lives as plain JSON in your repo under `.scriva/`, so it's yours and it's inspectable. You edit it through panels in the app, not by hand.

| Layer | What it holds | When to use it |
|---|---|---|
| **Characters** | Who they are, their arc, relationships, current state | Fiction. Add a character the first time the AI gets one wrong. |
| **World** | Places, timeline, objects, and the rules of your world | Fiction / worldbuilding. Add facts you keep having to re-explain. |
| **Plot threads** | Open storylines and setups that need a payoff | Fiction. Track promises you've made to the reader. |
| **Narrative state** | What the reader knows and expects right now | Fiction. Keeps the AI from spoiling or repeating. |
| **Voice profile** | Measured metrics + example passages of how *you* write | All types. The AI writes in your voice, not a generic one. |
| **Writing rules** | Your tone, POV, tense, things to avoid and prefer | All types. The one panel worth filling in early. |
| **Citations** | Your sources, formatted | Nonfiction / academic. |
| **RAG index** | A searchable index of your own prose | All types. Built automatically; lets the AI quote you back to yourself. |

**The one thing worth doing on day one:** open **Writing Rules** and add two or three lines — your point of view, your tense, and one or two things you never want the AI to do (say, "no em-dashes" or "never summarize the plot in dialogue"). It takes a minute and it changes every AI response from there on.

Everything else can wait until the book tells you it's needed. Or you can start from a **template**, which arrives with the mind already scaffolded for your kind of project — see the [template library](./templates.md).

---

## After setup: where things are

- **Your shelf** (`/shelf`) — every book and page in your room. Start here each session.
- **The editor** (`/book`) — the writing surface. Left sidebar is your chapter outline; the status bar shows word count and save state (`saving → saved`); Focus Mode hides all of it.
- **The AI panels** — continue writing, edit a selection (with an accept/reject diff), chat about your book, and request a critique. Every one reads the mind first.
- **Export** — EPUB, print-ready PDF, and a zipped markdown bundle, plus a galley preview that renders the whole book as a clean reading experience before you ship it.

## If something goes wrong

- **A save shows `error` or `offline`.** Your text is safe — the editor holds the unsaved buffer and retries when you reconnect. Don't close the tab until it flips back to `saved`.
- **The AI returns an error.** It's almost always the key: out of Anthropic credit, a rotated key, or a rate limit. Re-check your key in settings and your Anthropic console balance.
- **PDF export fails.** EPUB and markdown export always work; PDF depends on a rendering service that can be briefly busy on the free tier. Retry, or export EPUB.
- **The wizard can't find or make your room.** OpenScriva probes fork names `openscriva`, `openscriva-2` … `openscriva-9`. If you have an unusual fork setup on GitHub, the connect step can stall — the fix is usually to remove a stray `openscriva` fork and reconnect.

Questions about cost, privacy, or Free vs Pro? See the [FAQ](./faq.md).
