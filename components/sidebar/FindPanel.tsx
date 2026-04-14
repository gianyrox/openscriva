"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { Search, Replace, ChevronDown, ChevronRight, CaseSensitive, Regex, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store";
import { getBookConfig } from "@/lib/bookConfig";

interface FileCache {
  content: string;
  sha: string;
}

interface SearchMatch {
  filePath: string;
  fileName: string;
  lineNumber: number;
  lineContent: string;
  matchStart: number;
  matchEnd: number;
}

interface GroupedResults {
  filePath: string;
  fileName: string;
  matches: SearchMatch[];
}

export default function FindPanel() {
  const router = useRouter();
  const currentBook = useAppStore(function selectBook(s) { return s.editor.currentBook; });

  const [query, setQuery] = useState("");
  const [replaceText, setReplaceText] = useState("");
  const [showReplace, setShowReplace] = useState(false);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchMatch[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [collapsedFiles, setCollapsedFiles] = useState<Set<string>>(new Set());

  const fileCacheRef = useRef<Map<string, FileCache>>(new Map());
  const treeLoadedRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  function getRepoInfo(): { owner: string; repo: string; branch: string } | null {
    const config = getBookConfig(currentBook);
    if (!config) return null;
    return { owner: config.owner, repo: config.repo, branch: config.branch };
  }

  async function fetchTree(owner: string, repo: string, branch: string): Promise<string[]> {
    const res = await fetch(
      "/api/github/tree?owner=" + owner + "&repo=" + repo + "&branch=" + branch,
    );
    if (!res.ok) return [];
    const data = await res.json();
    const tree: { path: string; type: string }[] = data.tree ?? [];
    return tree
      .filter(function isBlob(item) {
        return item.type === "blob" && /\.(md|mdx|txt|markdown)$/i.test(item.path);
      })
      .map(function getPath(item) { return item.path; });
  }

  async function fetchFileContent(
    owner: string,
    repo: string,
    branch: string,
    path: string,
  ): Promise<FileCache | null> {
    const cached = fileCacheRef.current.get(path);
    if (cached) return cached;

    const res = await fetch(
      "/api/github/files?owner=" + owner + "&repo=" + repo + "&path=" + encodeURIComponent(path) + "&branch=" + branch,
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.content && data.content !== "") return null;
    const entry: FileCache = { content: data.content, sha: data.sha };
    fileCacheRef.current.set(path, entry);
    return entry;
  }

  async function loadAllFiles(owner: string, repo: string, branch: string): Promise<void> {
    if (treeLoadedRef.current) return;
    const paths = await fetchTree(owner, repo, branch);
    await Promise.allSettled(
      paths.map(function fetchOne(p) { return fetchFileContent(owner, repo, branch, p); }),
    );
    treeLoadedRef.current = true;
  }

  function searchFiles(term: string): SearchMatch[] {
    if (!term) return [];

    const found: SearchMatch[] = [];
    let regex: RegExp;

    try {
      if (useRegex) {
        regex = new RegExp(term, caseSensitive ? "g" : "gi");
      } else {
        const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        regex = new RegExp(escaped, caseSensitive ? "g" : "gi");
      }
    } catch {
      return [];
    }

    fileCacheRef.current.forEach(function scanFile(entry, filePath) {
      const lines = entry.content.split("\n");
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        regex.lastIndex = 0;
        let m = regex.exec(line);
        while (m !== null) {
          found.push({
            filePath,
            fileName: filePath.split("/").pop() ?? filePath,
            lineNumber: i + 1,
            lineContent: line,
            matchStart: m.index,
            matchEnd: m.index + m[0].length,
          });
          if (m[0].length === 0) {
            regex.lastIndex++;
          }
          m = regex.exec(line);
        }
      }
    });

    return found;
  }

  function runSearch(term: string) {
    if (!term.trim()) {
      setResults([]);
      setHasSearched(false);
      setLoading(false);
      return;
    }

    const info = getRepoInfo();
    if (!info) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setHasSearched(true);

    loadAllFiles(info.owner, info.repo, info.branch).then(function afterLoad() {
      const matches = searchFiles(term.trim());
      setResults(matches);
      setLoading(false);
    }).catch(function onErr() {
      setLoading(false);
    });
  }

  function handleQueryChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setQuery(val);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(function debouncedSearch() {
      runSearch(val);
    }, 300);
  }

  function handleReplaceChange(e: React.ChangeEvent<HTMLInputElement>) {
    setReplaceText(e.target.value);
  }

  useEffect(function rerunOnToggle() {
    if (query.trim()) {
      runSearch(query);
    }
  }, [caseSensitive, useRegex]);

  useEffect(function cleanup() {
    return function onUnmount() {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const grouped = useMemo(function groupByFile(): GroupedResults[] {
    const map = new Map<string, SearchMatch[]>();
    const order: string[] = [];
    for (const match of results) {
      if (!map.has(match.filePath)) {
        map.set(match.filePath, []);
        order.push(match.filePath);
      }
      map.get(match.filePath)!.push(match);
    }
    return order.map(function toGroup(fp) {
      const matches = map.get(fp)!;
      return {
        filePath: fp,
        fileName: matches[0].fileName,
        matches,
      };
    });
  }, [results]);

  const fileCount = grouped.length;
  const totalCount = results.length;

  function handleNavigate(filePath: string) {
    router.push("/book/" + filePath);
  }

  function toggleFileCollapse(filePath: string) {
    setCollapsedFiles(function toggle(prev) {
      const next = new Set(prev);
      if (next.has(filePath)) {
        next.delete(filePath);
      } else {
        next.add(filePath);
      }
      return next;
    });
  }

  function buildRegex(term: string): RegExp | null {
    try {
      if (useRegex) {
        return new RegExp(term, caseSensitive ? "g" : "gi");
      }
      const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return new RegExp(escaped, caseSensitive ? "g" : "gi");
    } catch {
      return null;
    }
  }

  async function handleReplaceSingle(match: SearchMatch) {
    const info = getRepoInfo();
    if (!info) return;

    const cached = fileCacheRef.current.get(match.filePath);
    if (!cached) return;

    const lines = cached.content.split("\n");
    const lineIdx = match.lineNumber - 1;
    if (lineIdx < 0 || lineIdx >= lines.length) return;

    const line = lines[lineIdx];
    const original = line.slice(match.matchStart, match.matchEnd);

    let replacement = replaceText;
    if (useRegex) {
      const rx = buildRegex(query);
      if (rx) {
        rx.lastIndex = 0;
        const m = rx.exec(original);
        if (m) {
          replacement = original.replace(rx, replaceText);
        }
      }
    }

    lines[lineIdx] = line.slice(0, match.matchStart) + replacement + line.slice(match.matchEnd);
    const newContent = lines.join("\n");

    fileCacheRef.current.set(match.filePath, { content: newContent, sha: cached.sha });

    try {
      const res = await fetch("/api/github/files", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner: info.owner,
          repo: info.repo,
          path: match.filePath,
          content: newContent,
          sha: cached.sha,
          branch: info.branch,
          message: "Replace in " + match.fileName,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        fileCacheRef.current.set(match.filePath, { content: newContent, sha: data.sha });
      }
    } catch {}

    runSearch(query);
  }

  async function handleReplaceAll() {
    const info = getRepoInfo();
    if (!info || !query.trim()) return;

    const rx = buildRegex(query.trim());
    if (!rx) return;

    const affectedFiles = new Map<string, string>();

    fileCacheRef.current.forEach(function replaceInFile(entry, filePath) {
      rx.lastIndex = 0;
      if (rx.test(entry.content)) {
        rx.lastIndex = 0;
        const newContent = entry.content.replace(rx, replaceText);
        affectedFiles.set(filePath, newContent);
        fileCacheRef.current.set(filePath, { content: newContent, sha: entry.sha });
      }
    });

    const saves = Array.from(affectedFiles.entries()).map(function saveFile([filePath, newContent]) {
      const cached = fileCacheRef.current.get(filePath);
      return fetch("/api/github/files", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner: info.owner,
          repo: info.repo,
          path: filePath,
          content: newContent,
          sha: cached?.sha,
          branch: info.branch,
          message: "Replace all in " + (filePath.split("/").pop() ?? filePath),
        }),
      }).then(function updateSha(res) {
        if (res.ok) {
          return res.json().then(function applySha(data: { sha: string }) {
            fileCacheRef.current.set(filePath, { content: newContent, sha: data.sha });
          });
        }
      }).catch(function noop() {});
    });

    await Promise.allSettled(saves);
    runSearch(query);
  }

  function renderHighlightedLine(match: SearchMatch) {
    const before = match.lineContent.slice(Math.max(0, match.matchStart - 50), match.matchStart);
    const highlighted = match.lineContent.slice(match.matchStart, match.matchEnd);
    const after = match.lineContent.slice(match.matchEnd, match.matchEnd + 50);

    return (
      <span style={{ fontFamily: "var(--font-jetbrains-mono), monospace", fontSize: 12 }}>
        <span style={{ color: "var(--color-text-muted)" }}>
          {match.matchStart > 50 ? "…" : ""}{before}
        </span>
        <span
          style={{
            color: "var(--color-accent)",
            fontWeight: 600,
            backgroundColor: "color-mix(in srgb, var(--color-accent) 15%, transparent)",
            borderRadius: 2,
            padding: "0 1px",
          }}
        >
          {highlighted}
        </span>
        <span style={{ color: "var(--color-text-muted)" }}>
          {after}{match.matchEnd + 50 < match.lineContent.length ? "…" : ""}
        </span>
      </span>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        fontFamily: "var(--font-inter), system-ui, sans-serif",
      }}
    >
      <div style={{ padding: "12px 12px 8px", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 4 }}>
          <button
            onClick={function toggleReplace() { setShowReplace(!showReplace); }}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 22,
              height: 26,
              border: "none",
              background: "transparent",
              cursor: "pointer",
              color: "var(--color-text-muted)",
              borderRadius: 4,
              flexShrink: 0,
              marginTop: 2,
            }}
            title={showReplace ? "Hide replace" : "Show replace"}
          >
            {showReplace ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>

          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                padding: "4px 8px",
                backgroundColor: "var(--color-bg)",
                borderRadius: 6,
                border: "1px solid var(--color-border)",
              }}
            >
              <Search size={13} strokeWidth={1.5} style={{ color: "var(--color-text-muted)", flexShrink: 0 }} />
              <input
                type="text"
                value={query}
                onChange={handleQueryChange}
                placeholder="Search"
                style={{
                  flex: 1,
                  border: "none",
                  background: "none",
                  outline: "none",
                  fontSize: 13,
                  color: "var(--color-text)",
                  fontFamily: "inherit",
                  padding: 0,
                  minWidth: 0,
                }}
              />
              <button
                onClick={function toggleCase() { setCaseSensitive(!caseSensitive); }}
                title="Match case"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 24,
                  height: 22,
                  border: "1px solid " + (caseSensitive ? "var(--color-accent)" : "transparent"),
                  background: caseSensitive ? "color-mix(in srgb, var(--color-accent) 12%, transparent)" : "transparent",
                  borderRadius: 4,
                  cursor: "pointer",
                  color: caseSensitive ? "var(--color-accent)" : "var(--color-text-muted)",
                  flexShrink: 0,
                }}
              >
                <CaseSensitive size={14} strokeWidth={1.5} />
              </button>
              <button
                onClick={function toggleRegex() { setUseRegex(!useRegex); }}
                title="Use regular expression"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 24,
                  height: 22,
                  border: "1px solid " + (useRegex ? "var(--color-accent)" : "transparent"),
                  background: useRegex ? "color-mix(in srgb, var(--color-accent) 12%, transparent)" : "transparent",
                  borderRadius: 4,
                  cursor: "pointer",
                  color: useRegex ? "var(--color-accent)" : "var(--color-text-muted)",
                  flexShrink: 0,
                }}
              >
                <Regex size={14} strokeWidth={1.5} />
              </button>
            </div>

            {showReplace && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "4px 8px",
                  backgroundColor: "var(--color-bg)",
                  borderRadius: 6,
                  border: "1px solid var(--color-border)",
                }}
              >
                <Replace size={13} strokeWidth={1.5} style={{ color: "var(--color-text-muted)", flexShrink: 0 }} />
                <input
                  type="text"
                  value={replaceText}
                  onChange={handleReplaceChange}
                  placeholder="Replace"
                  style={{
                    flex: 1,
                    border: "none",
                    background: "none",
                    outline: "none",
                    fontSize: 13,
                    color: "var(--color-text)",
                    fontFamily: "inherit",
                    padding: 0,
                    minWidth: 0,
                  }}
                />
              </div>
            )}
          </div>
        </div>

        {hasSearched && !loading && results.length > 0 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "6px 4px 2px",
              fontSize: 11,
              color: "var(--color-text-muted)",
            }}
          >
            <span>{totalCount} result{totalCount !== 1 ? "s" : ""} in {fileCount} file{fileCount !== 1 ? "s" : ""}</span>
            {showReplace && (
              <button
                onClick={handleReplaceAll}
                style={{
                  border: "none",
                  background: "none",
                  cursor: "pointer",
                  fontSize: 11,
                  color: "var(--color-accent)",
                  fontFamily: "inherit",
                  padding: "2px 6px",
                  borderRadius: 4,
                }}
                onMouseEnter={function onEnter(e) { e.currentTarget.style.backgroundColor = "var(--color-surface-hover)"; }}
                onMouseLeave={function onLeave(e) { e.currentTarget.style.backgroundColor = "transparent"; }}
              >
                Replace All
              </button>
            )}
          </div>
        )}
      </div>

      <div style={{ flex: 1, overflow: "auto", padding: "0 4px" }}>
        {!query.trim() && !loading && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              gap: 12,
              color: "var(--color-text-muted)",
              padding: 24,
              textAlign: "center",
            }}
          >
            <Search size={32} strokeWidth={1} style={{ opacity: 0.5 }} />
            <span style={{ fontSize: 13 }}>Search your manuscript</span>
          </div>
        )}

        {loading && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              gap: 10,
              color: "var(--color-text-muted)",
            }}
          >
            <Loader2 size={20} strokeWidth={1.5} style={{ animation: "spin 1s linear infinite" }} />
            <span style={{ fontSize: 12 }}>Searching files…</span>
            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {!loading && hasSearched && query.trim() && results.length === 0 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              color: "var(--color-text-muted)",
              fontSize: 13,
            }}
          >
            No results found
          </div>
        )}

        {!loading && grouped.map(function renderGroup(group) {
          const isCollapsed = collapsedFiles.has(group.filePath);

          return (
            <div key={group.filePath} style={{ marginBottom: 2 }}>
              <button
                onClick={function collapseToggle() { toggleFileCollapse(group.filePath); }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  width: "100%",
                  padding: "5px 8px",
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--color-text)",
                  borderRadius: 4,
                  textAlign: "left",
                }}
                onMouseEnter={function onEnter(e) { e.currentTarget.style.backgroundColor = "var(--color-surface-hover)"; }}
                onMouseLeave={function onLeave(e) { e.currentTarget.style.backgroundColor = "transparent"; }}
              >
                {isCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {group.fileName}
                </span>
                <span
                  style={{
                    fontSize: 10,
                    color: "var(--color-text-muted)",
                    backgroundColor: "var(--color-surface)",
                    padding: "1px 6px",
                    borderRadius: 8,
                    fontWeight: 500,
                    flexShrink: 0,
                  }}
                >
                  {group.matches.length}
                </span>
              </button>

              {!isCollapsed && group.matches.slice(0, 50).map(function renderMatch(match, idx) {
                return (
                  <div
                    key={group.filePath + ":" + match.lineNumber + ":" + idx}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      paddingLeft: 24,
                      paddingRight: 4,
                    }}
                  >
                    <button
                      onClick={function navigate() { handleNavigate(match.filePath); }}
                      style={{
                        display: "flex",
                        alignItems: "baseline",
                        gap: 8,
                        flex: 1,
                        padding: "4px 6px",
                        border: "none",
                        background: "transparent",
                        textAlign: "left",
                        cursor: "pointer",
                        fontFamily: "inherit",
                        lineHeight: 1.5,
                        color: "var(--color-text)",
                        borderRadius: 4,
                        overflow: "hidden",
                        minWidth: 0,
                      }}
                      onMouseEnter={function onEnter(e) { e.currentTarget.style.backgroundColor = "var(--color-surface-hover)"; }}
                      onMouseLeave={function onLeave(e) { e.currentTarget.style.backgroundColor = "transparent"; }}
                    >
                      <span
                        style={{
                          fontSize: 10,
                          color: "var(--color-text-muted)",
                          fontFamily: "var(--font-jetbrains-mono), monospace",
                          flexShrink: 0,
                          minWidth: 28,
                          textAlign: "right",
                        }}
                      >
                        {match.lineNumber}
                      </span>
                      <span
                        style={{
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {renderHighlightedLine(match)}
                      </span>
                    </button>
                    {showReplace && (
                      <button
                        onClick={function doReplace() { handleReplaceSingle(match); }}
                        title="Replace"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: 22,
                          height: 22,
                          border: "none",
                          background: "transparent",
                          cursor: "pointer",
                          color: "var(--color-text-muted)",
                          borderRadius: 4,
                          flexShrink: 0,
                        }}
                        onMouseEnter={function onEnter(e) {
                          e.currentTarget.style.backgroundColor = "var(--color-surface-hover)";
                          e.currentTarget.style.color = "var(--color-accent)";
                        }}
                        onMouseLeave={function onLeave(e) {
                          e.currentTarget.style.backgroundColor = "transparent";
                          e.currentTarget.style.color = "var(--color-text-muted)";
                        }}
                      >
                        <Replace size={12} strokeWidth={1.5} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
