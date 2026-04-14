import { getFileContent, getRepoTree } from "@/lib/github";
import { estimateTokens } from "@/lib/tokens";
import { getItem } from "@/lib/storage";
import type { ContextRef, BookConfig, Book } from "@/types";

export async function resolveContext(
  ref: ContextRef,
  config: BookConfig,
  token: string,
): Promise<string> {
  const { owner, repo, branch, book } = config;

  if (ref.type === "selection") {
    return ref.key;
  }

  if (ref.type === "chapter") {
    const chapter = findChapterFile(book, ref.key);
    if (!chapter) return `Chapter "${ref.key}" not found.`;
    const { content } = await getFileContent(token, owner, repo, chapter, branch);
    return content;
  }

  if (ref.type === "character") {
    try {
      const { content } = await getFileContent(
        token,
        owner,
        repo,
        "characters.md",
        branch,
      );
      return extractCharacterSection(content, ref.key);
    } catch {
      return `Character "${ref.key}" not found.`;
    }
  }

  if (ref.type === "research") {
    if (!ref.full) {
      const repoKey = `${owner}/${repo}`;
      const cached = getItem<string | null>(
        `scriva:summary:${repoKey}:${ref.key}`,
        null,
      );
      if (cached) return cached;
      return "Summary not yet generated.";
    }

    const filePath = `${book.contextDir}/${ref.key}`;
    const { content } = await getFileContent(token, owner, repo, filePath, branch);
    return content;
  }

  if (ref.type === "outline") {
    try {
      const { content } = await getFileContent(
        token,
        owner,
        repo,
        "outline.json",
        branch,
      );
      return content;
    } catch {
      return "No outline found.";
    }
  }

  if (ref.type === "voice") {
    try {
      const { content } = await getFileContent(
        token,
        owner,
        repo,
        "voice.md",
        branch,
      );
      return content;
    } catch {
      return "No voice guide found.";
    }
  }

  if (ref.type === "book") {
    try {
      const { content } = await getFileContent(
        token,
        owner,
        repo,
        "book.json",
        branch,
      );
      return content;
    } catch {
      return "No book configuration found.";
    }
  }

  return "";
}

export async function listAvailableContexts(
  config: BookConfig,
  token: string,
): Promise<ContextRef[]> {
  const { owner, repo, branch, book } = config;
  const refs: ContextRef[] = [];

  for (const part of book.parts) {
    for (const chapter of part.chapters) {
      refs.push({
        type: "chapter",
        key: chapter.id,
        label: chapter.label,
        tokenCount: chapter.file
          ? await safeTokenCount(token, owner, repo, `${book.bookDir}/${chapter.file}`, branch)
          : 0,
      });
    }
  }

  try {
    const { content: charContent } = await getFileContent(
      token,
      owner,
      repo,
      "characters.md",
      branch,
    );
    const headings = parseMarkdownHeadings(charContent);
    for (const heading of headings) {
      refs.push({
        type: "character",
        key: heading.key,
        label: heading.label,
        tokenCount: estimateTokens(heading.content),
      });
    }
  } catch {
    /* no characters file */
  }

  try {
    const tree = await getRepoTree(token, owner, repo, branch);
    const contextFiles = tree.filter(function isContextFile(path) {
      return path.startsWith(book.contextDir + "/") && !path.endsWith(".gitkeep");
    });
    for (const filePath of contextFiles) {
      const fileName = filePath.split("/").pop() ?? filePath;
      refs.push({
        type: "research",
        key: fileName,
        label: fileName.replace(/\.[^.]+$/, ""),
        tokenCount: await safeTokenCount(token, owner, repo, filePath, branch),
        full: true,
      });
    }
  } catch {
    /* no context dir */
  }

  refs.push({
    type: "outline",
    key: "outline",
    label: "Outline",
    tokenCount: await safeTokenCount(token, owner, repo, "outline.json", branch),
  });

  refs.push({
    type: "voice",
    key: "voice",
    label: "Voice Guide",
    tokenCount: await safeTokenCount(token, owner, repo, "voice.md", branch),
  });

  refs.push({
    type: "book",
    key: "book",
    label: "Book Config",
    tokenCount: await safeTokenCount(token, owner, repo, "book.json", branch),
  });

  return refs;
}

function findChapterFile(book: Book, chapterId: string): string | null {
  for (const part of book.parts) {
    for (const chapter of part.chapters) {
      if (chapter.id === chapterId) {
        return `${book.bookDir}/${chapter.file}`;
      }
    }
  }
  return null;
}

function extractCharacterSection(markdown: string, key: string): string {
  const lines = markdown.split("\n");
  const normalizedKey = key.toLowerCase();
  let capturing = false;
  let depth = 0;
  const result: string[] = [];

  for (const line of lines) {
    const headingMatch = line.match(/^(#{1,3})\s+(.+)/);

    if (headingMatch) {
      const currentDepth = headingMatch[1].length;
      const title = headingMatch[2].trim().toLowerCase();

      if (capturing) {
        if (currentDepth <= depth) break;
      } else if (title === normalizedKey || title.includes(normalizedKey)) {
        capturing = true;
        depth = currentDepth;
      }
    }

    if (capturing) {
      result.push(line);
    }
  }

  if (result.length === 0) {
    return `Character "${key}" not found in characters.md`;
  }

  return result.join("\n").trim();
}

function parseMarkdownHeadings(
  markdown: string,
): { key: string; label: string; content: string }[] {
  const lines = markdown.split("\n");
  const headings: { key: string; label: string; content: string }[] = [];
  let current: { key: string; label: string; lines: string[] } | null = null;

  for (const line of lines) {
    const match = line.match(/^##\s+(.+)/);
    if (match) {
      if (current) {
        headings.push({
          key: current.key,
          label: current.label,
          content: current.lines.join("\n").trim(),
        });
      }
      const label = match[1].trim();
      current = {
        key: label.toLowerCase().replace(/\s+/g, "-"),
        label,
        lines: [line],
      };
    } else if (current) {
      current.lines.push(line);
    }
  }

  if (current) {
    headings.push({
      key: current.key,
      label: current.label,
      content: current.lines.join("\n").trim(),
    });
  }

  return headings;
}

async function safeTokenCount(
  token: string,
  owner: string,
  repo: string,
  path: string,
  branch: string,
): Promise<number> {
  try {
    const { content } = await getFileContent(token, owner, repo, path, branch);
    return estimateTokens(content);
  } catch {
    return 0;
  }
}
