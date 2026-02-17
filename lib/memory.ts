import { getFileContent, createOrUpdateFile } from "@/lib/github";
import { getModelId } from "@/lib/anthropic";
import { estimateTokens } from "@/lib/tokens";
import type { SceneBeat } from "@/types/scriva";

interface MemoryContext {
  token: string;
  owner: string;
  repo: string;
  branch: string;
}

export async function readBookSummary(ctx: MemoryContext): Promise<string> {
  try {
    var { content } = await getFileContent(ctx.token, ctx.owner, ctx.repo, ".scriva/memory/book.md", ctx.branch);
    return content;
  } catch {
    return "";
  }
}

export async function writeBookSummary(ctx: MemoryContext, summary: string): Promise<void> {
  var sha: string | undefined;
  try {
    var existing = await getFileContent(ctx.token, ctx.owner, ctx.repo, ".scriva/memory/book.md", ctx.branch);
    sha = existing.sha;
  } catch {}
  await createOrUpdateFile(ctx.token, ctx.owner, ctx.repo, ".scriva/memory/book.md", summary, "Update book summary", sha, ctx.branch);
}

export async function readArcSummary(ctx: MemoryContext, partId: string): Promise<string> {
  try {
    var { content } = await getFileContent(ctx.token, ctx.owner, ctx.repo, ".scriva/memory/arcs/" + partId + ".md", ctx.branch);
    return content;
  } catch {
    return "";
  }
}

export async function writeArcSummary(ctx: MemoryContext, partId: string, summary: string): Promise<void> {
  var path = ".scriva/memory/arcs/" + partId + ".md";
  var sha: string | undefined;
  try {
    var existing = await getFileContent(ctx.token, ctx.owner, ctx.repo, path, ctx.branch);
    sha = existing.sha;
  } catch {}
  await createOrUpdateFile(ctx.token, ctx.owner, ctx.repo, path, summary, "Update arc summary: " + partId, sha, ctx.branch);
}

export async function readChapterSummary(ctx: MemoryContext, chapterId: string): Promise<string> {
  try {
    var { content } = await getFileContent(ctx.token, ctx.owner, ctx.repo, ".scriva/memory/chapters/" + chapterId + ".md", ctx.branch);
    return content;
  } catch {
    return "";
  }
}

export async function writeChapterSummary(ctx: MemoryContext, chapterId: string, summary: string): Promise<void> {
  var path = ".scriva/memory/chapters/" + chapterId + ".md";
  var sha: string | undefined;
  try {
    var existing = await getFileContent(ctx.token, ctx.owner, ctx.repo, path, ctx.branch);
    sha = existing.sha;
  } catch {}
  await createOrUpdateFile(ctx.token, ctx.owner, ctx.repo, path, summary, "Update chapter summary: " + chapterId, sha, ctx.branch);
}

export async function readSceneBeats(ctx: MemoryContext, chapterId: string): Promise<SceneBeat[]> {
  try {
    var { content } = await getFileContent(ctx.token, ctx.owner, ctx.repo, ".scriva/memory/scenes/" + chapterId + ".json", ctx.branch);
    return JSON.parse(content) as SceneBeat[];
  } catch {
    return [];
  }
}

export async function writeSceneBeats(ctx: MemoryContext, chapterId: string, beats: SceneBeat[]): Promise<void> {
  var path = ".scriva/memory/scenes/" + chapterId + ".json";
  var sha: string | undefined;
  try {
    var existing = await getFileContent(ctx.token, ctx.owner, ctx.repo, path, ctx.branch);
    sha = existing.sha;
  } catch {}
  await createOrUpdateFile(ctx.token, ctx.owner, ctx.repo, path, JSON.stringify(beats, null, 2), "Update scene beats: " + chapterId, sha, ctx.branch);
}

export function buildChapterSummaryPrompt(chapterTitle: string, content: string): string {
  return "Summarize this chapter in ~200 tokens. Include: what happens, who appears, which plot threads move, and the emotional state at the end. Be specific and factual, not vague.\n\nChapter: " + chapterTitle + "\n\n" + content.slice(0, 12000);
}

export function buildArcSummaryPrompt(partTitle: string, chapterSummaries: string[]): string {
  var prompt = "Summarize this story arc in ~300 tokens. Include: the narrative trajectory, key turning points, character development, and what it sets up for the next arc.\n\nArc: " + partTitle + "\n\n";
  for (var i = 0; i < chapterSummaries.length; i++) {
    prompt += "Chapter " + (i + 1) + ": " + chapterSummaries[i] + "\n\n";
  }
  return prompt;
}

export function buildBookSummaryPrompt(
  title: string,
  arcSummaries: string[],
  themes: string[],
  logline: string,
): string {
  var prompt = "Summarize this book in ~500 tokens. Include: premise, major themes, current state of the narrative, key character arcs, and the author's apparent intent. Write as a briefing for a co-writer who needs to understand the whole book.\n\n";
  prompt += "Title: " + title + "\n";
  if (logline) prompt += "Logline: " + logline + "\n";
  if (themes.length > 0) prompt += "Themes: " + themes.join(", ") + "\n\n";
  for (var i = 0; i < arcSummaries.length; i++) {
    prompt += "Part " + (i + 1) + ": " + arcSummaries[i] + "\n\n";
  }
  return prompt;
}

export function buildSceneBeatsPrompt(chapterTitle: string, content: string): string {
  return "Break this chapter into scene beats. For each scene, provide a JSON array where each element has: id (string), summary (string, ~100 tokens), characters (string[]), emotionalTone (string, 2-3 words), position (number, 0-1 indicating position in chapter). Return ONLY valid JSON, no markdown fences.\n\nChapter: " + chapterTitle + "\n\n" + content.slice(0, 12000);
}

export async function generateSummaryViaAPI(
  prompt: string,
  apiKey: string,
): Promise<string> {
  var Anthropic = (await import("@anthropic-ai/sdk")).default;
  var client = new Anthropic({ apiKey });
  var response = await client.messages.create({
    model: getModelId("haiku"),
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  var text = "";
  for (var i = 0; i < response.content.length; i++) {
    var block = response.content[i];
    if (block.type === "text") {
      text += block.text;
    }
  }
  return text;
}

export function estimateMemoryCost(wordCount: number): { tokens: number; cost: number; formatted: string } {
  var tokens = estimateTokens(String(wordCount)) + Math.ceil(wordCount * 1.3);
  var cost = tokens * (0.25 / 1_000_000 + 1.25 / 1_000_000) / 2;
  return {
    tokens,
    cost,
    formatted: "~$" + cost.toFixed(3),
  };
}
