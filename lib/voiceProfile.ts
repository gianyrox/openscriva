import { getItem, setItem } from "@/lib/storage";
import { estimateTokens, estimateCost, formatTokenCount } from "@/lib/tokens";

export interface VoiceMetrics {
  avgSentenceLength: number;
  vocabularyRichness: string;
  povStyle: string;
  dialogueToNarrationRatio: string;
  metaphorUsage: string;
  paragraphRhythm: string;
  tenseUsage: string;
}

export interface VoiceProfile {
  summary: string;
  metrics: VoiceMetrics;
  lastUpdated: number;
  analyzedChapters: string[];
}

function storageKey(repoKey: string): string {
  return "scriva:voice:" + repoKey;
}

export function getVoiceProfile(repoKey: string): VoiceProfile | null {
  return getItem<VoiceProfile | null>(storageKey(repoKey), null);
}

export function saveVoiceProfile(repoKey: string, profile: VoiceProfile): void {
  setItem(storageKey(repoKey), profile);
}

export function estimateVoiceCost(
  chapters: { id: string; content: string }[],
  model: "haiku" | "sonnet",
): { tokens: number; cost: number; formatted: string } {
  let totalTokens = 0;
  const selected = chapters.slice(0, 5);
  for (let i = 0; i < selected.length; i++) {
    totalTokens += estimateTokens(selected[i].content);
  }
  totalTokens += 500;
  const cost = estimateCost(totalTokens, model);
  return {
    tokens: totalTokens,
    cost,
    formatted: "~" + formatTokenCount(totalTokens) + " tokens, ~$" + cost.toFixed(3),
  };
}

export function buildVoicePrompt(chapterContents: string[]): string {
  let prompt = "Analyze the following writing samples and create a detailed voice profile.\n\n" +
    "Return a JSON object with these fields:\n" +
    "- summary: string (2-3 paragraph description of the author's voice and style)\n" +
    "- metrics: object with:\n" +
    "  - avgSentenceLength: number (average words per sentence)\n" +
    "  - vocabularyRichness: string (e.g. 'high', 'moderate', 'restrained')\n" +
    "  - povStyle: string (e.g. 'third person limited', 'first person intimate')\n" +
    "  - dialogueToNarrationRatio: string (e.g. '40/60', 'dialogue-heavy')\n" +
    "  - metaphorUsage: string (e.g. 'frequent and vivid', 'sparse and precise')\n" +
    "  - paragraphRhythm: string (e.g. 'short punchy paragraphs', 'long flowing paragraphs')\n" +
    "  - tenseUsage: string (e.g. 'past tense', 'present tense', 'mixed')\n\n";

  for (let i = 0; i < chapterContents.length; i++) {
    prompt += "--- Sample " + (i + 1) + " ---\n" + chapterContents[i].slice(0, 3000) + "\n\n";
  }

  prompt += "Return ONLY valid JSON, no markdown fences, no explanation.";
  return prompt;
}

export function parseVoiceResponse(
  response: string,
  analyzedChapters: string[],
): VoiceProfile {
  try {
    const cleaned = response.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(cleaned);
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
      lastUpdated: Date.now(),
      analyzedChapters,
    };
  } catch {
    return {
      summary: response,
      metrics: {
        avgSentenceLength: 0,
        vocabularyRichness: "",
        povStyle: "",
        dialogueToNarrationRatio: "",
        metaphorUsage: "",
        paragraphRhythm: "",
        tenseUsage: "",
      },
      lastUpdated: Date.now(),
      analyzedChapters,
    };
  }
}

export function profileToMarkdown(profile: VoiceProfile): string {
  let md = "# Voice Profile\n\n";
  md += "Last analyzed: " + new Date(profile.lastUpdated).toLocaleString() + "\n\n";
  md += profile.summary + "\n\n";
  md += "## Style Metrics\n\n";
  md += "| Metric | Value |\n|--------|-------|\n";
  md += "| Avg sentence length | " + profile.metrics.avgSentenceLength + " words |\n";
  md += "| Vocabulary | " + profile.metrics.vocabularyRichness + " |\n";
  md += "| POV style | " + profile.metrics.povStyle + " |\n";
  md += "| Dialogue:Narration | " + profile.metrics.dialogueToNarrationRatio + " |\n";
  md += "| Metaphor usage | " + profile.metrics.metaphorUsage + " |\n";
  md += "| Paragraph rhythm | " + profile.metrics.paragraphRhythm + " |\n";
  md += "| Tense | " + profile.metrics.tenseUsage + " |\n";
  return md;
}

export function profileToSystemContext(profile: VoiceProfile): string {
  return "[Author Voice Profile]\n" +
    profile.summary + "\n" +
    "Style: " + profile.metrics.povStyle + ", " +
    profile.metrics.tenseUsage + ", " +
    "avg " + profile.metrics.avgSentenceLength + " words/sentence, " +
    profile.metrics.vocabularyRichness + " vocabulary, " +
    profile.metrics.metaphorUsage + " metaphors, " +
    profile.metrics.paragraphRhythm + " paragraphs.\n";
}
