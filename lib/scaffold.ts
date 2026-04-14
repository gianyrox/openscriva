import { createOrUpdateFile } from "@/lib/github";
import type { ScrivaConfig, WritingRules, WorldModel, NarrativeState, VoiceProfile, EmbeddingManifest, WritingType } from "@/types/scriva";
import {
  defaultScrivaConfig,
  defaultWritingRules,
  defaultWorldModel,
  defaultNarrativeState,
  defaultVoiceProfile,
  defaultEmbeddingManifest,
} from "@/types/scriva";

interface ScaffoldOptions {
  token: string;
  owner: string;
  repo: string;
  branch: string;
  writingType: WritingType;
  config?: Partial<ScrivaConfig>;
  rules?: Partial<WritingRules>;
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

  var config = defaultScrivaConfig(writingType);
  if (options.config) {
    config = { ...config, ...options.config, features: { ...config.features, ...(options.config.features ?? {}) }, ai: { ...config.ai, ...(options.config.ai ?? {}) } };
  }

  var rules = defaultWritingRules();
  if (options.rules) {
    rules = { ...rules, ...options.rules };
  }

  var worldModel = defaultWorldModel();
  var narrativeState = defaultNarrativeState();
  var voiceProfile = defaultVoiceProfile();
  var manifest = defaultEmbeddingManifest();

  var files: { path: string; content: string }[] = [
    { path: ".scriva/config.json", content: json(config) },
    { path: ".scriva/rules.json", content: json(rules) },
    { path: ".scriva/characters.json", content: json([]) },
    { path: ".scriva/citations.json", content: json([]) },

    { path: ".scriva/world/places.json", content: json([]) },
    { path: ".scriva/world/timeline.json", content: json([]) },
    { path: ".scriva/world/objects.json", content: json([]) },
    { path: ".scriva/world/rules.json", content: json([]) },

    { path: ".scriva/narrative/state.json", content: json(narrativeState) },
    { path: ".scriva/narrative/promises.json", content: json([]) },
    { path: ".scriva/narrative/threads.json", content: json([]) },
    { path: ".scriva/narrative/tension.json", content: json([]) },

    { path: ".scriva/voice/profile.json", content: json(voiceProfile) },
    { path: ".scriva/voice/exemplars.json", content: json([]) },
    { path: ".scriva/voice/antipatterns.json", content: json([]) },
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
