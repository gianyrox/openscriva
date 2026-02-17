import { getFileContent, createOrUpdateFile } from "@/lib/github";
import type { WritingRules, LearnedPreference } from "@/types/scriva";
import { defaultWritingRules } from "@/types/scriva";

interface RulesContext {
  token: string;
  owner: string;
  repo: string;
  branch: string;
}

async function readJsonFile<T>(ctx: RulesContext, path: string, fallback: T): Promise<T> {
  try {
    var result = await getFileContent(ctx.token, ctx.owner, ctx.repo, path, ctx.branch);
    return JSON.parse(result.content) as T;
  } catch {
    return fallback;
  }
}

async function writeJsonFile(ctx: RulesContext, path: string, data: unknown, message: string): Promise<void> {
  var sha: string | undefined;
  try {
    var existing = await getFileContent(ctx.token, ctx.owner, ctx.repo, path, ctx.branch);
    sha = existing.sha;
  } catch {}
  await createOrUpdateFile(ctx.token, ctx.owner, ctx.repo, path, JSON.stringify(data, null, 2), message, sha, ctx.branch);
}

export async function readRules(ctx: RulesContext): Promise<WritingRules> {
  return readJsonFile<WritingRules>(ctx, ".scriva/rules.json", defaultWritingRules());
}

export async function saveRules(ctx: RulesContext, rules: WritingRules): Promise<void> {
  await writeJsonFile(ctx, ".scriva/rules.json", rules, "Update writing rules");
}

export async function readLearnedPreferences(ctx: RulesContext): Promise<LearnedPreference[]> {
  return readJsonFile<LearnedPreference[]>(ctx, ".scriva/revision/learned.json", []);
}

export async function saveLearnedPreferences(ctx: RulesContext, prefs: LearnedPreference[]): Promise<void> {
  await writeJsonFile(ctx, ".scriva/revision/learned.json", prefs, "Update learned preferences");
}

export async function recordEditResponse(
  ctx: RulesContext,
  pattern: string,
  accepted: boolean,
): Promise<void> {
  var prefs = await readLearnedPreferences(ctx);
  var existing = prefs.find(function match(p) { return p.pattern === pattern; });

  if (existing) {
    existing.count += 1;
    existing.lastSeen = Date.now();
    if (accepted && existing.authorResponse === "rejected") {
      existing.authorResponse = "accepted";
    } else if (!accepted && existing.authorResponse === "accepted") {
      existing.authorResponse = "rejected";
    }
  } else {
    prefs.push({
      pattern,
      authorResponse: accepted ? "accepted" : "rejected",
      count: 1,
      lastSeen: Date.now(),
    });
  }

  await saveLearnedPreferences(ctx, prefs);
}

export function rulesToPromptSection(rules: WritingRules, chapterId?: string): string {
  var section = "[Writing Rules]\n";

  if (rules.povConsistency) section += "POV: " + rules.povConsistency + "\n";
  if (rules.tenseConsistency) section += "Tense: " + rules.tenseConsistency + "\n";
  if (rules.dialogueStyle) section += "Dialogue: " + rules.dialogueStyle + "\n";
  if (rules.tone.length > 0) section += "Tone: " + rules.tone.join(", ") + "\n";
  if (rules.prefer.length > 0) section += "Prefer: " + rules.prefer.join(", ") + "\n";
  if (rules.avoid.length > 0) section += "Avoid: " + rules.avoid.join(", ") + "\n";
  if (rules.revisionFocus.length > 0) section += "Revision focus: " + rules.revisionFocus.join(", ") + "\n";
  if (rules.customInstructions) section += "\n" + rules.customInstructions + "\n";

  if (chapterId && rules.perChapterOverrides && rules.perChapterOverrides[chapterId]) {
    var overrides = rules.perChapterOverrides[chapterId];
    section += "\n[Chapter-specific overrides]\n";
    if (overrides.povConsistency) section += "POV: " + overrides.povConsistency + "\n";
    if (overrides.tenseConsistency) section += "Tense: " + overrides.tenseConsistency + "\n";
    if (overrides.tone && overrides.tone.length > 0) section += "Tone: " + overrides.tone.join(", ") + "\n";
  }

  return section;
}

export function learnedPreferencesToPromptSection(prefs: LearnedPreference[]): string {
  var rejected = prefs.filter(function isRejected(p) {
    return p.authorResponse === "rejected" && p.count >= 2;
  });

  if (rejected.length === 0) return "";

  var section = "[Learned Preferences - Author has rejected these patterns]\n";
  for (var i = 0; i < Math.min(rejected.length, 10); i++) {
    section += "- " + rejected[i].pattern;
    if (rejected[i].inferredRule) section += " (" + rejected[i].inferredRule + ")";
    section += " [rejected " + rejected[i].count + "x]\n";
  }

  return section;
}
