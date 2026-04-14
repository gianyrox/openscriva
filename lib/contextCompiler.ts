import { estimateTokens } from "@/lib/tokens";
import { readBookSummary, readArcSummary, readChapterSummary } from "@/lib/memory";
import { readWorldModel, worldModelToContext, getCharactersInChapter } from "@/lib/worldModel";
import { readNarrativeState as readNarrative, readPromises, readThreads, narrativeToContext, getPromisesDue, getActiveThreads } from "@/lib/narrativeState";
import { readVoiceProfile, readExemplars, readAntiPatterns, voiceToCompactContext, exemplarsToContext, antiPatternsToContext } from "@/lib/voiceDna";
import { readRules, readLearnedPreferences, rulesToPromptSection, learnedPreferencesToPromptSection } from "@/lib/writingRules";
import type { CompileTask, ContextBriefing, BriefingSection, ScrivaConfig } from "@/types/scriva";
import type { BookConfig, Book } from "@/types";

interface CompilerContext {
  token: string;
  owner: string;
  repo: string;
  branch: string;
}

function tokenBudgetForTask(taskType: string, configBudget?: number): number {
  var budgets: Record<string, number> = {
    chat: 2000,
    write: 4000,
    continue: 4000,
    edit: 3000,
    critique: 5000,
    research: 4000,
    "revision-plan": 6000,
  };
  return configBudget || budgets[taskType] || 4000;
}

function addSection(
  sections: BriefingSection[],
  label: string,
  content: string,
  priority: BriefingSection["priority"],
  source: string,
): void {
  if (!content || content.trim().length === 0) return;
  sections.push({
    label,
    content: content.trim(),
    tokens: estimateTokens(content),
    priority,
    source,
  });
}

function fillToBudget(sections: BriefingSection[], budget: number): BriefingSection[] {
  var priorityOrder: BriefingSection["priority"][] = ["critical", "high", "medium", "low"];
  var sorted: BriefingSection[] = [];

  for (var p = 0; p < priorityOrder.length; p++) {
    for (var i = 0; i < sections.length; i++) {
      if (sections[i].priority === priorityOrder[p]) {
        sorted.push(sections[i]);
      }
    }
  }

  var result: BriefingSection[] = [];
  var totalTokens = 0;

  for (var j = 0; j < sorted.length; j++) {
    if (totalTokens + sorted[j].tokens <= budget) {
      result.push(sorted[j]);
      totalTokens += sorted[j].tokens;
    }
  }

  return result;
}

export async function compileBriefing(
  task: CompileTask,
  ctx: CompilerContext,
  config: ScrivaConfig,
  book: Book,
): Promise<ContextBriefing> {
  var budget = tokenBudgetForTask(task.type, config.ai.contextBudget);
  var sections: BriefingSection[] = [];
  var features = config.features;

  var bookSummary = await readBookSummary(ctx);
  addSection(sections, "Book Summary", bookSummary, "critical", ".scriva/memory/book.md");

  var rules = await readRules(ctx);
  var rulesText = rulesToPromptSection(rules, task.chapterId);
  addSection(sections, "Writing Rules", rulesText, "critical", ".scriva/rules.json");

  if (features.voiceProfile) {
    var profile = await readVoiceProfile(ctx);
    addSection(sections, "Voice Profile", voiceToCompactContext(profile), "critical", ".scriva/voice/profile.json");
  }

  if (task.type === "write" || task.type === "continue" || task.type === "edit") {
    if (features.voiceProfile) {
      var craftTags = task.type === "edit" ? ["dialogue", "description"] : ["dialogue", "description", "narrative"];
      var exemplars = await readExemplars(ctx);
      addSection(sections, "Voice Exemplars", exemplarsToContext(exemplars, craftTags), "high", ".scriva/voice/exemplars.json");

      var antiPatterns = await readAntiPatterns(ctx);
      addSection(sections, "Anti-Patterns", antiPatternsToContext(antiPatterns), "high", ".scriva/voice/antipatterns.json");
    }
  }

  if (task.chapterId) {
    var partId = findPartForChapter(book, task.chapterId);
    if (partId) {
      var arcSummary = await readArcSummary(ctx, partId);
      addSection(sections, "Arc Summary", arcSummary, "medium", ".scriva/memory/arcs/" + partId + ".md");
    }

    var neighbors = getNeighborChapterIds(book, task.chapterId);
    for (var ni = 0; ni < neighbors.length; ni++) {
      var neighborSummary = await readChapterSummary(ctx, neighbors[ni]);
      addSection(sections, "Chapter Summary: " + neighbors[ni], neighborSummary, "high", ".scriva/memory/chapters/" + neighbors[ni] + ".md");
    }
  }

  if (features.characters && task.chapterId) {
    var worldModel = await readWorldModel(ctx);
    var chapterChars = getCharactersInChapter(worldModel, task.chapterId);
    if (chapterChars.length > 0) {
      addSection(sections, "World Model", worldModelToContext(worldModel, task.chapterId), "high", ".scriva/characters.json");
    }
  }

  if (features.narrativeState || features.plotThreads) {
    var narrativeState = await readNarrative(ctx);
    var promises = await readPromises(ctx);
    var threads = await readThreads(ctx);
    addSection(sections, "Narrative State", narrativeToContext(narrativeState, promises, threads), "medium", ".scriva/narrative/");

    if (task.chapterId && features.plotThreads) {
      var duePromises = getPromisesDue(promises, task.chapterId);
      if (duePromises.length > 0) {
        var dueText = "[Promises Due]\n" + duePromises.map(function desc(p) {
          return "- " + p.setup + " (planted ch." + p.setupChapter + ", " + p.urgency + ")";
        }).join("\n");
        addSection(sections, "Promises Due", dueText, "medium", ".scriva/narrative/promises.json");
      }
    }
  }

  var learnedPrefs = await readLearnedPreferences(ctx);
  var learnedText = learnedPreferencesToPromptSection(learnedPrefs);
  addSection(sections, "Learned Preferences", learnedText, "low", ".scriva/revision/learned.json");

  var filled = fillToBudget(sections, budget);
  var totalTokens = 0;
  for (var fi = 0; fi < filled.length; fi++) {
    totalTokens += filled[fi].tokens;
  }

  return {
    budget,
    sections: filled,
    totalTokens,
  };
}

export function briefingToSystemPrompt(briefing: ContextBriefing, bookTitle: string): string {
  var prompt = "You are an AI writing assistant and co-writer for the book '" + bookTitle + "'. You have deep knowledge of the entire manuscript. Be direct, specific, and constructive.\n\n";

  for (var i = 0; i < briefing.sections.length; i++) {
    prompt += briefing.sections[i].content + "\n\n";
  }

  return prompt;
}

function findPartForChapter(book: Book, chapterId: string): string | null {
  for (var i = 0; i < book.parts.length; i++) {
    for (var j = 0; j < book.parts[i].chapters.length; j++) {
      if (book.parts[i].chapters[j].id === chapterId) {
        var partTitle = book.parts[i].title.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
        return "part-" + (i + 1);
      }
    }
  }
  return null;
}

function getNeighborChapterIds(book: Book, chapterId: string): string[] {
  var allChapters: string[] = [];
  for (var i = 0; i < book.parts.length; i++) {
    for (var j = 0; j < book.parts[i].chapters.length; j++) {
      allChapters.push(book.parts[i].chapters[j].id);
    }
  }

  var idx = allChapters.indexOf(chapterId);
  if (idx === -1) return [];

  var neighbors: string[] = [];
  if (idx > 0) neighbors.push(allChapters[idx - 1]);
  if (idx < allChapters.length - 1) neighbors.push(allChapters[idx + 1]);
  return neighbors;
}
