# Template library

A template gives a new writer a running start: the "mind" is pre-scaffolded for the kind of thing they're writing, the book already has a sensible chapter skeleton, and the writing rules are set to defaults that fit the form. Pick a template at setup and you're not staring at an empty everything — you're editing a structure that already understands your project.

This document is both the **writer-facing guide** ("what each template is and how to use it") and the **engineering spec** for how templates are stored and seeded. The templates themselves live as real seed files under [`/templates`](../templates).

---

## The library (6 starter templates)

| Template | Writing type | Best for | Mind it scaffolds |
|---|---|---|---|
| **Novel (3-act)** | fiction | A full-length novel with a classic three-act shape | Characters, world, plot threads, narrative promises, tension, voice, POV/tense rules |
| **Short story** | fiction | A single self-contained story, one sitting to a few | One protagonist, one thread, tight voice rules |
| **Non-fiction / how-to** | nonfiction | A practical guide, manual, or explainer | Citations, chapter summaries, clarity-first writing rules |
| **Serial / Substack-style** | nonfiction | An ongoing series of issues or episodes | Voice profile, per-issue structure, RAG across back issues |
| **Screenplay / script** | custom | A film/TV script or stage play (prose-markdown format) | Characters, scene structure, format rules |
| **Worldbuilding bible** | fiction | A reference canon for a world, series, or game | Deep world model — places, timeline, objects, world rules, characters |

Each template folder under `/templates/<id>/` holds:
- `template.json` — the full seed definition (below).
- `README.md` — a short "how to use this template" note for the writer.

The full set is indexed in [`/templates/manifest.json`](../templates/manifest.json).

---

## How a writer uses a template

1. In setup (**Step 4 — your first move**) or from the shelf, choose **Start from a template** and pick one.
2. OpenScriva creates the book in your writing room and seeds the mind from the template.
3. You land in the editor with chapters already outlined and the mind pre-populated with **placeholder** entries — a protagonist named `[Your protagonist]`, a plot thread called `[Main thread]`, and so on.
4. Replace the placeholders with your own material. Every entry you fill in is a fact the AI carries into every future answer.

Placeholders are valid, structured entries, so the AI already knows the *shape* of your project on day one. You're filling in blanks, not building scaffolding.

> Templates are optional. Every template just pre-fills things you could add by hand later. Starting blank is always fine — see [onboarding](./onboarding.md).

---

## Seed format (engineering spec)

A `template.json` is a single object the app reads and writes into a fresh writing room. Its fields map **directly** onto the files the existing scaffolder already writes (`lib/scaffold.ts`) and onto `book.json` (`lib/book.ts`). Nothing here invents a new storage layout — a template is a pre-filled version of what setup already creates.

```jsonc
{
  "id": "novel-3-act",            // stable slug, matches folder name
  "name": "Novel (3-act)",         // display name
  "writingType": "fiction",        // WritingType — sets defaultFeaturesForType()
  "description": "…",              // one line, shown in the picker
  "book": { /* Book */ },          // → books/<slug>/book.json
  "scriva": {
    "features": { /* Partial<ScrivaFeatures> */ },  // overrides merged onto the type defaults → .scriva/config.json
    "rules":    { /* Partial<WritingRules> */ },     // → .scriva/rules.json
    "characters": [ /* CharacterNode[] */ ],         // → .scriva/characters.json
    "citations":  [ /* CitationEntry[] */ ],         // → .scriva/citations.json
    "world": {
      "places":   [ /* PlaceNode[] */ ],             // → .scriva/world/places.json
      "timeline": [ /* TimelineEvent[] */ ],         // → .scriva/world/timeline.json
      "objects":  [ /* ObjectNode[] */ ],            // → .scriva/world/objects.json
      "rules":    [ /* WorldRule[] */ ]              // → .scriva/world/rules.json
    },
    "narrative": {
      "state":    { /* NarrativeState */ },          // → .scriva/narrative/state.json
      "promises": [ /* NarrativePromise[] */ ],      // → .scriva/narrative/promises.json
      "threads":  [ /* PlotThread[] */ ],            // → .scriva/narrative/threads.json
      "tension":  [ /* TensionData[] */ ]            // → .scriva/narrative/tension.json
    },
    "voice": {
      "profile":     { /* VoiceProfile */ },         // → .scriva/voice/profile.json
      "exemplars":   [ /* VoiceExemplar[] */ ],      // → .scriva/voice/exemplars.json
      "antipatterns":[ /* AntiPattern[] */ ]         // → .scriva/voice/antipatterns.json
    }
  },
  "chapters": [
    { "id": "ch-01", "file": "ch-01.md", "label": "Chapter 1", "content": "# Chapter 1\n\n…" }
  ]
}
```

All types are the ones already defined in [`types/scriva.ts`](../types/scriva.ts) and [`types/index.ts`](../types/index.ts). Any field a template omits falls back to the current scaffold default (empty arrays, `defaultWorldModel()`, etc.), so a template only has to specify what it wants to differ from a blank room.

### Mapping to writes

| Template field | Destination file | Written by (today) |
|---|---|---|
| `book` (+ `bookDir`/`contextDir` filled in at create time) | `books/<slug>/book.json` | `app/api/github/room/books/route.ts` |
| `chapters[].content` | `books/<slug>/book/<file>` | same route (currently writes one `ch-01.md`) |
| `writingType` + `scriva.features` | `.scriva/config.json` | `lib/scaffold.ts` → `scaffoldProject()` |
| `scriva.rules` | `.scriva/rules.json` | `scaffoldProject()` |
| `scriva.characters` | `.scriva/characters.json` | `scaffoldProject()` |
| `scriva.citations` | `.scriva/citations.json` | `scaffoldProject()` |
| `scriva.world.*` | `.scriva/world/*.json` | `scaffoldProject()` |
| `scriva.narrative.*` | `.scriva/narrative/*.json` | `scaffoldProject()` |
| `scriva.voice.*` | `.scriva/voice/*.json` | `scaffoldProject()` |

### Integration — what's built vs. what's roadmap

**Built today:** the scaffolder (`scaffoldProject`) already writes every `.scriva/*` file a template needs, and it already accepts `config`/`features`/`rules` overrides. The book-create route already writes `book.json` + chapters. So the storage targets exist; templates are pre-filled inputs to paths that already run.

**Roadmap (small lift):** the pieces to wire template selection end to end —

1. **A template picker** in setup Step 4 (`FirstMoveStep`) and on the shelf — one new option, "Start from a template," listing `manifest.json`.
2. **A `scaffoldFromTemplate(template, room, slug)` helper** that extends the current `scaffoldProject` to also accept seed arrays (characters, world, narrative, voice, citations) instead of only empty defaults, and writes the template's chapters instead of the single `ch-01.md`. This is an additive change to `lib/scaffold.ts` — the existing empty-default behavior stays as the "blank" path.
3. **Loading `template.json`** — bundle the `/templates` folder as static JSON the client can fetch, or read it from the room fork (it ships in the repo).

Until that wiring lands, these files are a precise, valid seed set: a writer (or a script) can drop any `template.json`'s pieces into a room by hand and get exactly the mind described. Mark the picker + `scaffoldFromTemplate` as the two beads that make templates a one-click experience.

---

## Adding a template

1. Create `/templates/<id>/template.json` following the schema above. Keep every entry valid against `types/scriva.ts`; use bracketed placeholders (`[Your protagonist]`) for anything the writer replaces.
2. Add a `/templates/<id>/README.md` — one screen, "what this is / how to use it."
3. Register it in `/templates/manifest.json`.
4. Keep it honest: only scaffold features that fit the form. A screenplay doesn't need a citations file; a how-to guide doesn't need a tension track.
