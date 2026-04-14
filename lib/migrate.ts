import { getFileContent } from "@/lib/github";
import { scaffoldProject } from "@/lib/scaffold";
import { saveScrivaConfig } from "@/lib/bookConfig";
import type { Book } from "@/types";
import type { ScrivaConfig, WritingType, CharacterNode } from "@/types/scriva";
import { defaultScrivaConfig } from "@/types/scriva";
import { getItem } from "@/lib/storage";

interface MigrateContext {
  token: string;
  owner: string;
  repo: string;
  branch: string;
}

function inferWritingType(book: Book): WritingType {
  var genre = (book.genre || "").toLowerCase();
  if (genre.includes("academic") || genre.includes("research") || genre.includes("thesis")) {
    return "academic";
  }
  if (genre.includes("nonfiction") || genre.includes("memoir") || genre.includes("biography") || genre.includes("essay")) {
    return "nonfiction";
  }
  return "fiction";
}

function parseCharactersMd(content: string): CharacterNode[] {
  var characters: CharacterNode[] = [];
  var sections = content.split(/^##\s+/m);

  for (var i = 0; i < sections.length; i++) {
    var section = sections[i].trim();
    if (!section) continue;

    var lines = section.split("\n");
    var name = lines[0].trim();
    if (!name) continue;

    var description = lines.slice(1).join("\n").trim();

    characters.push({
      id: name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
      name,
      aliases: [],
      role: "supporting",
      firstAppearance: "",
      lastAppearance: "",
      alive: true,
      description: description.slice(0, 500),
      arc: "",
      currentState: "",
      traits: [],
      relationships: [],
      appearances: [],
    });
  }

  return characters;
}

export async function migrate(ctx: MigrateContext, book: Book): Promise<ScrivaConfig> {
  var writingType = inferWritingType(book);

  var config = await scaffoldProject({
    token: ctx.token,
    owner: ctx.owner,
    repo: ctx.repo,
    branch: ctx.branch,
    writingType,
  });

  try {
    var charFile = await getFileContent(ctx.token, ctx.owner, ctx.repo, "characters.md", ctx.branch);
    if (charFile.content) {
      var characters = parseCharactersMd(charFile.content);
      if (characters.length > 0) {
        var { createOrUpdateFile } = await import("@/lib/github");
        var existingChars: { sha?: string } = {};
        try {
          var existing = await getFileContent(ctx.token, ctx.owner, ctx.repo, ".scriva/characters.json", ctx.branch);
          existingChars = { sha: existing.sha };
        } catch {}
        await createOrUpdateFile(
          ctx.token,
          ctx.owner,
          ctx.repo,
          ".scriva/characters.json",
          JSON.stringify(characters, null, 2),
          "Migrate characters from characters.md",
          existingChars.sha,
          ctx.branch,
        );
      }
    }
  } catch {}

  var repoKey = ctx.owner + "/" + ctx.repo;

  try {
    var voiceData = getItem<{ summary?: string; metrics?: Record<string, unknown> } | null>("scriva:voice:" + repoKey, null);
    if (voiceData && voiceData.summary) {
      var { createOrUpdateFile: writeFile } = await import("@/lib/github");
      var profileSha: string | undefined;
      try {
        var existingProfile = await getFileContent(ctx.token, ctx.owner, ctx.repo, ".scriva/voice/profile.json", ctx.branch);
        profileSha = existingProfile.sha;
      } catch {}

      var profile = {
        summary: voiceData.summary || "",
        metrics: voiceData.metrics || {},
        genreCalibration: "",
        lastUpdated: Date.now(),
        analyzedChapters: [],
      };

      await writeFile(
        ctx.token,
        ctx.owner,
        ctx.repo,
        ".scriva/voice/profile.json",
        JSON.stringify(profile, null, 2),
        "Migrate voice profile from localStorage",
        profileSha,
        ctx.branch,
      );
    }
  } catch {}

  saveScrivaConfig(repoKey, config);
  return config;
}
