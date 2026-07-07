import { NextRequest, NextResponse } from "next/server";
import epub from "epub-gen-memory";
import type { Chapter as EpubChapter } from "epub-gen-memory";
import { markdownToHtml, EPUB_CSS } from "@/lib/exportHtml";

interface RequestChapter {
  title: string;
  content: string;
}

interface RequestImage {
  path: string;
  data: string;
}

interface RequestBody {
  book: {
    title: string;
    author: string;
    description?: string;
    coverImage?: string;
    subtitle?: string;
  };
  chapters: RequestChapter[];
  images?: RequestImage[];
}

export async function POST(request: NextRequest) {
  try {
    const body: RequestBody = await request.json();
    const { book, chapters } = body;

    if (!book || !chapters || chapters.length === 0) {
      return NextResponse.json(
        { error: "Missing book or chapters data" },
        { status: 400 },
      );
    }

    const epubChapters: EpubChapter[] = chapters.map(function mapChapter(ch) {
      return {
        title: ch.title,
        content: markdownToHtml(ch.content),
      };
    });

    const buffer = await epub(
      {
        title: book.title,
        author: book.author,
        description: book.description || "",
        cover: book.coverImage || undefined,
        css: EPUB_CSS,
      },
      epubChapters,
    );

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/epub+zip",
        "Content-Disposition": `attachment; filename="${book.title.replace(/[^a-zA-Z0-9 ]/g, "")}.epub"`,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
