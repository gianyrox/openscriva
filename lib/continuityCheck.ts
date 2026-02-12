import { estimateTokens, estimateCost, formatTokenCount } from "@/lib/tokens";
import type { ManuscriptIndex } from "@/lib/manuscriptIndex";

export interface ContinuityIssue {
  severity: "error" | "warning" | "info";
  chapter: string;
  description: string;
  category: "character" | "timeline" | "plot" | "setting" | "consistency";
}

export interface ContinuityReport {
  issues: ContinuityIssue[];
  lastRun: number;
  chaptersChecked: number;
}

export function estimateContinuityCost(
  index: ManuscriptIndex,
  model: "haiku" | "sonnet",
): { tokens: number; cost: number; formatted: string } {
  let indexText = "";
  for (const ch of index.chapters) {
    indexText += ch.title + " " + ch.characters.join(" ") + " " + ch.events.join(" ") + " ";
    indexText += ch.openThreads.join(" ") + " " + ch.resolvedThreads.join(" ") + " ";
    indexText += ch.locations.join(" ") + " " + ch.timelinePosition + " ";
  }
  const tokens = estimateTokens(indexText) + 500;
  const cost = estimateCost(tokens, model);
  return {
    tokens,
    cost,
    formatted: "Analyze " + index.chapters.length + " chapters (~" + formatTokenCount(tokens) + " tokens). Estimated cost: ~$" + cost.toFixed(3),
  };
}

export function buildContinuityPrompt(index: ManuscriptIndex): string {
  let prompt = "Analyze this manuscript index for continuity issues. Check for:\n" +
    "1. Character inconsistencies (name changes, trait contradictions, disappearances)\n" +
    "2. Timeline problems (events out of order, impossible timing)\n" +
    "3. Unresolved plot threads that were dropped\n" +
    "4. Setting contradictions (locations described differently)\n" +
    "5. Any other consistency issues\n\n" +
    "Manuscript data:\n\n";

  for (const ch of index.chapters) {
    prompt += "Chapter: " + ch.title + "\n";
    prompt += "  Timeline: " + ch.timelinePosition + "\n";
    prompt += "  Tone: " + ch.emotionalTone + "\n";
    prompt += "  Characters: " + ch.characters.join(", ") + "\n";
    prompt += "  Locations: " + ch.locations.join(", ") + "\n";
    prompt += "  Events: " + ch.events.join("; ") + "\n";
    prompt += "  Open threads: " + ch.openThreads.join("; ") + "\n";
    prompt += "  Resolved threads: " + ch.resolvedThreads.join("; ") + "\n\n";
  }

  prompt += "Return a JSON array of issues. Each issue has:\n" +
    "- severity: 'error' | 'warning' | 'info'\n" +
    "- chapter: string (which chapter the issue relates to)\n" +
    "- description: string (clear description of the issue)\n" +
    "- category: 'character' | 'timeline' | 'plot' | 'setting' | 'consistency'\n\n" +
    "Return ONLY valid JSON array, no markdown fences.";

  return prompt;
}

export function parseContinuityResponse(response: string, chapterCount: number): ContinuityReport {
  try {
    const cleaned = response.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const issues = JSON.parse(cleaned) as ContinuityIssue[];
    return {
      issues: Array.isArray(issues) ? issues : [],
      lastRun: Date.now(),
      chaptersChecked: chapterCount,
    };
  } catch {
    return {
      issues: [],
      lastRun: Date.now(),
      chaptersChecked: chapterCount,
    };
  }
}

export function reportToMarkdown(report: ContinuityReport): string {
  let md = "# Continuity Report\n\n";
  md += "Run: " + new Date(report.lastRun).toLocaleString() + "\n";
  md += "Chapters checked: " + report.chaptersChecked + "\n";
  md += "Issues found: " + report.issues.length + "\n\n";

  const errors = report.issues.filter(function isError(i) { return i.severity === "error"; });
  const warnings = report.issues.filter(function isWarning(i) { return i.severity === "warning"; });
  const infos = report.issues.filter(function isInfo(i) { return i.severity === "info"; });

  if (errors.length) {
    md += "## Errors\n\n";
    for (const issue of errors) {
      md += "- **[" + issue.category + "]** " + issue.chapter + ": " + issue.description + "\n";
    }
    md += "\n";
  }

  if (warnings.length) {
    md += "## Warnings\n\n";
    for (const issue of warnings) {
      md += "- **[" + issue.category + "]** " + issue.chapter + ": " + issue.description + "\n";
    }
    md += "\n";
  }

  if (infos.length) {
    md += "## Notes\n\n";
    for (const issue of infos) {
      md += "- **[" + issue.category + "]** " + issue.chapter + ": " + issue.description + "\n";
    }
    md += "\n";
  }

  return md;
}
