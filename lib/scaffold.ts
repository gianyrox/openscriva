import { createOrUpdateFile } from "@/lib/github";
import type {
  ScrivaConfig,
  ScrivaFeatures,
  WritingRules,
  WorldModel,
  NarrativeState,
  VoiceProfile,
  EmbeddingManifest,
  WritingType,
  CharacterNode,
  CitationEntry,
  PlaceNode,
  TimelineEvent,
  ObjectNode,
  WorldRule,
  NarrativePromise,
  PlotThread,
  TensionData,
  VoiceExemplar,
  AntiPattern,
} from "@/types/scriva";
import {
  defaultScrivaConfig,
  defaultWritingRules,
  defaultWorldModel,
  defaultNarrativeState,
  defaultVoiceProfile,
  defaultEmbeddingManifest,
} from "@/types/scriva";
import type { Template } from "@/lib/templates";

// A mind seed for a fresh room. Every field is optional; anything omitted keeps
// the blank scaffold default (empty arrays / defaultWorldModel() / etc.), so a
// seed only has to specify what it wants to differ from a blank room.
export interface ScrivaSeed {
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

interface ScaffoldOptions {
  token: string;
  owner: string;
  repo: string;
  branch: string;
  writingType: WritingType;
  config?: Partial<ScrivaConfig>;
  rules?: Partial<WritingRules>;
  // Optional pre-filled mind. When present, the scaffolder writes these entries
  // instead of the empty defaults. Leaving it undefined reproduces the original
  // blank-room behavior exactly.
  seed?: ScrivaSeed;
}

function json(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

async function createFile(
  token: string,
  owner: string,
  repo: string,
  path: string,
  content: string,
  branch: string,
): Promise<void> {
  try {
    await createOrUpdateFile(
      token,
      owner,
      repo,
      path,
      content,
      "Initialize " + path,
      undefined,
      branch,
    );
  } catch {
    // file may already exist, skip
  }
}

export async function scaffoldProject(options: ScaffoldOptions): Promise<ScrivaConfig> {
  var { token, owner, repo, branch, writingType } = options;
  var seed = options.seed ?? {};

  var config = defaultScrivaConfig(writingType);
  if (options.config) {
    config = { ...config, ...options.config, features: { ...config.features, ...(options.config.features ?? {}) }, ai: { ...config.ai, ...(options.config.ai ?? {}) } };
  }
  // A seed's feature overrides merge onto whatever the type/config produced.
  if (seed.features) {
    config = { ...config, features: { ...config.features, ...seed.features } };
  }

  var rules = defaultWritingRules();
  if (options.rules) {
    rules = { ...rules, ...options.rules };
  }
  if (seed.rules) {
    rules = { ...rules, ...seed.rules };
  }

  var worldModel = defaultWorldModel();
  var narrativeState = seed.narrative?.state ?? defaultNarrativeState();
  var voiceProfile = seed.voice?.profile ?? defaultVoiceProfile();
  var manifest = defaultEmbeddingManifest();

  var files: { path: string; content: string }[] = [
    { path: ".scriva/config.json", content: json(config) },
    { path: ".scriva/rules.json", content: json(rules) },
    { path: ".scriva/characters.json", content: json(seed.characters ?? []) },
    { path: ".scriva/citations.json", content: json(seed.citations ?? []) },

    { path: ".scriva/world/places.json", content: json(seed.world?.places ?? worldModel.places) },
    { path: ".scriva/world/timeline.json", content: json(seed.world?.timeline ?? worldModel.timeline) },
    { path: ".scriva/world/objects.json", content: json(seed.world?.objects ?? worldModel.objects) },
    { path: ".scriva/world/rules.json", content: json(seed.world?.rules ?? worldModel.rules) },

    { path: ".scriva/narrative/state.json", content: json(narrativeState) },
    { path: ".scriva/narrative/promises.json", content: json(seed.narrative?.promises ?? []) },
    { path: ".scriva/narrative/threads.json", content: json(seed.narrative?.threads ?? []) },
    { path: ".scriva/narrative/tension.json", content: json(seed.narrative?.tension ?? []) },

    { path: ".scriva/voice/profile.json", content: json(voiceProfile) },
    { path: ".scriva/voice/exemplars.json", content: json(seed.voice?.exemplars ?? []) },
    { path: ".scriva/voice/antipatterns.json", content: json(seed.voice?.antipatterns ?? []) },
    { path: ".scriva/voice/drift.json", content: json([]) },

    { path: ".scriva/memory/book.md", content: "" },

    { path: ".scriva/embeddings/chunks.json", content: json([]) },
    { path: ".scriva/embeddings/manifest.json", content: json(manifest) },

    { path: ".scriva/revision/log.json", content: json([]) },
    { path: ".scriva/revision/learned.json", content: json([]) },
  ];

  var batchSize = 5;
  for (var i = 0; i < files.length; i += batchSize) {
    var batch = files.slice(i, i + batchSize);
    await Promise.all(
      batch.map(function writeFile(f) {
        return createFile(token, owner, repo, f.path, f.content, branch);
      }),
    );
  }

  return config;
}

interface TemplateTarget {
  token: string;
  owner: string;
  repo: string;
  branch: string;
}

// Seed a fresh room's `.scriva/` mind from a template. This is a thin wrapper
// over scaffoldProject — it maps the template's `scriva` block onto a ScrivaSeed
// and runs the exact same write path. Book.json and chapter files are written
// by the book-create route (the other half of the blank-room create path);
// this only owns the mind, exactly like scaffoldProject does today.
export async function scaffoldFromTemplate(
  template: Template,
  target: TemplateTarget,
): Promise<ScrivaConfig> {
  var s = template.scriva ?? {};
  return scaffoldProject({
    token: target.token,
    owner: target.owner,
    repo: target.repo,
    branch: target.branch,
    writingType: template.writingType,
    seed: {
      features: s.features,
      rules: s.rules,
      characters: s.characters,
      citations: s.citations,
      world: s.world,
      narrative: s.narrative,
      voice: s.voice,
    },
  });
}
