# Landing Page Visual Prompts

Prompts for ChatGPT image generation (DALL-E 3 / GPT-4o). Each maps to a section on the landing page.

---

## 1. Hero Screenshot

Replaces the HTML mockup in the hero section.

```
Create a high-fidelity UI screenshot of a book writing application called "scriva".

The screenshot shows a desktop app window with:
- A warm cream background (#FAF8F5)
- Left sidebar (slightly darker cream #F0EDE8) with a "CHAPTERS" header and a list: Prologue, "1. The Arrival" (highlighted with a gold #B8860B left border), "2. Old Friends", "3. The Letter", "4. Departure"
- Main editor area showing a chapter titled "1. The Arrival" in a serif font (like Literata)
- Two paragraphs of literary fiction prose about a woman named Elena arriving at a train station
- One sentence highlighted in soft green (#6B8E4E at 15% opacity) showing an AI suggestion
- A tiny pill badge below reading "✨ AI suggestion — Tab to accept"
- macOS-style window chrome (red/yellow/green dots) at the top left, with "scriva" in the title bar
- Clean, minimal design with generous whitespace

Style: Ultra-clean SaaS product screenshot. No 3D effects. Flat, modern. Crisp text. 16:9 aspect ratio. Light mode only.
```

---

## 2. Paper & Study Theme Comparison

For the "A room of one's own — with two themes" deep dive section.

```
Create a side-by-side comparison of two writing app themes.

LEFT: "Paper" theme — warm cream background (#FAF8F5), dark brown text (#2C2C2C), gold accent (#B8860B) on the active chapter in a sidebar. A serif font (like Literata) shows literary prose. The feel is warm, papery, like writing in a leather-bound notebook.

RIGHT: "Study" theme — dark warm background (#1C1B1A), light cream text (#E8E4DB), lighter gold accent (#D4A843). Same layout, same prose. The feel is intimate, like writing by candlelight in a study.

Both show the same chapter content in a clean editor interface with a chapter sidebar. The transition between them should feel like day and night of the same room.

Style: Product UI screenshot comparison. Clean, minimal, flat design. 16:9 aspect ratio. No 3D effects. Sharp text.
```

---

## 3. Context-Aware AI Panel

For the "Context is everything" deep dive section.

```
Create a UI screenshot of an AI context panel in a writing application.

The panel shows a right sidebar with checkboxes for context sources:
- ✅ Chapter 1: The Arrival
- ✅ Characters (Elena, Thomas, Margaret)
- ✅ Outline (Act 1)
- ☐ Research notes
- ✅ Voice Guide

Below the checkboxes, a small token count reads "~4,200 tokens selected"

The main editor area to the left shows a paragraph of prose with an inline AI suggestion highlighted in soft green. A small toolbar floats near the selection showing "Polish for clarity" and "Continue writing" buttons.

Color palette: cream background (#FAF8F5), gold accents (#B8860B), Inter font for UI, Literata serif for prose. Clean, warm, minimal.

Style: Product UI screenshot. Flat, modern SaaS design. 16:9 aspect ratio.
```

---

## 4. Voice Guide Analysis

For the "Your voice. Not a generic tone" deep dive section.

```
Create a UI screenshot of a "Voice Guide" panel in a writing application.

The panel shows an analysis of a writer's prose style with these sections:
- TONE: "Measured, introspective, with undercurrents of melancholy"
- SENTENCE STRUCTURE: "Varied — long flowing sentences broken by short declarative ones"
- VOCABULARY: "Literary but accessible. Favors sensory detail over abstraction"
- PACING: "Slow-building. Scene-setting before action"
- A sample passage in a blockquote showing the original analyzed text

The panel has a cream background (#FAF8F5), gold accent (#B8860B) on section headers, muted gray (#6B6B6B) for body text, Inter font for UI labels, Literata serif for the sample passage.

Style: Product UI screenshot. Clean, modern, flat design. Warm tones. 16:9 aspect ratio.
```

---

## 5. PR Review & Collaboration

For the "Branches for experiments. PRs for edits" deep dive section.

```
Create a UI screenshot showing a pull request review view inside a book writing application.

The view shows:
- A header reading "PR #12: Chapter 3 revision — Elena's backstory" with "Open" status badge in green
- A diff view showing removed text (highlighted in soft red with strikethrough) and added text (highlighted in soft green)
- The diff shows prose being revised — not code — with literary fiction content
- A comment thread on the right with an author's note: "I think this version better establishes her motivation"
- Buttons: "Approve", "Request changes", "Merge"

Color palette: cream background (#FAF8F5), gold accents (#B8860B), green (#6B8E4E) for additions, red (#C44040) for deletions. Clean Inter font for UI, Literata serif for the prose content.

Style: Product UI screenshot. Flat, modern SaaS design. 16:9 aspect ratio.
```

---

## 6. Export Modal

For the "From manuscript to bookshelf" deep dive section.

```
Create a UI screenshot showing an export dialog in a book writing application.

The modal shows three export format options as cards:
1. EPUB — with a book icon, "E-book format for Kindle, Apple Books, and other readers"
2. PDF — with a document icon, "Print-ready A5 format with professional typography"
3. Markdown — with a file icon, "Clean markdown bundle as a ZIP archive"

The EPUB card is selected/highlighted with a gold (#B8860B) border. Below the cards, a "Export EPUB" button in gold with white text.

The modal floats over a dimmed editor background. The modal itself has cream background (#FAF8F5), rounded corners (12px), subtle shadow.

Style: Product UI screenshot. Clean, minimal, flat design. 4:3 aspect ratio.
```

---

## 7. OG Image / Social Share Card

For Twitter/Bluesky/OpenGraph unfurling. Dimensions: 1200x630.

```
Create a social media share card (Open Graph image) for a product called "scriva".

The image shows:
- A warm cream background (#FAF8F5)
- The word "Write." in large italic serif font (like Literata), gold color (#B8860B), centered
- Below it in smaller sans-serif: "Open-source, AI-native book writing."
- A subtle pen/quill icon mark in the top left corner, drawn with clean strokes
- Very minimal — lots of whitespace, elegant, literary feel

Dimensions: exactly 1200x630 pixels. No 3D effects. Flat design. The overall feel should be sophisticated and calm, like the cover of a literary journal.
```

---

## 8. Hero Video — Source Image

Generate this image, then convert to video with Hailuo MiniMax / nano banana pro.

```
Create a photorealistic image of a person's hands typing on a laptop keyboard. The laptop screen shows a book writing application with a warm cream interface (#FAF8F5). On screen we can see:
- A chapter titled "The Arrival" in elegant serif font
- Several paragraphs of literary prose
- A sentence highlighted in soft green showing an AI writing suggestion
- A minimal sidebar with chapter names on the left

The setting is a clean wooden desk with warm lighting. A cup of coffee and a small stack of books are visible but blurred in the background. The mood is focused, calm, creative — a writer in their element.

Shot from slightly above, looking down at the keyboard and screen. Warm color grading. Shallow depth of field on the background.

Style: Cinematic photograph. Warm tones. Editorial quality. 16:9 aspect ratio.
```

### Video generation prompt (Hailuo MiniMax / nano banana pro)

Upload the image above and use this prompt:

```
Slow, subtle camera movement. The hands type a few words on the keyboard. On the laptop screen, text appears in the writing application. A green highlight appears on a sentence, showing an AI suggestion. The person's finger presses the Tab key to accept the suggestion. Gentle ambient lighting. Calm, focused atmosphere. Cinematic, editorial feel. 5-second loop.
```

### Additional video clips to generate

Stitch 3-4 clips into a 15-20 second seamless loop for the hero section:

1. **Typing + AI suggestion appearing** — the core "write with AI" moment
2. **Theme toggle** — screen transitions from warm cream to dark mode
3. **Chapter navigation** — clicking between chapters in the sidebar
4. **Export** — clicking an export button, a progress bar fills

---

## Color Reference

| Token             | Paper (light)  | Study (dark)   |
| ----------------- | -------------- | -------------- |
| Background        | `#FAF8F5`      | `#1C1B1A`      |
| Surface           | `#F0EDE8`      | `#262523`      |
| Text              | `#2C2C2C`      | `#E8E4DB`      |
| Text muted        | `#6B6B6B`      | `#8B8780`      |
| Accent (gold)     | `#B8860B`      | `#D4A843`      |
| Border            | `#E0DCD4`      | `#3A3836`      |
| Success (green)   | `#6B8E4E`      | `#7FA05E`      |
| Error (red)       | `#C44040`      | `#E06060`      |

## Fonts

- **Prose / brand:** Literata (serif, italic for "scriva" wordmark)
- **UI:** Inter (sans-serif)
- **Code:** JetBrains Mono
