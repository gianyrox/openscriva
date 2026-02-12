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
  const bookFiles = files
    .filter(function isMarkdown(f) {
      return f.endsWith(".md");
    })
    .sort();

  const bookDir = detectBookDir(bookFiles);
  const contextDir = detectContextDir(files);

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
  const dirs = ["book", "manuscript", "chapters", "content", "text", "draft"];
  for (const dir of dirs) {
    if (
      files.some(function startsWithDir(f) {
        return f.startsWith(dir + "/");
      })
    ) {
      return dir;
    }
  }
  return "book";
}

function detectContextDir(files: string[]): string {
  const dirs = ["context", "notes", "research", "reference"];
  for (const dir of dirs) {
    if (
      files.some(function startsWithDir(f) {
        return f.startsWith(dir + "/");
      })
    ) {
      return dir;
    }
  }
  return "context";
}

function formatLabel(name: string): string {
  return name
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, function capitalize(c) {
      return c.toUpperCase();
    });
}
