import type { BookConfig, Book } from "@/types";
import { getItem, setItem } from "@/lib/storage";
import { parseBookStructure } from "@/lib/book";

function isClient(): boolean {
  return typeof window !== "undefined";
}

export function getBookConfig(currentBook?: string): BookConfig | null {
  if (!isClient()) return null;

  const repoKey = currentBook ?? getPersistedBookKey();
  if (!repoKey || repoKey === "local") return null;

  const config = getItem<BookConfig | null>("scriva:config:" + repoKey, null);
  if (config) return config;

  const raw = localStorage.getItem("scriva-current-book");
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    if (!parsed.full_name) return null;

    const [owner, repo] = parsed.full_name.split("/");
    if (!owner || !repo) return null;

    return {
      owner,
      repo,
      branch: parsed.default_branch ?? "main",
      book: {
        title: parsed.name ?? "Untitled",
        author: "Unknown",
        bookDir: "book",
        contextDir: "context",
        parts: [],
      },
    };
  } catch {
    return null;
  }
}

function getPersistedBookKey(): string | null {
  if (!isClient()) return null;

  try {
    const storeRaw = localStorage.getItem("scriva-store");
    if (storeRaw) {
      const storeData = JSON.parse(storeRaw);
      if (storeData?.state?.editor?.currentBook) {
        return storeData.state.editor.currentBook;
      }
    }
  } catch {}

  try {
    const raw = localStorage.getItem("scriva-current-book");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.full_name) return parsed.full_name;
    }
  } catch {}

  return null;
}

export function saveBookConfig(config: BookConfig): void {
  const repoKey = config.owner + "/" + config.repo;
  setItem("scriva:config:" + repoKey, config);
}

export async function fetchAndSaveBookConfig(
  owner: string,
  repo: string,
  branch: string,
  isPrivate?: boolean,
): Promise<BookConfig> {
  let book: Book;

  try {
    const res = await fetch(
      "/api/github/files?owner=" + owner + "&repo=" + repo + "&path=book.json&branch=" + branch,
    );
    if (res.ok) {
      const data = await res.json();
      if (data.content) {
        book = JSON.parse(data.content) as Book;
      } else {
        book = await detectBookStructure(owner, repo, branch);
      }
    } else {
      book = await detectBookStructure(owner, repo, branch);
    }
  } catch {
    book = await detectBookStructure(owner, repo, branch);
  }

  const config: BookConfig = {
    owner,
    repo,
    branch,
    private: isPrivate,
    book,
  };

  saveBookConfig(config);
  return config;
}

async function detectBookStructure(
  owner: string,
  repo: string,
  branch: string,
): Promise<Book> {
  try {
    const res = await fetch(
      "/api/github/tree?owner=" + owner + "&repo=" + repo + "&branch=" + branch,
    );
    if (res.ok) {
      const data = await res.json();
      const files: string[] = data.tree ?? data;
      if (Array.isArray(files) && files.length > 0) {
        return parseBookStructure(files);
      }
    }
  } catch {}

  return {
    title: "Untitled",
    author: "Unknown",
    bookDir: "book",
    contextDir: "context",
    parts: [],
  };
}

export function getRepoInfo(currentBook?: string): { owner: string; repo: string; branch: string } | null {
  const config = getBookConfig(currentBook);
  if (config) {
    return { owner: config.owner, repo: config.repo, branch: config.branch };
  }

  if (!isClient()) return null;

  try {
    const raw = localStorage.getItem("scriva-current-book");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const [owner, repo] = parsed.full_name.split("/");
    return { owner, repo, branch: parsed.default_branch ?? "main" };
  } catch {
    return null;
  }
}
