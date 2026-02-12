"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  FileText,
  FolderPlus,
  FilePlus,
  ChevronRight,
  Folder,
  Copy,
  Trash2,
  Pencil,
  Loader2,
  Save,
  Sparkles,
} from "lucide-react";
import { useAppStore } from "@/store";
import { estimateTokens, formatTokenCount } from "@/lib/tokens";
import FileViewer from "@/components/shared/FileViewer";

interface FileEntry {
  name: string;
  path: string;
  type: "file" | "dir";
  size?: number;
  sha?: string;
  children?: FileEntry[];
}

interface ContextMenuState {
  x: number;
  y: number;
  entry: FileEntry;
}

function FileTreeNode({
  entry,
  depth,
  onFileClick,
  onContextMenu,
}: {
  entry: FileEntry;
  depth: number;
  onFileClick: (entry: FileEntry) => void;
  onContextMenu: (e: React.MouseEvent, entry: FileEntry) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const isDir = entry.type === "dir";
  const tokens = entry.size ? estimateTokens("x".repeat(entry.size)) : 0;

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          padding: "3px 8px 3px " + (8 + depth * 14) + "px",
          cursor: "pointer",
          fontSize: 12,
          borderRadius: 3,
          margin: "0 4px",
          transition: "background 100ms",
        }}
        onClick={function handleClick() {
          if (isDir) {
            setExpanded(function toggle(prev) {
              return !prev;
            });
          } else {
            onFileClick(entry);
          }
        }}
        onContextMenu={function handleCtx(e) {
          e.preventDefault();
          onContextMenu(e, entry);
        }}
        onMouseEnter={function handleEnter(e) {
          e.currentTarget.style.backgroundColor = "var(--color-surface-hover)";
        }}
        onMouseLeave={function handleLeave(e) {
          e.currentTarget.style.backgroundColor = "transparent";
        }}
      >
        {isDir ? (
          <>
            <ChevronRight
              size={12}
              style={{
                transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
                transition: "transform 150ms",
                flexShrink: 0,
                color: "var(--color-text-muted)",
              }}
            />
            <Folder
              size={14}
              style={{ flexShrink: 0, color: "var(--color-accent)", opacity: 0.8 }}
            />
          </>
        ) : (
          <>
            <span style={{ width: 12, flexShrink: 0 }} />
            <FileText
              size={14}
              style={{ flexShrink: 0, color: "var(--color-text-muted)", opacity: 0.7 }}
            />
          </>
        )}
        <span
          style={{
            flex: 1,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            color: "var(--color-text)",
          }}
        >
          {entry.name}
        </span>
        {!isDir && tokens > 0 && (
          <span
            style={{
              fontSize: 10,
              color: "var(--color-text-muted)",
              flexShrink: 0,
            }}
          >
            {formatTokenCount(tokens)}t
          </span>
        )}
      </div>

      {isDir && expanded && entry.children && (
        <div>
          {entry.children.map(function renderChild(child) {
            return (
              <FileTreeNode
                key={child.path}
                entry={child}
                depth={depth + 1}
                onFileClick={onFileClick}
                onContextMenu={onContextMenu}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function ResearchPanel() {
  const keysStored = useAppStore(function selectKeys(s) {
    return s.preferences.keysStored;
  });
  const currentBook = useAppStore(function selectBook(s) {
    return s.editor.currentBook;
  });
  const defaultModel = useAppStore(function selectModel(s) {
    return s.preferences.defaultModel;
  });

  const [files, setFiles] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewingFile, setViewingFile] = useState<{ name: string; content: string } | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [splitRatio, setSplitRatio] = useState(0.5);
  const [researchPrompt, setResearchPrompt] = useState("");
  const [craftedPrompt, setCraftedPrompt] = useState("");
  const [researchResult, setResearchResult] = useState("");
  const [researching, setResearching] = useState(false);
  const [building, setBuilding] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [showNewFile, setShowNewFile] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [showNewFolder, setShowNewFolder] = useState(false);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const splitRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  const bookInfo = parseBookInfo(currentBook);

  function parseBookInfo(fullName: string | undefined): { owner: string; repo: string } | null {
    if (!fullName) return null;
    const parts = fullName.split("/");
    if (parts.length !== 2) return null;
    return { owner: parts[0], repo: parts[1] };
  }

  const fetchFiles = useCallback(function fetchContextFiles() {
    if (!keysStored || !bookInfo) return;

    setLoading(true);
    fetch("/api/github/tree?owner=" + bookInfo.owner + "&repo=" + bookInfo.repo + "&branch=main")
      .then(function handleRes(res) {
        if (!res.ok) throw new Error("Failed to fetch");
        return res.json();
      })
      .then(function handleData(data) {
        const tree: string[] = data.tree ?? data;
        if (Array.isArray(tree)) {
          const contextFiles = tree
            .filter(function isContext(p) { return p.startsWith("context/") && !p.endsWith(".gitkeep"); })
            .map(function toEntry(p) {
              const name = p.split("/").pop() ?? p;
              return { name, path: p, type: "file" as const, size: 0 };
            });
          setFiles(buildTree(contextFiles));
        }
      })
      .catch(function handleErr() {
        setFiles([]);
      })
      .finally(function done() {
        setLoading(false);
      });
  }, [keysStored, bookInfo?.owner, bookInfo?.repo]);

  useEffect(function loadFiles() {
    fetchFiles();
  }, [fetchFiles]);

  useEffect(function handleClickOutside() {
    function handler(e: MouseEvent) {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    }
    document.addEventListener("mousedown", handler);
    return function cleanup() {
      document.removeEventListener("mousedown", handler);
    };
  }, []);

  function buildTree(entries: { name: string; path: string; type: string; size?: number; sha?: string }[]): FileEntry[] {
    const dirs: Record<string, FileEntry> = {};
    const topLevel: FileEntry[] = [];

    const sorted = [...entries].sort(function sortEntries(a, b) {
      if (a.type === "dir" && b.type !== "dir") return -1;
      if (a.type !== "dir" && b.type === "dir") return 1;
      return a.name.localeCompare(b.name);
    });

    for (const e of sorted) {
      const entry: FileEntry = {
        name: e.name,
        path: e.path,
        type: e.type === "dir" ? "dir" : "file",
        size: e.size,
        sha: e.sha,
        children: e.type === "dir" ? [] : undefined,
      };

      const parentPath = e.path.substring(0, e.path.lastIndexOf("/"));
      if (parentPath && dirs[parentPath]) {
        dirs[parentPath].children!.push(entry);
      } else {
        topLevel.push(entry);
      }

      if (e.type === "dir") {
        dirs[e.path] = entry;
      }
    }

    return topLevel;
  }

  function handleFileClick(entry: FileEntry) {
    if (entry.type === "dir" || !keysStored || !bookInfo) return;

    fetch("/api/github/files?owner=" + bookInfo.owner + "&repo=" + bookInfo.repo + "&path=" + encodeURIComponent(entry.path))
      .then(function handleRes(res) {
        if (!res.ok) throw new Error("Failed to fetch file");
        return res.json();
      })
      .then(function handleData(data) {
        setViewingFile({ name: entry.name, content: data.content || "" });
      })
      .catch(function handleErr() {
        setViewingFile({ name: entry.name, content: "Failed to load file content." });
      });
  }

  function handleCopyRef(entry: FileEntry) {
    navigator.clipboard.writeText("@" + entry.path);
    setContextMenu(null);
  }

  function handleDeleteFile(entry: FileEntry) {
    if (!keysStored || !bookInfo || !entry.sha) {
      setContextMenu(null);
      return;
    }

    fetch("/api/github/files", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ owner: bookInfo.owner, repo: bookInfo.repo, path: entry.path, sha: entry.sha }),
    })
      .then(function handleRes() {
        fetchFiles();
      })
      .catch(function handleErr() {
        alert("Failed to delete file.");
      });

    setContextMenu(null);
  }

  function handleCreateFile() {
    if (!keysStored || !bookInfo || !newFileName.trim()) return;

    const path = "context/" + newFileName.trim();
    fetch("/api/github/files", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        owner: bookInfo.owner,
        repo: bookInfo.repo,
        path,
        content: "",
        message: "Create " + path,
      }),
    })
      .then(function handleRes() {
        fetchFiles();
        setShowNewFile(false);
        setNewFileName("");
      })
      .catch(function handleErr() {
        alert("Failed to create file.");
      });
  }

  function handleCreateFolder() {
    if (!keysStored || !bookInfo || !newFolderName.trim()) return;

    const path = "context/" + newFolderName.trim() + "/.gitkeep";
    fetch("/api/github/files", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        owner: bookInfo.owner,
        repo: bookInfo.repo,
        path,
        content: "",
        message: "Create folder " + newFolderName.trim(),
      }),
    })
      .then(function handleRes() {
        fetchFiles();
        setShowNewFolder(false);
        setNewFolderName("");
      })
      .catch(function handleErr() {
        alert("Failed to create folder.");
      });
  }

  function handleBuildPrompt() {
    if (!keysStored || !researchPrompt.trim()) return;

    setBuilding(true);
    fetch("/api/ai/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        mode: "research-prompt",
        model: defaultModel,
        messages: [
          {
            role: "user",
            content:
              "Help me build a thorough research prompt for this topic. Return ONLY the prompt text, ready to use:\n\n" +
              researchPrompt.trim(),
          },
        ],
      }),
    })
      .then(function handleRes(res) {
        if (!res.ok) throw new Error("API error");
        return res.body;
      })
      .then(function handleBody(body) {
        if (!body) throw new Error("No body");
        const reader = body.getReader();
        const decoder = new TextDecoder();
        let result = "";

        function read(): Promise<void> {
          return reader.read().then(function process({ done, value }) {
            if (done) {
              setCraftedPrompt(result);
              setBuilding(false);
              return;
            }
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split("\n");
            for (const line of lines) {
              if (!line.startsWith("data: ")) continue;
              const data = line.slice(6);
              if (data === "[DONE]") continue;
              try {
                const parsed = JSON.parse(data);
                if (parsed.text) result += parsed.text;
              } catch {
                /* skip */
              }
            }
            return read();
          });
        }

        return read();
      })
      .catch(function handleErr() {
        setBuilding(false);
        setCraftedPrompt("Failed to build prompt. Check your API key.");
      });
  }

  function handleRunResearch() {
    if (!keysStored || !craftedPrompt.trim()) return;

    setResearching(true);
    setResearchResult("");

    fetch("/api/ai/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        mode: "research",
        instruction: craftedPrompt.trim(),
        model: defaultModel,
      }),
    })
      .then(function handleRes(res) {
        if (!res.ok) throw new Error("API error");
        return res.json();
      })
      .then(function handleData(data) {
        setResearchResult(data.result || "");
        setResearching(false);
      })
      .catch(function handleErr() {
        setResearchResult("Research failed. Check your API key and try again.");
        setResearching(false);
      });
  }

  function handleCopyPrompt() {
    navigator.clipboard.writeText(craftedPrompt);
  }

  function handleSaveToContext() {
    if (!keysStored || !bookInfo || !researchResult) return;

    const slug = researchPrompt
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .substring(0, 40);
    const path = "context/research-" + slug + ".md";

    fetch("/api/github/files", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        owner: bookInfo.owner,
        repo: bookInfo.repo,
        path,
        content: "# Research: " + researchPrompt.trim() + "\n\n" + researchResult,
        message: "Add research: " + researchPrompt.trim().substring(0, 60),
      }),
    })
      .then(function handleRes() {
        fetchFiles();
        alert("Saved to " + path);
      })
      .catch(function handleErr() {
        alert("Failed to save research.");
      });
  }

  function handleResizeStart() {
    draggingRef.current = true;

    function handleMouseMove(e: MouseEvent) {
      if (!draggingRef.current || !splitRef.current) return;
      const rect = splitRef.current.getBoundingClientRect();
      const ratio = (e.clientY - rect.top) / rect.height;
      setSplitRatio(Math.max(0.2, Math.min(0.8, ratio)));
    }

    function handleMouseUp() {
      draggingRef.current = false;
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    }

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }

  if (viewingFile) {
    return (
      <FileViewer
        filename={viewingFile.name}
        content={viewingFile.content}
        onClose={function handleClose() {
          setViewingFile(null);
        }}
      />
    );
  }

  return (
    <div
      ref={splitRef}
      style={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        minHeight: 0,
        fontFamily: "var(--font-inter), system-ui, sans-serif",
        fontSize: 12,
        position: "relative",
      }}
    >
      <div
        style={{
          flex: splitRatio,
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "8px 12px",
            borderBottom: "1px solid var(--color-border)",
            flexShrink: 0,
          }}
        >
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "var(--color-text-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
          >
            Context Files
          </span>
          <div style={{ display: "flex", gap: 2 }}>
            <button
              onClick={function handleNewFile() {
                setShowNewFile(true);
              }}
              title="New File"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 24,
                height: 24,
                border: "none",
                background: "none",
                color: "var(--color-text-muted)",
                cursor: "pointer",
                borderRadius: 4,
              }}
            >
              <FilePlus size={14} />
            </button>
            <button
              onClick={function handleNewFolder() {
                setShowNewFolder(true);
              }}
              title="New Folder"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 24,
                height: 24,
                border: "none",
                background: "none",
                color: "var(--color-text-muted)",
                cursor: "pointer",
                borderRadius: 4,
              }}
            >
              <FolderPlus size={14} />
            </button>
          </div>
        </div>

        {showNewFile && (
          <div
            style={{
              display: "flex",
              gap: 4,
              padding: "6px 8px",
              borderBottom: "1px solid var(--color-border)",
            }}
          >
            <input
              type="text"
              value={newFileName}
              onChange={function handleChange(e) {
                setNewFileName(e.target.value);
              }}
              onKeyDown={function handleKey(e) {
                if (e.key === "Enter") handleCreateFile();
                if (e.key === "Escape") {
                  setShowNewFile(false);
                  setNewFileName("");
                }
              }}
              placeholder="filename.md"
              autoFocus
              style={{
                flex: 1,
                fontSize: 12,
                padding: "4px 8px",
                border: "1px solid var(--color-border)",
                borderRadius: 4,
                backgroundColor: "var(--color-bg)",
                color: "var(--color-text)",
                outline: "none",
                fontFamily: "inherit",
              }}
            />
            <button
              onClick={handleCreateFile}
              style={{
                fontSize: 11,
                padding: "3px 8px",
                border: "none",
                borderRadius: 4,
                backgroundColor: "var(--color-accent)",
                color: "#fff",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Add
            </button>
          </div>
        )}

        {showNewFolder && (
          <div
            style={{
              display: "flex",
              gap: 4,
              padding: "6px 8px",
              borderBottom: "1px solid var(--color-border)",
            }}
          >
            <input
              type="text"
              value={newFolderName}
              onChange={function handleChange(e) {
                setNewFolderName(e.target.value);
              }}
              onKeyDown={function handleKey(e) {
                if (e.key === "Enter") handleCreateFolder();
                if (e.key === "Escape") {
                  setShowNewFolder(false);
                  setNewFolderName("");
                }
              }}
              placeholder="folder-name"
              autoFocus
              style={{
                flex: 1,
                fontSize: 12,
                padding: "4px 8px",
                border: "1px solid var(--color-border)",
                borderRadius: 4,
                backgroundColor: "var(--color-bg)",
                color: "var(--color-text)",
                outline: "none",
                fontFamily: "inherit",
              }}
            />
            <button
              onClick={handleCreateFolder}
              style={{
                fontSize: 11,
                padding: "3px 8px",
                border: "none",
                borderRadius: 4,
                backgroundColor: "var(--color-accent)",
                color: "#fff",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Add
            </button>
          </div>
        )}

        <div style={{ flex: 1, overflowY: "auto", padding: "4px 0" }}>
          {loading ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 24,
                color: "var(--color-text-muted)",
              }}
            >
              <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          ) : files.length === 0 ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 24,
                color: "var(--color-text-muted)",
                fontSize: 12,
                textAlign: "center",
              }}
            >
              No context files yet.
              {bookInfo ? "" : " Open a book first."}
            </div>
          ) : (
            files.map(function renderEntry(entry) {
              return (
                <FileTreeNode
                  key={entry.path}
                  entry={entry}
                  depth={0}
                  onFileClick={handleFileClick}
                  onContextMenu={function handleCtx(e, ent) {
                    setContextMenu({ x: e.clientX, y: e.clientY, entry: ent });
                  }}
                />
              );
            })
          )}
        </div>
      </div>

      <div
        style={{
          height: 5,
          backgroundColor: "var(--color-border)",
          cursor: "row-resize",
          flexShrink: 0,
          position: "relative",
        }}
        onMouseDown={handleResizeStart}
      >
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            width: 24,
            height: 3,
            borderRadius: 2,
            backgroundColor: "var(--color-text-muted)",
            opacity: 0.3,
          }}
        />
      </div>

      <div
        style={{
          flex: 1 - splitRatio,
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "8px 12px",
            borderBottom: "1px solid var(--color-border)",
            flexShrink: 0,
          }}
        >
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "var(--color-text-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
          >
            Prompt Builder
          </span>
        </div>

        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: 10,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <textarea
            value={researchPrompt}
            onChange={function handleChange(e) {
              setResearchPrompt(e.target.value);
            }}
            placeholder="Describe what you need to research..."
            rows={3}
            style={{
              fontSize: 12,
              fontFamily: "inherit",
              padding: "8px 10px",
              border: "1px solid var(--color-border)",
              borderRadius: 6,
              backgroundColor: "var(--color-bg)",
              color: "var(--color-text)",
              outline: "none",
              resize: "vertical",
              lineHeight: 1.5,
              minHeight: 60,
            }}
          />

          <button
            onClick={handleBuildPrompt}
            disabled={!researchPrompt.trim() || building || !keysStored}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              padding: "6px 12px",
              fontSize: 12,
              fontFamily: "inherit",
              fontWeight: 500,
              border: "1px solid var(--color-accent)",
              borderRadius: 6,
              backgroundColor: "color-mix(in srgb, var(--color-accent) 8%, transparent)",
              color: "var(--color-accent)",
              cursor:
                !researchPrompt.trim() || building || !keysStored ? "default" : "pointer",
              opacity: !researchPrompt.trim() || building || !keysStored ? 0.5 : 1,
              transition: "background 150ms",
            }}
          >
            <Sparkles size={13} />
            {building ? "Building..." : "Build Prompt"}
          </button>

          {craftedPrompt && (
            <>
              <textarea
                value={craftedPrompt}
                onChange={function handleChange(e) {
                  setCraftedPrompt(e.target.value);
                }}
                rows={5}
                style={{
                  fontSize: 12,
                  fontFamily: "inherit",
                  padding: "8px 10px",
                  border: "1px solid var(--color-border)",
                  borderRadius: 6,
                  backgroundColor: "var(--color-bg)",
                  color: "var(--color-text)",
                  outline: "none",
                  resize: "vertical",
                  lineHeight: 1.5,
                  minHeight: 80,
                }}
              />

              <div style={{ display: "flex", gap: 6 }}>
                <button
                  onClick={handleRunResearch}
                  disabled={researching || !keysStored}
                  style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    padding: "6px 12px",
                    fontSize: 12,
                    fontFamily: "inherit",
                    fontWeight: 500,
                    border: "none",
                    borderRadius: 6,
                    backgroundColor: "var(--color-accent)",
                    color: "#fff",
                    cursor: researching || !keysStored ? "default" : "pointer",
                    opacity: researching || !keysStored ? 0.6 : 1,
                  }}
                >
                  {researching ? (
                    <>
                      <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} />
                      Researching...
                    </>
                  ) : (
                    "Run in Scriva"
                  )}
                </button>

                <button
                  onClick={handleCopyPrompt}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 5,
                    padding: "6px 12px",
                    fontSize: 12,
                    fontFamily: "inherit",
                    fontWeight: 500,
                    border: "1px solid var(--color-border)",
                    borderRadius: 6,
                    backgroundColor: "transparent",
                    color: "var(--color-text-muted)",
                    cursor: "pointer",
                  }}
                >
                  <Copy size={12} />
                  Copy
                </button>
              </div>
            </>
          )}

          {researchResult && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 6,
                padding: 10,
                border: "1px solid var(--color-border)",
                borderRadius: 6,
                backgroundColor: "var(--color-bg)",
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: "var(--color-text-muted)",
                  textTransform: "uppercase",
                }}
              >
                Result
              </div>
              <div
                style={{
                  fontSize: 12,
                  lineHeight: 1.6,
                  color: "var(--color-text)",
                  maxHeight: 200,
                  overflowY: "auto",
                  whiteSpace: "pre-wrap",
                }}
              >
                {researchResult}
              </div>
              <button
                onClick={handleSaveToContext}
                disabled={!keysStored || !bookInfo}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  padding: "5px 10px",
                  fontSize: 11,
                  fontFamily: "inherit",
                  fontWeight: 500,
                  border: "1px solid var(--color-border)",
                  borderRadius: 5,
                  backgroundColor: "transparent",
                  color: "var(--color-text)",
                  cursor: !keysStored || !bookInfo ? "default" : "pointer",
                }}
              >
                <Save size={12} />
                Save to Context
              </button>
            </div>
          )}
        </div>
      </div>

      {contextMenu && (
        <div
          ref={contextMenuRef}
          style={{
            position: "fixed",
            top: contextMenu.y,
            left: contextMenu.x,
            backgroundColor: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: 8,
            boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
            padding: 4,
            zIndex: 9999,
            minWidth: 140,
            fontSize: 12,
          }}
        >
          <button
            onClick={function handleRename() {
              setContextMenu(null);
              alert("Rename is not yet implemented.");
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              width: "100%",
              padding: "6px 10px",
              border: "none",
              background: "none",
              color: "var(--color-text)",
              fontSize: 12,
              fontFamily: "inherit",
              cursor: "pointer",
              borderRadius: 4,
              textAlign: "left",
            }}
            onMouseEnter={function handleEnter(e) {
              e.currentTarget.style.backgroundColor = "var(--color-surface-hover)";
            }}
            onMouseLeave={function handleLeave(e) {
              e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            <Pencil size={13} />
            Rename
          </button>

          <button
            onClick={function handleCopy() {
              handleCopyRef(contextMenu.entry);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              width: "100%",
              padding: "6px 10px",
              border: "none",
              background: "none",
              color: "var(--color-text)",
              fontSize: 12,
              fontFamily: "inherit",
              cursor: "pointer",
              borderRadius: 4,
              textAlign: "left",
            }}
            onMouseEnter={function handleEnter(e) {
              e.currentTarget.style.backgroundColor = "var(--color-surface-hover)";
            }}
            onMouseLeave={function handleLeave(e) {
              e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            <Copy size={13} />
            Copy @reference
          </button>

          <div
            style={{
              height: 1,
              backgroundColor: "var(--color-border)",
              margin: "4px 0",
            }}
          />

          <button
            onClick={function handleDel() {
              handleDeleteFile(contextMenu.entry);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              width: "100%",
              padding: "6px 10px",
              border: "none",
              background: "none",
              color: "#d9534f",
              fontSize: 12,
              fontFamily: "inherit",
              cursor: "pointer",
              borderRadius: 4,
              textAlign: "left",
            }}
            onMouseEnter={function handleEnter(e) {
              e.currentTarget.style.backgroundColor = "var(--color-surface-hover)";
            }}
            onMouseLeave={function handleLeave(e) {
              e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            <Trash2 size={13} />
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
