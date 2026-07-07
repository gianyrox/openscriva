import type {
  WritingType,
  ScrivaFeatures,
  WritingRules,
  CharacterNode,
  CitationEntry,
  PlaceNode,
  TimelineEvent,
  ObjectNode,
  WorldRule,
  NarrativeState,
  NarrativePromise,
  PlotThread,
  TensionData,
  VoiceProfile,
  VoiceExemplar,
  AntiPattern,
} from "@/types/scriva";

import manifestJson from "@/templates/manifest.json";
import novel3Act from "@/templates/novel-3-act/template.json";
import shortStory from "@/templates/short-story/template.json";
import nonfictionHowto from "@/templates/nonfiction-howto/template.json";
import serialSubstack from "@/templates/serial-substack/template.json";
import screenplay from "@/templates/screenplay/template.json";
import worldbuildingBible from "@/templates/worldbuilding-bible/template.json";

// A chapter as authored in a template: same shape as a Book chapter, plus the
// seed markdown body the scaffolder writes to disk.
export interface TemplateChapter {
  id: string;
  file: string;
  label: string;
  content: string;
}

// The book-level seed. Maps 1:1 onto the `Book` written to books/<slug>/book.json.
export interface TemplateBook {
  title: string;
  author?: string;
  genre?: string;
  logline?: string;
  themes?: string[];
  targetWordCount?: number;
  language?: string;
  parts: {
    title: string;
    chapters: { id: string; file: string; label: string }[];
  }[];
}

// The mind seed. Every field is optional; anything omitted falls back to the
// blank scaffold default (empty arrays / defaultWorldModel() / etc.).
export interface TemplateScriva {
  features?: Partial<ScrivaFeatures>;
  rules?: Partial<WritingRules>;
  characters?: CharacterNode[];
  citations?: CitationEntry[];
  world?: {
    places?: PlaceNode[];
    timeline?: TimelineEvent[];
    objects?: ObjectNode[];
    rules?: WorldRule[];
  };
  narrative?: {
    state?: NarrativeState;
    promises?: NarrativePromise[];
    threads?: PlotThread[];
    tension?: TensionData[];
  };
  voice?: {
    profile?: VoiceProfile;
    exemplars?: VoiceExemplar[];
    antipatterns?: AntiPattern[];
  };
}

// A full template.json. Storage-layout-identical to a blank room — a template
// is a pre-filled version of what setup already creates.
export interface Template {
  id: string;
  name: string;
  writingType: WritingType;
  description: string;
  book: TemplateBook;
  scriva: TemplateScriva;
  chapters: TemplateChapter[];
}

// The picker-facing summary (no chapter bodies, no mind seed) — safe to ship to
// the client bundle.
export interface TemplateSummary {
  id: string;
  name: string;
  writingType: WritingType;
  description: string;
}

const TEMPLATES: Record<string, Template> = {
  "novel-3-act": novel3Act as unknown as Template,
  "short-story": shortStory as unknown as Template,
  "nonfiction-howto": nonfictionHowto as unknown as Template,
  "serial-substack": serialSubstack as unknown as Template,
  "screenplay": screenplay as unknown as Template,
  "worldbuilding-bible": worldbuildingBible as unknown as Template,
};

interface ManifestEntry {
  id: string;
  name: string;
  writingType: WritingType;
  description: string;
  path: string;
}

const MANIFEST = manifestJson as unknown as {
  version: string;
  templates: ManifestEntry[];
};

// Ordered summaries for the picker — order follows manifest.json.
export function listTemplates(): TemplateSummary[] {
  return MANIFEST.templates.map(function toSummary(entry) {
    return {
      id: entry.id,
      name: entry.name,
      writingType: entry.writingType,
      description: entry.description,
    };
  });
}

// Full template by id, or null if unknown.
export function getTemplate(id: string): Template | null {
  return TEMPLATES[id] ?? null;
}
