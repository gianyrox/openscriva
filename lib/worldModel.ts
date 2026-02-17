import { getFileContent, createOrUpdateFile } from "@/lib/github";
import { getModelId } from "@/lib/anthropic";
import type { WorldModel, CharacterNode, PlaceNode, TimelineEvent, ObjectNode, WorldRule } from "@/types/scriva";
import { defaultWorldModel } from "@/types/scriva";

interface WorldContext {
  token: string;
  owner: string;
  repo: string;
  branch: string;
}

async function readJsonFile<T>(ctx: WorldContext, path: string, fallback: T): Promise<{ data: T; sha?: string }> {
  try {
    var result = await getFileContent(ctx.token, ctx.owner, ctx.repo, path, ctx.branch);
    return { data: JSON.parse(result.content) as T, sha: result.sha };
  } catch {
    return { data: fallback };
  }
}

async function writeJsonFile(ctx: WorldContext, path: string, data: unknown, message: string): Promise<void> {
  var sha: string | undefined;
  try {
    var existing = await getFileContent(ctx.token, ctx.owner, ctx.repo, path, ctx.branch);
    sha = existing.sha;
  } catch {}
  await createOrUpdateFile(ctx.token, ctx.owner, ctx.repo, path, JSON.stringify(data, null, 2), message, sha, ctx.branch);
}

export async function readWorldModel(ctx: WorldContext): Promise<WorldModel> {
  var results = await Promise.all([
    readJsonFile<CharacterNode[]>(ctx, ".scriva/characters.json", []),
    readJsonFile<PlaceNode[]>(ctx, ".scriva/world/places.json", []),
    readJsonFile<TimelineEvent[]>(ctx, ".scriva/world/timeline.json", []),
    readJsonFile<ObjectNode[]>(ctx, ".scriva/world/objects.json", []),
    readJsonFile<WorldRule[]>(ctx, ".scriva/world/rules.json", []),
  ]);

  return {
    characters: results[0].data,
    places: results[1].data,
    timeline: results[2].data,
    objects: results[3].data,
    rules: results[4].data,
  };
}

export async function saveWorldModel(ctx: WorldContext, model: WorldModel): Promise<void> {
  await Promise.all([
    writeJsonFile(ctx, ".scriva/characters.json", model.characters, "Update characters"),
    writeJsonFile(ctx, ".scriva/world/places.json", model.places, "Update places"),
    writeJsonFile(ctx, ".scriva/world/timeline.json", model.timeline, "Update timeline"),
    writeJsonFile(ctx, ".scriva/world/objects.json", model.objects, "Update objects"),
    writeJsonFile(ctx, ".scriva/world/rules.json", model.rules, "Update world rules"),
  ]);
}

export function getCharactersInChapter(model: WorldModel, chapterId: string): CharacterNode[] {
  return model.characters.filter(function inChapter(c) {
    return c.appearances.indexOf(chapterId) !== -1;
  });
}

export function getCharacterByName(model: WorldModel, name: string): CharacterNode | null {
  var lower = name.toLowerCase();
  for (var i = 0; i < model.characters.length; i++) {
    var c = model.characters[i];
    if (c.name.toLowerCase() === lower) return c;
    for (var j = 0; j < c.aliases.length; j++) {
      if (c.aliases[j].toLowerCase() === lower) return c;
    }
  }
  return null;
}

export function buildWorldModelUpdatePrompt(chapterTitle: string, chapterContent: string, currentModel: WorldModel): string {
  var modelSummary = "Current world state:\n";
  modelSummary += "Characters: " + currentModel.characters.map(function name(c) { return c.name + " (" + c.role + ", " + c.currentState + ")"; }).join("; ") + "\n";
  modelSummary += "Places: " + currentModel.places.map(function name(p) { return p.name; }).join(", ") + "\n";

  return "Given the current world model and a new/updated chapter, return a JSON object with updates needed. Only include entries that changed or are new. For each entry, include all fields. Do NOT include entries with _override: true from the current model.\n\nFormat:\n{\n  \"characters\": [...],\n  \"places\": [...],\n  \"timeline\": [...],\n  \"objects\": [...],\n  \"rules\": [...]\n}\n\n" + modelSummary + "\n\nChapter: " + chapterTitle + "\n" + chapterContent.slice(0, 10000) + "\n\nReturn ONLY valid JSON, no markdown fences.";
}

export function mergeWorldModelUpdate(current: WorldModel, update: Partial<WorldModel>): WorldModel {
  function mergeArray<T extends { id: string; _override?: boolean }>(existing: T[], incoming: T[] | undefined): T[] {
    if (!incoming || incoming.length === 0) return existing;
    var result = existing.slice();
    for (var i = 0; i < incoming.length; i++) {
      var idx = result.findIndex(function match(e) { return e.id === incoming[i].id; });
      if (idx !== -1) {
        if (result[idx]._override) continue;
        result[idx] = incoming[i];
      } else {
        result.push(incoming[i]);
      }
    }
    return result;
  }

  return {
    characters: mergeArray(current.characters, update.characters),
    places: mergeArray(current.places, update.places),
    timeline: mergeArray(current.timeline, update.timeline),
    objects: mergeArray(current.objects, update.objects),
    rules: mergeArray(current.rules, update.rules),
  };
}

export function worldModelToContext(model: WorldModel, chapterId?: string): string {
  var chars = chapterId ? getCharactersInChapter(model, chapterId) : model.characters;
  var ctx = "[World Model]\n";

  if (chars.length > 0) {
    ctx += "Characters:\n";
    for (var i = 0; i < chars.length; i++) {
      var c = chars[i];
      ctx += "- " + c.name + " (" + c.role + "): " + c.currentState;
      if (c.relationships.length > 0) {
        ctx += ". Relationships: " + c.relationships.map(function rel(r) { return r.target + " (" + r.type + ")"; }).join(", ");
      }
      ctx += "\n";
    }
  }

  if (model.places.length > 0) {
    var relevantPlaces = chapterId ? model.places.filter(function inCh(p) { return p.chapters.indexOf(chapterId) !== -1; }) : model.places;
    if (relevantPlaces.length > 0) {
      ctx += "Places: " + relevantPlaces.map(function p(pl) { return pl.name; }).join(", ") + "\n";
    }
  }

  return ctx;
}
