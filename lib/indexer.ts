import { getFileContent, getRepoTree } from "@/lib/github";
import {
  readBookSummary, writeBookSummary, readArcSummary, writeArcSummary,
  readChapterSummary, writeChapterSummary, generateSummaryViaAPI,
  buildChapterSummaryPrompt, buildArcSummaryPrompt, buildBookSummaryPrompt,
} from "@/lib/memory";
import { readWorldModel, saveWorldModel, buildWorldModelUpdatePrompt, mergeWorldModelUpdate } from "@/lib/worldModel";
import {
  readNarrativeState as readNarrative, readPromises, readThreads, readTension,
  saveNarrativeState, savePromises, saveThreads, saveTension,
  buildNarrativeUpdatePrompt, mergeNarrativeUpdate,
} from "@/lib/narrativeState";
import { readVoiceProfile, saveVoiceProfile, readDrift, saveDrift, buildVoiceAnalysisPrompt, parseVoiceAnalysisResponse, buildDriftDetectionPrompt } from "@/lib/voiceDna";
import { chunkChapter, readChunks, saveChunks, readManifest, saveManifest, embedChunks, isChapterStale, updateManifestForChapter } from "@/lib/rag";
import type { ScrivaConfig } from "@/types/scriva";
import type { Book } from "@/types";

interface IndexContext {
  token: string;
  apiKey: string;
  voyageKey?: string;
  owner: string;
  repo: string;
  branch: string;
}

export async function fullIndex(
  ctx: IndexContext,
  config: ScrivaConfig,
  book: Book,
): Promise<void> {
  var features = config.features;
  var allChapters = getAllChapters(book);

  var chapterContents: { id: string; title: string; content: string; file: string }[] = [];
  for (var i = 0; i < allChapters.length; i++) {
    try {
      var filePath = book.bookDir + "/" + allChapters[i].file;
      var { content } = await getFileContent(ctx.token, ctx.owner, ctx.repo, filePath, ctx.branch);
      chapterContents.push({
        id: allChapters[i].id,
        title: allChapters[i].label,
        content,
        file: filePath,
      });
    } catch {}
  }

  if (features.chapterSummaries) {
    for (var ci = 0; ci < chapterContents.length; ci++) {
      var ch = chapterContents[ci];
      var prompt = buildChapterSummaryPrompt(ch.title, ch.content);
      var summary = await generateSummaryViaAPI(prompt, ctx.apiKey);
      await writeChapterSummary(ctx, ch.id, summary);
    }

    for (var pi = 0; pi < book.parts.length; pi++) {
      var partChapters = book.parts[pi].chapters;
      var summaries: string[] = [];
      for (var pci = 0; pci < partChapters.length; pci++) {
        var chSummary = await readChapterSummary(ctx, partChapters[pci].id);
        if (chSummary) summaries.push(chSummary);
      }
      if (summaries.length > 0) {
        var arcPrompt = buildArcSummaryPrompt(book.parts[pi].title, summaries);
        var arcSummary = await generateSummaryViaAPI(arcPrompt, ctx.apiKey);
        await writeArcSummary(ctx, "part-" + (pi + 1), arcSummary);
      }
    }

    var arcSummaries: string[] = [];
    for (var ai = 0; ai < book.parts.length; ai++) {
      var arc = await readArcSummary(ctx, "part-" + (ai + 1));
      if (arc) arcSummaries.push(arc);
    }
    if (arcSummaries.length > 0) {
      var bookPrompt = buildBookSummaryPrompt(
        book.title,
        arcSummaries,
        book.themes || [],
        book.logline || "",
      );
      var bookSummary = await generateSummaryViaAPI(bookPrompt, ctx.apiKey);
      await writeBookSummary(ctx, bookSummary);
    }
  }

  if (features.characters || features.worldBuilding) {
    var worldModel = await readWorldModel(ctx);
    for (var wi = 0; wi < chapterContents.length; wi++) {
      var wch = chapterContents[wi];
      var wmPrompt = buildWorldModelUpdatePrompt(wch.title, wch.content, worldModel);
      var wmResponse = await generateSummaryViaAPI(wmPrompt, ctx.apiKey);
      try {
        var wmUpdate = JSON.parse(wmResponse.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());
        worldModel = mergeWorldModelUpdate(worldModel, wmUpdate);
      } catch {}
    }
    await saveWorldModel(ctx, worldModel);
  }

  if (features.narrativeState || features.plotThreads) {
    var state = await readNarrative(ctx);
    var promises = await readPromises(ctx);
    var threads = await readThreads(ctx);
    var tension = await readTension(ctx);

    for (var ni = 0; ni < chapterContents.length; ni++) {
      var nch = chapterContents[ni];
      var nPrompt = buildNarrativeUpdatePrompt(nch.title, nch.content, state, promises, threads);
      var nResponse = await generateSummaryViaAPI(nPrompt, ctx.apiKey);
      try {
        var nUpdate = JSON.parse(nResponse.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());
        var merged = mergeNarrativeUpdate(state, promises, threads, tension, nUpdate);
        state = merged.state;
        promises = merged.promises;
        threads = merged.threads;
        tension = merged.tension;
      } catch {}
    }

    await saveNarrativeState(ctx, state);
    await savePromises(ctx, promises);
    await saveThreads(ctx, threads);
    await saveTension(ctx, tension);
  }

  if (features.voiceProfile && chapterContents.length > 0) {
    var samples = chapterContents.slice(0, 5).map(function getContent(c) { return c.content; });
    var voicePrompt = buildVoiceAnalysisPrompt(samples);
    var voiceResponse = await generateSummaryViaAPI(voicePrompt, ctx.apiKey);
    var voiceProfile = parseVoiceAnalysisResponse(
      voiceResponse,
      chapterContents.slice(0, 5).map(function getId(c) { return c.id; }),
    );
    await saveVoiceProfile(ctx, voiceProfile);
  }

  if (features.rag && ctx.voyageKey && chapterContents.length > 0) {
    var worldForChunking = (features.characters || features.worldBuilding) ? await readWorldModel(ctx) : undefined;
    var allChunks: import("@/types/scriva").TextChunk[] = [];
    for (var ri = 0; ri < chapterContents.length; ri++) {
      var rch = chapterContents[ri];
      var chunks = chunkChapter(rch.content, rch.id, rch.file, worldForChunking);
      allChunks = allChunks.concat(chunks);
    }

    await embedChunks(allChunks, ctx.voyageKey);
    await saveChunks(ctx, allChunks);

    var manifest = await readManifest(ctx);
    for (var mi = 0; mi < chapterContents.length; mi++) {
      manifest = updateManifestForChapter(manifest, chapterContents[mi].id, chapterContents[mi].content, allChunks.length);
    }
    await saveManifest(ctx, manifest);
  }
}

export async function incrementalIndex(
  ctx: IndexContext,
  config: ScrivaConfig,
  book: Book,
  chapterId: string,
  chapterContent: string,
  chapterTitle: string,
): Promise<void> {
  var features = config.features;

  if (features.chapterSummaries) {
    var prompt = buildChapterSummaryPrompt(chapterTitle, chapterContent);
    var summary = await generateSummaryViaAPI(prompt, ctx.apiKey);
    await writeChapterSummary(ctx, chapterId, summary);
  }

  if (features.characters || features.worldBuilding) {
    var worldModel = await readWorldModel(ctx);
    var wmPrompt = buildWorldModelUpdatePrompt(chapterTitle, chapterContent, worldModel);
    var wmResponse = await generateSummaryViaAPI(wmPrompt, ctx.apiKey);
    try {
      var wmUpdate = JSON.parse(wmResponse.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());
      worldModel = mergeWorldModelUpdate(worldModel, wmUpdate);
      await saveWorldModel(ctx, worldModel);
    } catch {}
  }

  if (features.narrativeState || features.plotThreads) {
    var state = await readNarrative(ctx);
    var promises = await readPromises(ctx);
    var threads = await readThreads(ctx);
    var tension = await readTension(ctx);
    var nPrompt = buildNarrativeUpdatePrompt(chapterTitle, chapterContent, state, promises, threads);
    var nResponse = await generateSummaryViaAPI(nPrompt, ctx.apiKey);
    try {
      var nUpdate = JSON.parse(nResponse.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());
      var merged = mergeNarrativeUpdate(state, promises, threads, tension, nUpdate);
      await saveNarrativeState(ctx, merged.state);
      await savePromises(ctx, merged.promises);
      await saveThreads(ctx, merged.threads);
      await saveTension(ctx, merged.tension);
    } catch {}
  }

  if (features.voiceProfile) {
    var profile = await readVoiceProfile(ctx);
    if (profile.summary) {
      var driftPrompt = buildDriftDetectionPrompt(chapterContent, profile);
      var driftResponse = await generateSummaryViaAPI(driftPrompt, ctx.apiKey);
      try {
        var driftData = JSON.parse(driftResponse.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());
        var driftList = await readDrift(ctx);
        var existIdx = driftList.findIndex(function match(d) { return d.chapterId === chapterId; });
        var newDrift = {
          chapterId,
          consistencyScore: driftData.consistencyScore ?? 1,
          driftNotes: driftData.driftNotes ?? [],
          comparedTo: String(profile.lastUpdated),
        };
        if (existIdx !== -1) {
          driftList[existIdx] = newDrift;
        } else {
          driftList.push(newDrift);
        }
        await saveDrift(ctx, driftList);
      } catch {}
    }
  }

  if (features.rag && ctx.voyageKey) {
    var manifest = await readManifest(ctx);
    if (isChapterStale(manifest, chapterId, chapterContent)) {
      var existingChunks = await readChunks(ctx);
      var filtered = existingChunks.filter(function notThisChapter(c) { return c.chapterId !== chapterId; });
      var worldForChunking = (features.characters || features.worldBuilding) ? await readWorldModel(ctx) : undefined;
      var filePath = findChapterFile(book, chapterId);
      var newChunks = chunkChapter(chapterContent, chapterId, filePath || "", worldForChunking);
      var allChunks = filtered.concat(newChunks);
      await saveChunks(ctx, allChunks);
      manifest = updateManifestForChapter(manifest, chapterId, chapterContent, allChunks.length);
      await saveManifest(ctx, manifest);
    }
  }
}

function getAllChapters(book: Book): { id: string; file: string; label: string }[] {
  var all: { id: string; file: string; label: string }[] = [];
  for (var i = 0; i < book.parts.length; i++) {
    for (var j = 0; j < book.parts[i].chapters.length; j++) {
      all.push(book.parts[i].chapters[j]);
    }
  }
  return all;
}

function findChapterFile(book: Book, chapterId: string): string | null {
  for (var i = 0; i < book.parts.length; i++) {
    for (var j = 0; j < book.parts[i].chapters.length; j++) {
      if (book.parts[i].chapters[j].id === chapterId) {
        return book.bookDir + "/" + book.parts[i].chapters[j].file;
      }
    }
  }
  return null;
}
