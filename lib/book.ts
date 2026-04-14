import type { Book, Chapter, Part } from "@/types";

export function createDefaultBook(title: string, author: string): Book {
  return {
    title,
    author,
    bookDir: "book",
    contextDir: "context",
    imagesDir: "images",
    parts: [
      {
        title: "Part One",
        chapters: [
          {
            id: "ch-01",
            file: "ch-01.md",
            label: "Chapter 1",
          },
        ],
      },
    ],
  };
}

export function getChapterPath(
  book: Book,
  chapterId: string,
): string | null {
  for (const part of book.parts) {
    for (const chapter of part.chapters) {
      if (chapter.id === chapterId) {
        return `${book.bookDir}/${chapter.file}`;
      }
    }
  }
  return null;
}

export function getImagePath(book: Book): string {
  return book.imagesDir ?? `${book.bookDir}/images`;
}

export function parseBookStructure(files: string[]): Book {
  // Writing-room model: only files inside the reserved containers `books/`
  // and `pages/` are ever considered chapter content. Everything else in the
  // repo (CLAUDE.md, AGENTS.md, .claude/**/*.md, etc.) must be invisible to
  // the parser.
  const scoped = files.filter(function inRoomPaths(f) {
    return f.startsWith("books/") || f.startsWith("pages/");
  });

  const bookFiles = scoped
    .filter(function isMarkdown(f) {
      return f.endsWith(".md");
    })
    .sort();

  const bookDir = detectBookDir(scoped);
  const contextDir = detectContextDir(scoped);

  const chapterFiles = bookFiles.filter(function inBookDir(f) {
    return f.startsWith(bookDir + "/") || bookDir === ".";
  });

  const parts: Part[] = [];
  const chapters: Chapter[] = [];

  for (const file of chapterFiles) {
    const basename = file.split("/").pop() ?? file;
    const name = basename.replace(/\.md$/, "");
    const id = name.toLowerCase().replace(/[^a-z0-9-]/g, "-");

    chapters.push({
      id,
      file: bookDir === "." ? file : file.slice(bookDir.length + 1),
      label: formatLabel(name),
    });
  }

  if (chapters.length > 0) {
    parts.push({
      title: "Main",
      chapters,
    });
  }

  return {
    title: "Untitled Book",
    author: "Unknown Author",
    bookDir,
    contextDir,
    parts,
  };
}

function detectBookDir(files: string[]): string {
  // Room model: a book lives at books/<slug>/book/. Return the first match.
  // Legacy single-dir candidates (book/, manuscript/, chapters/, ...) are
  // intentionally dropped — the editor always sets bookDir explicitly via
  // the synthesized BookConfig, so this is only a fallback.
  const bookMatch = /^books\/([^/]+)\/book\//;
  for (const f of files) {
    const m = f.match(bookMatch);
    if (m) return "books/" + m[1] + "/book";
  }
  // Otherwise the page container is the fallback.
  return "pages";
}

function detectContextDir(files: string[]): string {
  // Room model: context lives next to a book at books/<slug>/context/.
  const contextMatch = /^books\/([^/]+)\/context\//;
  for (const f of files) {
    const m = f.match(contextMatch);
    if (m) return "books/" + m[1] + "/context";
  }
  // Harmless default — pages don't have a context dir.
  return "context";
}

function formatLabel(name: string): string {
  return name
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, function capitalize(c) {
      return c.toUpperCase();
    });
}
