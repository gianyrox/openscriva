import { getFileContent, createOrUpdateFile } from "@/lib/github";
import type { NarrativeState, NarrativePromise, PlotThread, TensionData } from "@/types/scriva";
import { defaultNarrativeState } from "@/types/scriva";

interface NarrativeContext {
  token: string;
  owner: string;
  repo: string;
  branch: string;
}

async function readJsonFile<T>(ctx: NarrativeContext, path: string, fallback: T): Promise<T> {
  try {
    var result = await getFileContent(ctx.token, ctx.owner, ctx.repo, path, ctx.branch);
    return JSON.parse(result.content) as T;
  } catch {
    return fallback;
  }
}

async function writeJsonFile(ctx: NarrativeContext, path: string, data: unknown, message: string): Promise<void> {
  var sha: string | undefined;
  try {
    var existing = await getFileContent(ctx.token, ctx.owner, ctx.repo, path, ctx.branch);
    sha = existing.sha;
  } catch {}
  await createOrUpdateFile(ctx.token, ctx.owner, ctx.repo, path, JSON.stringify(data, null, 2), message, sha, ctx.branch);
}

export async function readNarrativeState(ctx: NarrativeContext): Promise<NarrativeState> {
  return readJsonFile<NarrativeState>(ctx, ".scriva/narrative/state.json", defaultNarrativeState());
}

export async function readPromises(ctx: NarrativeContext): Promise<NarrativePromise[]> {
  return readJsonFile<NarrativePromise[]>(ctx, ".scriva/narrative/promises.json", []);
}

export async function readThreads(ctx: NarrativeContext): Promise<PlotThread[]> {
  return readJsonFile<PlotThread[]>(ctx, ".scriva/narrative/threads.json", []);
}

export async function readTension(ctx: NarrativeContext): Promise<TensionData[]> {
  return readJsonFile<TensionData[]>(ctx, ".scriva/narrative/tension.json", []);
}

export async function saveNarrativeState(ctx: NarrativeContext, state: NarrativeState): Promise<void> {
  await writeJsonFile(ctx, ".scriva/narrative/state.json", state, "Update narrative state");
}

export async function savePromises(ctx: NarrativeContext, promises: NarrativePromise[]): Promise<void> {
  await writeJsonFile(ctx, ".scriva/narrative/promises.json", promises, "Update narrative promises");
}

export async function saveThreads(ctx: NarrativeContext, threads: PlotThread[]): Promise<void> {
  await writeJsonFile(ctx, ".scriva/narrative/threads.json", threads, "Update plot threads");
}

export async function saveTension(ctx: NarrativeContext, tension: TensionData[]): Promise<void> {
  await writeJsonFile(ctx, ".scriva/narrative/tension.json", tension, "Update tension data");
}

export function getPromisesDue(promises: NarrativePromise[], chapterId: string): NarrativePromise[] {
  return promises.filter(function isDue(p) {
    return (p.status === "planted" || p.status === "growing" || p.status === "due") && !p._override;
  });
}

export function getActiveThreads(threads: PlotThread[]): PlotThread[] {
  return threads.filter(function isActive(t) {
    return t.status === "open" || t.status === "progressing";
  });
}

export function getThreadsForChapter(threads: PlotThread[], chapterId: string): PlotThread[] {
  return threads.filter(function inChapter(t) {
    return t.chapters.indexOf(chapterId) !== -1;
  });
}

export function getTensionCurve(tension: TensionData[]): TensionData[] {
  return tension.slice().sort(function byChapter(a, b) {
    return a.chapterId.localeCompare(b.chapterId);
  });
}

export function buildNarrativeUpdatePrompt(
  chapterTitle: string,
  chapterContent: string,
  currentState: NarrativeState,
  currentPromises: NarrativePromise[],
  currentThreads: PlotThread[],
): string {
  var ctx = "Current narrative state:\n";
  ctx += "Story point: " + (currentState.currentPoint || "unknown") + "\n";
  ctx += "Reader knows: " + currentState.readerKnows.join("; ") + "\n";
  ctx += "Reader expects: " + currentState.readerExpects.join("; ") + "\n";
  ctx += "Active promises: " + currentPromises.filter(function active(p) { return p.status !== "paid" && p.status !== "abandoned"; }).map(function desc(p) { return p.setup + " (" + p.status + ")"; }).join("; ") + "\n";
  ctx += "Active threads: " + currentThreads.filter(function active(t) { return t.status === "open" || t.status === "progressing"; }).map(function desc(t) { return t.name + " (" + t.status + ")"; }).join("; ") + "\n";

  return "Given the current narrative state and a new/updated chapter, return a JSON object with three keys:\n" +
    "1. \"state\": updated NarrativeState { currentPoint, readerKnows, readerExpects, dramaticIrony }\n" +
    "2. \"promises\": array of new or updated NarrativePromise entries { id, setup, setupChapter, payoffChapter?, status, urgency }\n" +
    "3. \"threads\": array of new or updated PlotThread entries { id, name, status, chapters, summary }\n" +
    "4. \"tension\": TensionData for this chapter { chapterId, tensionLevel (1-10), pacingNote, emotionalBeat }\n\n" +
    "Do NOT modify entries with _override: true.\n\n" +
    ctx + "\nChapter: " + chapterTitle + "\n" + chapterContent.slice(0, 10000) + "\n\nReturn ONLY valid JSON, no markdown fences.";
}

export function mergeNarrativeUpdate(
  currentState: NarrativeState,
  currentPromises: NarrativePromise[],
  currentThreads: PlotThread[],
  currentTension: TensionData[],
  update: { state?: NarrativeState; promises?: NarrativePromise[]; threads?: PlotThread[]; tension?: TensionData },
): { state: NarrativeState; promises: NarrativePromise[]; threads: PlotThread[]; tension: TensionData[] } {
  var state = currentState;
  if (update.state && !currentState._override) {
    state = { ...update.state, _override: currentState._override };
  }

  var promises = currentPromises.slice();
  if (update.promises) {
    for (var i = 0; i < update.promises.length; i++) {
      var up = update.promises[i];
      var idx = promises.findIndex(function match(p) { return p.id === up.id; });
      if (idx !== -1) {
        if (!promises[idx]._override) promises[idx] = up;
      } else {
        promises.push(up);
      }
    }
  }

  var threads = currentThreads.slice();
  if (update.threads) {
    for (var j = 0; j < update.threads.length; j++) {
      var ut = update.threads[j];
      var tidx = threads.findIndex(function match(t) { return t.id === ut.id; });
      if (tidx !== -1) {
        if (!threads[tidx]._override) threads[tidx] = ut;
      } else {
        threads.push(ut);
      }
    }
  }

  var tension = currentTension.slice();
  if (update.tension) {
    var existIdx = tension.findIndex(function match(t) { return t.chapterId === update.tension!.chapterId; });
    if (existIdx !== -1) {
      tension[existIdx] = update.tension;
    } else {
      tension.push(update.tension);
    }
  }

  return { state, promises, threads, tension };
}

export function narrativeToContext(
  state: NarrativeState,
  promises: NarrativePromise[],
  threads: PlotThread[],
): string {
  var ctx = "[Narrative State]\n";
  ctx += "Current point: " + state.currentPoint + "\n";
  if (state.readerExpects.length > 0) {
    ctx += "Reader expects: " + state.readerExpects.join("; ") + "\n";
  }

  var activePromises = promises.filter(function active(p) {
    return p.status === "planted" || p.status === "growing" || p.status === "due";
  });
  if (activePromises.length > 0) {
    ctx += "Open promises: " + activePromises.map(function desc(p) {
      return p.setup + " (planted ch." + p.setupChapter + ", " + p.urgency + " urgency)";
    }).join("; ") + "\n";
  }

  var activeThreads = threads.filter(function active(t) {
    return t.status === "open" || t.status === "progressing";
  });
  if (activeThreads.length > 0) {
    ctx += "Active threads: " + activeThreads.map(function desc(t) {
      return t.name + " (" + t.status + ")";
    }).join("; ") + "\n";
  }

  return ctx;
}
