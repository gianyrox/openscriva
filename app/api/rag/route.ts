import { NextRequest, NextResponse } from "next/server";
import { readChunks, embedChunks, searchEmbeddings, cosineSimilarity } from "@/lib/rag";
import type { TextChunk, RAGQuery } from "@/types/scriva";

var cachedChunks: TextChunk[] = [];
var cachedEmbeddings: number[][] = [];
var cachedBookKey: string = "";

export async function POST(request: NextRequest) {
  try {
    var body = await request.json();
    var action = body.action as string;

    if (action === "load") {
      var chunks = body.chunks as TextChunk[];
      var voyageKey = body.voyageKey as string;

      if (!voyageKey || !chunks || chunks.length === 0) {
        return NextResponse.json({ error: "Missing chunks or API key" }, { status: 400 });
      }

      cachedChunks = chunks;
      cachedBookKey = body.bookKey || "";
      cachedEmbeddings = await embedChunks(chunks, voyageKey);

      return NextResponse.json({
        success: true,
        chunkCount: cachedChunks.length,
        embeddingCount: cachedEmbeddings.length,
      });
    }

    if (action === "query") {
      var query = body.query as RAGQuery;
      var voyageKeyQ = body.voyageKey as string;

      if (!query || !query.text) {
        return NextResponse.json({ error: "Missing query" }, { status: 400 });
      }

      if (cachedChunks.length === 0 || cachedEmbeddings.length === 0) {
        return NextResponse.json({ results: [] });
      }

      var queryEmbeddings = await embedChunks(
        [{ id: "query", text: query.text, tokens: 0, source: "", chapterId: "", type: "narrative", characters: [], position: 0 }],
        voyageKeyQ,
      );

      if (queryEmbeddings.length === 0) {
        return NextResponse.json({ results: [] });
      }

      var results = searchEmbeddings(queryEmbeddings[0], cachedEmbeddings, cachedChunks, query);

      return NextResponse.json({ results });
    }

    if (action === "status") {
      return NextResponse.json({
        loaded: cachedChunks.length > 0,
        chunkCount: cachedChunks.length,
        bookKey: cachedBookKey,
      });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err: unknown) {
    var message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
