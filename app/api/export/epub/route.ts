import { NextRequest, NextResponse } from "next/server";
import epub from "epub-gen-memory";
import type { Chapter as EpubChapter } from "epub-gen-memory";

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

function markdownToHtml(md: string): string {
  let html = md;
  html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>");
  html = html.replace(/^## (.+)$/gm, "<h2>$1</h2>");
  html = html.replace(/^# (.+)$/gm, "<h1>$1</h1>");
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" />');
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  html = html.replace(/^> (.+)$/gm, "<blockquote><p>$1</p></blockquote>");
  html = html.replace(/^---$/gm, "<hr />");
  html = html.replace(/^- (.+)$/gm, "<li>$1</li>");
  html = html.replace(/(<li>.*<\/li>\n?)+/g, function wrapUl(match) {
    return "<ul>" + match + "</ul>";
  });

  const lines = html.split("\n");
  const result: string[] = [];
  let inParagraph = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === "") {
      if (inParagraph) {
        result.push("</p>");
        inParagraph = false;
      }
    } else if (
      trimmed.startsWith("<h") ||
      trimmed.startsWith("<blockquote") ||
      trimmed.startsWith("<hr") ||
      trimmed.startsWith("<ul") ||
      trimmed.startsWith("<li") ||
      trimmed.startsWith("<img")
    ) {
      if (inParagraph) {
        result.push("</p>");
        inParagraph = false;
      }
      result.push(trimmed);
    } else {
      if (!inParagraph) {
        result.push("<p>");
        inParagraph = true;
      }
      result.push(trimmed);
    }
  }

  if (inParagraph) {
    result.push("</p>");
  }

  return result.join("\n");
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

    const epubCss = `
      body {
        font-family: 'Literata', Georgia, 'Times New Roman', serif;
        font-size: 18px;
        line-height: 1.9;
        color: #2C2C2C;
        max-width: 100%;
      }
      h1 { font-size: 28px; font-weight: 700; margin-top: 2rem; margin-bottom: 1rem; }
      h2 { font-size: 22px; font-weight: 600; margin-top: 1.8rem; margin-bottom: 0.8rem; }
      h3 { font-size: 18px; font-weight: 600; margin-top: 1.5rem; margin-bottom: 0.6rem; }
      p { margin-bottom: 1.2rem; text-indent: 1.5em; }
      p:first-child { text-indent: 0; }
      blockquote {
        border-left: 3px solid #B8860B;
        padding-left: 1.2rem;
        font-style: italic;
        color: #6B6B6B;
        margin: 1.2rem 0;
      }
      img { max-width: 100%; display: block; margin: 1.5rem auto; }
      hr { border: none; text-align: center; margin: 2rem 0; }
      hr::after { content: '· · ·'; color: #6B6B6B; letter-spacing: 0.5em; }
      code { font-family: monospace; font-size: 0.9em; background: #f0f0f0; padding: 2px 6px; border-radius: 3px; }
      a { color: #B8860B; text-decoration: none; }
    `;

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
        css: epubCss,
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
