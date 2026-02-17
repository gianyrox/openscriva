import { getFileContent, createOrUpdateFile } from "@/lib/github";
import { estimateTokens } from "@/lib/tokens";
import type { TextChunk, RAGQuery, RAGResult, EmbeddingManifest, WorldModel } from "@/types/scriva";
import { defaultEmbeddingManifest } from "@/types/scriva";

interface RAGContext {
  token: string;
  owner: string;
  repo: string;
  branch: string;
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

function hashContent(content: string): string {
  var hash = 0;
  for (var i = 0; i < content.length; i++) {
    var chr = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0;
  }
  return hash.toString(36);
}

export function chunkChapter(
  content: string,
  chapterId: string,
  source: string,
  worldModel?: WorldModel,
): TextChunk[] {
  var scenes = content.split(/\n\s*(?:\*\s*\*\s*\*|---)\s*\n/);
  var chunks: TextChunk[] = [];
  var totalLength = content.length;
  var offset = 0;

  var characterNames: string[] = [];
  if (worldModel) {
    for (var ci = 0; ci < worldModel.characters.length; ci++) {
      characterNames.push(worldModel.characters[ci].name);
      for (var ai = 0; ai < worldModel.characters[ci].aliases.length; ai++) {
        characterNames.push(worldModel.characters[ci].aliases[ai]);
      }
    }
  }

  for (var si = 0; si < scenes.length; si++) {
    var scene = scenes[si].trim();
    if (!scene) { offset += scenes[si].length + 5; continue; }

    var paragraphs = scene.split(/\n\n+/);
    var currentChunk = "";
    var chunkStart = offset;

    for (var pi = 0; pi < paragraphs.length; pi++) {
      var para = paragraphs[pi].trim();
      if (!para) continue;

      var wouldBe = currentChunk ? currentChunk + "\n\n" + para : para;
      var wouldBeTokens = estimateTokens(wouldBe);

      if (wouldBeTokens > 400 && currentChunk) {
        chunks.push(createChunk(currentChunk, chapterId, source, chunkStart, totalLength, characterNames));
        currentChunk = para;
        chunkStart = offset;
      } else {
        currentChunk = wouldBe;
      }
      offset += para.length + 2;
    }

    if (currentChunk) {
      chunks.push(createChunk(currentChunk, chapterId, source, chunkStart, totalLength, characterNames));
    }

    offset += 5;
  }

  return chunks;
}

function createChunk(
  text: string,
  chapterId: string,
  source: string,
  startOffset: number,
  totalLength: number,
  characterNames: string[],
): TextChunk {
  return {
    id: generateId(),
    text,
    tokens: estimateTokens(text),
    source,
    chapterId,
    type: classifyChunkType(text),
    characters: findCharacters(text, characterNames),
    position: totalLength > 0 ? startOffset / totalLength : 0,
  };
}

function classifyChunkType(text: string): TextChunk["type"] {
  var lines = text.split("\n");
  var dialogueLines = 0;
  var totalLines = lines.length;

  for (var i = 0; i < lines.length; i++) {
    if (/[""\u201C\u201D]/.test(lines[i]) && lines[i].trim().length > 0) {
      dialogueLines++;
    }
  }

  if (totalLines > 0 && dialogueLines / totalLines > 0.5) return "dialogue";

  var lower = text.toLowerCase();
  if (/\b(thought|felt|wondered|realized|remembered|knew|believed)\b/.test(lower)) {
    if (/\b(thought|felt|wondered)\b/.test(lower)) return "interiority";
  }

  if (/\b(ran|jumped|grabbed|slammed|punched|fought|chased|dodged)\b/.test(lower)) {
    return "action";
  }

  if (/\b(the room|the sky|the light|the air|looked like|smelled|the sound)\b/.test(lower)) {
    return "description";
  }

  return "narrative";
}

function findCharacters(text: string, characterNames: string[]): string[] {
  var found: string[] = [];
  var lower = text.toLowerCase();
  for (var i = 0; i < characterNames.length; i++) {
    if (lower.indexOf(characterNames[i].toLowerCase()) !== -1) {
      if (found.indexOf(characterNames[i]) === -1) {
        found.push(characterNames[i]);
      }
    }
  }
  return found;
}

export async function readChunks(ctx: RAGContext): Promise<TextChunk[]> {
  try {
    var result = await getFileContent(ctx.token, ctx.owner, ctx.repo, ".scriva/embeddings/chunks.json", ctx.branch);
    return JSON.parse(result.content) as TextChunk[];
  } catch {
    return [];
  }
}

export async function saveChunks(ctx: RAGContext, chunks: TextChunk[]): Promise<void> {
  var sha: string | undefined;
  try {
    var existing = await getFileContent(ctx.token, ctx.owner, ctx.repo, ".scriva/embeddings/chunks.json", ctx.branch);
    sha = existing.sha;
  } catch {}
  await createOrUpdateFile(ctx.token, ctx.owner, ctx.repo, ".scriva/embeddings/chunks.json", JSON.stringify(chunks), "Update embedding chunks", sha, ctx.branch);
}

export async function readManifest(ctx: RAGContext): Promise<EmbeddingManifest> {
  try {
    var result = await getFileContent(ctx.token, ctx.owner, ctx.repo, ".scriva/embeddings/manifest.json", ctx.branch);
    return JSON.parse(result.content) as EmbeddingManifest;
  } catch {
    return defaultEmbeddingManifest();
  }
}

export async function saveManifest(ctx: RAGContext, manifest: EmbeddingManifest): Promise<void> {
  var sha: string | undefined;
  try {
    var existing = await getFileContent(ctx.token, ctx.owner, ctx.repo, ".scriva/embeddings/manifest.json", ctx.branch);
    sha = existing.sha;
  } catch {}
  await createOrUpdateFile(ctx.token, ctx.owner, ctx.repo, ".scriva/embeddings/manifest.json", JSON.stringify(manifest, null, 2), "Update embedding manifest", sha, ctx.branch);
}

export async function embedChunks(
  chunks: TextChunk[],
  voyageApiKey: string,
): Promise<number[][]> {
  if (chunks.length === 0) return [];

  var texts = chunks.map(function getText(c) { return c.text; });
  var batchSize = 128;
  var allEmbeddings: number[][] = [];

  for (var i = 0; i < texts.length; i += batchSize) {
    var batch = texts.slice(i, i + batchSize);
    var response = await fetch("https://api.voyageai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + voyageApiKey,
      },
      body: JSON.stringify({
        input: batch,
        model: "voyage-3-lite",
      }),
    });

    if (!response.ok) {
      throw new Error("Voyage AI embedding failed: " + response.statusText);
    }

    var data = await response.json() as { data: { embedding: number[] }[] };
    for (var j = 0; j < data.data.length; j++) {
      allEmbeddings.push(data.data[j].embedding);
    }
  }

  return allEmbeddings;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  var dotProduct = 0;
  var normA = 0;
  var normB = 0;
  for (var i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  var denom = Math.sqrt(normA) * Math.sqrt(normB);
  if (denom === 0) return 0;
  return dotProduct / denom;
}

export function searchEmbeddings(
  queryEmbedding: number[],
  chunkEmbeddings: number[][],
  chunks: TextChunk[],
  query: RAGQuery,
): RAGResult[] {
  var scores: { index: number; score: number }[] = [];

  for (var i = 0; i < chunks.length; i++) {
    var chunk = chunks[i];

    if (query.filters) {
      if (query.filters.chapterIds && query.filters.chapterIds.indexOf(chunk.chapterId) === -1) continue;
      if (query.filters.types && query.filters.types.indexOf(chunk.type) === -1) continue;
      if (query.filters.characters) {
        var hasChar = false;
        for (var ci = 0; ci < query.filters.characters.length; ci++) {
          if (chunk.characters.indexOf(query.filters.characters[ci]) !== -1) {
            hasChar = true;
            break;
          }
        }
        if (!hasChar) continue;
      }
    }

    scores.push({ index: i, score: cosineSimilarity(queryEmbedding, chunkEmbeddings[i]) });
  }

  scores.sort(function byScore(a, b) { return b.score - a.score; });

  var topK = Math.min(query.topK, scores.length);
  var results: RAGResult[] = [];

  for (var k = 0; k < topK; k++) {
    var idx = scores[k].index;
    results.push({
      chunk: chunks[idx],
      score: scores[k].score,
      context: chunks[idx].text,
    });
  }

  return results;
}

export function isChapterStale(manifest: EmbeddingManifest, chapterId: string, content: string): boolean {
  var currentHash = hashContent(content);
  return manifest.chapterHashes[chapterId] !== currentHash;
}

export function updateManifestForChapter(manifest: EmbeddingManifest, chapterId: string, content: string, chunkCount: number): EmbeddingManifest {
  return {
    ...manifest,
    chunkCount: chunkCount,
    lastIndexed: Date.now(),
    chapterHashes: { ...manifest.chapterHashes, [chapterId]: hashContent(content) },
  };
}
