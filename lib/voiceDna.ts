import { getFileContent, createOrUpdateFile } from "@/lib/github";
import { getModelId } from "@/lib/anthropic";
import type { VoiceProfile, VoiceExemplar, AntiPattern, VoiceDrift, VoiceMetrics } from "@/types/scriva";
import { defaultVoiceProfile } from "@/types/scriva";

interface VoiceContext {
  token: string;
  owner: string;
  repo: string;
  branch: string;
}

async function readJsonFile<T>(ctx: VoiceContext, path: string, fallback: T): Promise<T> {
  try {
    var result = await getFileContent(ctx.token, ctx.owner, ctx.repo, path, ctx.branch);
    return JSON.parse(result.content) as T;
  } catch {
    return fallback;
  }
}

async function writeJsonFile(ctx: VoiceContext, path: string, data: unknown, message: string): Promise<void> {
  var sha: string | undefined;
  try {
    var existing = await getFileContent(ctx.token, ctx.owner, ctx.repo, path, ctx.branch);
    sha = existing.sha;
  } catch {}
  await createOrUpdateFile(ctx.token, ctx.owner, ctx.repo, path, JSON.stringify(data, null, 2), message, sha, ctx.branch);
}

export async function readVoiceProfile(ctx: VoiceContext): Promise<VoiceProfile> {
  return readJsonFile<VoiceProfile>(ctx, ".scriva/voice/profile.json", defaultVoiceProfile());
}

export async function saveVoiceProfile(ctx: VoiceContext, profile: VoiceProfile): Promise<void> {
  await writeJsonFile(ctx, ".scriva/voice/profile.json", profile, "Update voice profile");
}

export async function readExemplars(ctx: VoiceContext): Promise<VoiceExemplar[]> {
  return readJsonFile<VoiceExemplar[]>(ctx, ".scriva/voice/exemplars.json", []);
}

export async function saveExemplars(ctx: VoiceContext, exemplars: VoiceExemplar[]): Promise<void> {
  await writeJsonFile(ctx, ".scriva/voice/exemplars.json", exemplars, "Update voice exemplars");
}

export async function readAntiPatterns(ctx: VoiceContext): Promise<AntiPattern[]> {
  return readJsonFile<AntiPattern[]>(ctx, ".scriva/voice/antipatterns.json", []);
}

export async function saveAntiPatterns(ctx: VoiceContext, patterns: AntiPattern[]): Promise<void> {
  await writeJsonFile(ctx, ".scriva/voice/antipatterns.json", patterns, "Update anti-patterns");
}

export async function readDrift(ctx: VoiceContext): Promise<VoiceDrift[]> {
  return readJsonFile<VoiceDrift[]>(ctx, ".scriva/voice/drift.json", []);
}

export async function saveDrift(ctx: VoiceContext, drift: VoiceDrift[]): Promise<void> {
  await writeJsonFile(ctx, ".scriva/voice/drift.json", drift, "Update voice drift");
}

export function getExemplarsForCraftElement(exemplars: VoiceExemplar[], tags: string[]): VoiceExemplar[] {
  return exemplars.filter(function matchTags(e) {
    for (var i = 0; i < tags.length; i++) {
      if (e.tags.indexOf(tags[i]) !== -1) return true;
    }
    return false;
  }).sort(function byQuality(a, b) {
    var order = { signature: 0, strong: 1, reference: 2 };
    return order[a.quality] - order[b.quality];
  });
}

export function buildVoiceAnalysisPrompt(chapterContents: string[]): string {
  var prompt = "Analyze the following writing samples and create a detailed voice profile.\n\n" +
    "Return a JSON object with these fields:\n" +
    "- summary: string (2-3 paragraph description of the author's voice and style)\n" +
    "- metrics: object with:\n" +
    "  - avgSentenceLength: number (average words per sentence)\n" +
    "  - vocabularyRichness: string (e.g. 'high', 'moderate', 'restrained')\n" +
    "  - povStyle: string (e.g. 'third person limited', 'first person intimate')\n" +
    "  - dialogueToNarrationRatio: string (e.g. '40/60', 'dialogue-heavy')\n" +
    "  - metaphorUsage: string (e.g. 'frequent and vivid', 'sparse and precise')\n" +
    "  - paragraphRhythm: string (e.g. 'short punchy paragraphs', 'long flowing paragraphs')\n" +
    "  - tenseUsage: string (e.g. 'past tense', 'present tense', 'mixed')\n" +
    "- genreCalibration: string (how the voice fits the genre)\n\n";

  for (var i = 0; i < chapterContents.length; i++) {
    prompt += "--- Sample " + (i + 1) + " ---\n" + chapterContents[i].slice(0, 3000) + "\n\n";
  }

  prompt += "Return ONLY valid JSON, no markdown fences, no explanation.";
  return prompt;
}

export function parseVoiceAnalysisResponse(response: string, analyzedChapters: string[]): VoiceProfile {
  try {
    var cleaned = response.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    var parsed = JSON.parse(cleaned);
    return {
      summary: parsed.summary ?? "",
      metrics: {
        avgSentenceLength: parsed.metrics?.avgSentenceLength ?? 0,
        vocabularyRichness: parsed.metrics?.vocabularyRichness ?? "",
        povStyle: parsed.metrics?.povStyle ?? "",
        dialogueToNarrationRatio: parsed.metrics?.dialogueToNarrationRatio ?? "",
        metaphorUsage: parsed.metrics?.metaphorUsage ?? "",
        paragraphRhythm: parsed.metrics?.paragraphRhythm ?? "",
        tenseUsage: parsed.metrics?.tenseUsage ?? "",
      },
      genreCalibration: parsed.genreCalibration ?? "",
      lastUpdated: Date.now(),
      analyzedChapters,
    };
  } catch {
    return {
      ...defaultVoiceProfile(),
      summary: response,
      lastUpdated: Date.now(),
      analyzedChapters,
    };
  }
}

export function buildDriftDetectionPrompt(chapterContent: string, profile: VoiceProfile): string {
  return "Compare this chapter's writing style against the established voice profile. Return a JSON object with:\n" +
    "- consistencyScore: number 0-1 (1 = perfectly consistent)\n" +
    "- driftNotes: string[] (specific observations about voice drift, if any)\n\n" +
    "Voice Profile:\n" + profile.summary + "\n" +
    "Style: " + profile.metrics.povStyle + ", " + profile.metrics.tenseUsage + ", avg " + profile.metrics.avgSentenceLength + " words/sentence\n\n" +
    "Chapter excerpt:\n" + chapterContent.slice(0, 4000) + "\n\nReturn ONLY valid JSON, no markdown fences.";
}

export function voiceToCompactContext(profile: VoiceProfile): string {
  return "[Voice Profile]\n" +
    profile.summary.slice(0, 300) + "\n" +
    "Style: " + profile.metrics.povStyle + ", " +
    profile.metrics.tenseUsage + ", " +
    "avg " + profile.metrics.avgSentenceLength + " words/sentence, " +
    profile.metrics.vocabularyRichness + " vocabulary, " +
    profile.metrics.metaphorUsage + " metaphors, " +
    profile.metrics.paragraphRhythm + " paragraphs.\n";
}

export function exemplarsToContext(exemplars: VoiceExemplar[], tags?: string[]): string {
  var relevant = tags ? getExemplarsForCraftElement(exemplars, tags) : exemplars;
  var selected = relevant.slice(0, 3);
  if (selected.length === 0) return "";

  var ctx = "[Voice Exemplars]\n";
  for (var i = 0; i < selected.length; i++) {
    ctx += "(" + selected[i].tags.join(", ") + "): " + selected[i].text.slice(0, 300) + "\n\n";
  }
  return ctx;
}

export function antiPatternsToContext(patterns: AntiPattern[]): string {
  var top = patterns.slice(0, 5);
  if (top.length === 0) return "";

  var ctx = "[Anti-Patterns - DO NOT write like this]\n";
  for (var i = 0; i < top.length; i++) {
    ctx += "- " + top[i].reason + ": \"" + top[i].original.slice(0, 100) + "\"";
    if (top[i].correction) ctx += " -> \"" + top[i].correction!.slice(0, 100) + "\"";
    ctx += "\n";
  }
  return ctx;
}
