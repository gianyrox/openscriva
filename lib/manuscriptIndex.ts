import { getItem, setItem } from "@/lib/storage";
import { estimateTokens, estimateCost, formatTokenCount } from "@/lib/tokens";

export interface ChapterIndex {
  chapterId: string;
  title: string;
  characters: string[];
  events: string[];
  openThreads: string[];
  resolvedThreads: string[];
  locations: string[];
  timelinePosition: string;
  emotionalTone: string;
  wordCount: number;
}

export interface ManuscriptIndex {
  chapters: ChapterIndex[];
  lastUpdated: number;
}

function storageKey(repoKey: string): string {
  return "scriva:index:" + repoKey;
}

export function getManuscriptIndex(repoKey: string): ManuscriptIndex | null {
  return getItem<ManuscriptIndex | null>(storageKey(repoKey), null);
}

export function saveManuscriptIndex(repoKey: string, index: ManuscriptIndex): void {
  setItem(storageKey(repoKey), index);
}

export function estimateIndexCost(
  chapters: { id: string; content: string }[],
  model: "haiku" | "sonnet",
): { tokens: number; cost: number; formatted: string } {
  let totalTokens = 0;
  for (let i = 0; i < chapters.length; i++) {
    totalTokens += estimateTokens(chapters[i].content);
  }
  totalTokens += chapters.length * 200;
  const cost = estimateCost(totalTokens, model);
  return {
    tokens: totalTokens,
    cost,
    formatted: "~" + formatTokenCount(totalTokens) + " tokens, ~$" + cost.toFixed(3),
  };
}

export function estimateSingleChapterCost(
  content: string,
  model: "haiku" | "sonnet",
): { tokens: number; cost: number; formatted: string } {
  const tokens = estimateTokens(content) + 200;
  const cost = estimateCost(tokens, model);
  return {
    tokens,
    cost,
    formatted: "~" + formatTokenCount(tokens) + " tokens, ~$" + cost.toFixed(3),
  };
}

export function buildIndexPrompt(chapterTitle: string, content: string): string {
  return "Analyze this chapter and return a JSON object with these fields:\n" +
    "- characters: string[] (all named characters appearing)\n" +
    "- events: string[] (key plot events, max 5)\n" +
    "- openThreads: string[] (unresolved plot threads or questions)\n" +
    "- resolvedThreads: string[] (threads resolved in this chapter)\n" +
    "- locations: string[] (settings/locations mentioned)\n" +
    "- timelinePosition: string (when this takes place relative to the story)\n" +
    "- emotionalTone: string (overall emotional tone in 2-3 words)\n\n" +
    "Chapter: " + chapterTitle + "\n\n" + content + "\n\n" +
    "Return ONLY valid JSON, no markdown fences, no explanation.";
}

export function parseIndexResponse(
  chapterId: string,
  title: string,
  content: string,
  response: string,
): ChapterIndex {
  try {
    const cleaned = response.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(cleaned);
    return {
      chapterId,
      title,
      characters: parsed.characters ?? [],
      events: parsed.events ?? [],
      openThreads: parsed.openThreads ?? [],
      resolvedThreads: parsed.resolvedThreads ?? [],
      locations: parsed.locations ?? [],
      timelinePosition: parsed.timelinePosition ?? "",
      emotionalTone: parsed.emotionalTone ?? "",
      wordCount: content.split(/\s+/).filter(Boolean).length,
    };
  } catch {
    return {
      chapterId,
      title,
      characters: [],
      events: [],
      openThreads: [],
      resolvedThreads: [],
      locations: [],
      timelinePosition: "",
      emotionalTone: "",
      wordCount: content.split(/\s+/).filter(Boolean).length,
    };
  }
}

export function indexToMarkdown(index: ManuscriptIndex): string {
  let md = "# Manuscript Index\n\n";
  md += "Last updated: " + new Date(index.lastUpdated).toLocaleString() + "\n\n";

  for (const ch of index.chapters) {
    md += "## " + ch.title + "\n\n";
    md += "- **Words**: " + ch.wordCount.toLocaleString() + "\n";
    md += "- **Tone**: " + ch.emotionalTone + "\n";
    md += "- **Timeline**: " + ch.timelinePosition + "\n";
    if (ch.characters.length) md += "- **Characters**: " + ch.characters.join(", ") + "\n";
    if (ch.locations.length) md += "- **Locations**: " + ch.locations.join(", ") + "\n";
    if (ch.events.length) md += "- **Events**: " + ch.events.join("; ") + "\n";
    if (ch.openThreads.length) md += "- **Open threads**: " + ch.openThreads.join("; ") + "\n";
    if (ch.resolvedThreads.length) md += "- **Resolved**: " + ch.resolvedThreads.join("; ") + "\n";
    md += "\n";
  }

  return md;
}

export function indexToSystemContext(index: ManuscriptIndex): string {
  let ctx = "[Manuscript Index]\n";
  for (const ch of index.chapters) {
    ctx += ch.title + ": " + ch.emotionalTone + ". ";
    if (ch.characters.length) ctx += "Characters: " + ch.characters.join(", ") + ". ";
    if (ch.events.length) ctx += "Events: " + ch.events.join("; ") + ". ";
    if (ch.openThreads.length) ctx += "Open threads: " + ch.openThreads.join("; ") + ". ";
    ctx += "\n";
  }
  return ctx;
}
