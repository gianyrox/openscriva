import { getFileContent, createOrUpdateFile } from "@/lib/github";
import type { CitationEntry } from "@/types/scriva";

interface CitationContext {
  token: string;
  owner: string;
  repo: string;
  branch: string;
}

export async function readCitations(ctx: CitationContext): Promise<CitationEntry[]> {
  try {
    var result = await getFileContent(ctx.token, ctx.owner, ctx.repo, ".scriva/citations.json", ctx.branch);
    return JSON.parse(result.content) as CitationEntry[];
  } catch {
    return [];
  }
}

export async function saveCitations(ctx: CitationContext, citations: CitationEntry[]): Promise<void> {
  var sha: string | undefined;
  try {
    var existing = await getFileContent(ctx.token, ctx.owner, ctx.repo, ".scriva/citations.json", ctx.branch);
    sha = existing.sha;
  } catch {}
  await createOrUpdateFile(ctx.token, ctx.owner, ctx.repo, ".scriva/citations.json", JSON.stringify(citations, null, 2), "Update citations", sha, ctx.branch);
}

export function formatCitation(entry: CitationEntry, style: "apa" | "chicago" | "mla"): string {
  var authors = entry.authors.join(", ");

  if (style === "apa") {
    var result = authors;
    if (entry.year) result += " (" + entry.year + ")";
    result += ". " + entry.title + ".";
    if (entry.journal) result += " " + entry.journal;
    if (entry.volume) result += ", " + entry.volume;
    if (entry.issue) result += "(" + entry.issue + ")";
    if (entry.pages) result += ", " + entry.pages;
    result += ".";
    if (entry.doi) result += " https://doi.org/" + entry.doi;
    return result;
  }

  if (style === "chicago") {
    var result2 = authors + ". ";
    if (entry.year) result2 += entry.year + ". ";
    result2 += "\"" + entry.title + ".\"";
    if (entry.journal) result2 += " " + entry.journal;
    if (entry.volume) result2 += " " + entry.volume;
    if (entry.issue) result2 += ", no. " + entry.issue;
    if (entry.year) result2 += " (" + entry.year + ")";
    if (entry.pages) result2 += ": " + entry.pages;
    result2 += ".";
    return result2;
  }

  var result3 = authors + ". ";
  result3 += "\"" + entry.title + ".\" ";
  if (entry.journal) result3 += entry.journal + " ";
  if (entry.volume) result3 += entry.volume;
  if (entry.issue) result3 += "." + entry.issue;
  if (entry.year) result3 += " (" + entry.year + ")";
  if (entry.pages) result3 += ": " + entry.pages;
  result3 += ".";
  return result3;
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

export function createCitation(partial: Partial<CitationEntry>): CitationEntry {
  return {
    id: partial.id || generateId(),
    type: partial.type || "book",
    title: partial.title || "",
    authors: partial.authors || [],
    year: partial.year,
    publisher: partial.publisher,
    url: partial.url,
    doi: partial.doi,
    journal: partial.journal,
    volume: partial.volume,
    issue: partial.issue,
    pages: partial.pages,
    accessDate: partial.accessDate,
    notes: partial.notes,
  };
}
