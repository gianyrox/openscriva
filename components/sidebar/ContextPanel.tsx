"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  FileText,
  FolderPlus,
  FilePlus,
  ChevronRight,
  Folder,
  Copy,
  Trash2,
  Loader2,
} from "lucide-react";
import { useAppStore } from "@/store";
import { getBookConfig } from "@/lib/bookConfig";
import { estimateTokens, formatTokenCount } from "@/lib/tokens";

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
  expandedFile,
}: {
  entry: FileEntry;
  depth: number;
  onFileClick: (entry: FileEntry) => void;
  onContextMenu: (e: React.MouseEvent, entry: FileEntry) => void;
  expandedFile: string | null;
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
          backgroundColor: !isDir && expandedFile === entry.path
            ? "var(--color-surface-hover)"
            : "transparent",
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
          if (!(!isDir && expandedFile === entry.path)) {
            e.currentTarget.style.backgroundColor = "transparent";
          }
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
                expandedFile={expandedFile}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function ContextPanel() {
  const currentBook = useAppStore(function selectBook(s) {
    return s.editor.currentBook;
  });
  const keysStored = useAppStore(function selectKeys(s) {
    return s.preferences.keysStored;
  });

  const [files, setFiles] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [expandedFile, setExpandedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>("");
  const [fileLoading, setFileLoading] = useState(false);
  const [showNewFile, setShowNewFile] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const contextMenuRef = useRef<HTMLDivElement>(null);

  const config = getBookConfig(currentBook);
  const owner = config?.owner;
  const repo = config?.repo;
  const branch = config?.branch || "main";

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

  const fetchFiles = useCallback(function fetchContextFiles() {
    if (!keysStored || !owner || !repo) return;

    setLoading(true);
    fetch("/api/github/tree?owner=" + owner + "&repo=" + repo + "&branch=" + branch)
      .then(function handleRes(res) {
        if (!res.ok) throw new Error("Failed to fetch");
        return res.json();
      })
      .then(function handleData(data) {
        const tree: string[] = data.tree ?? data;
        if (Array.isArray(tree)) {
          const contextFiles = tree
            .filter(function isContext(p) {
              return p.startsWith("context/") && !p.endsWith(".gitkeep");
            })
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
  }, [keysStored, owner, repo, branch]);

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

  function handleFileClick(entry: FileEntry) {
    if (entry.type === "dir" || !keysStored || !owner || !repo) return;

    if (expandedFile === entry.path) {
      setExpandedFile(null);
      setFileContent("");
      return;
    }

    setExpandedFile(entry.path);
    setFileLoading(true);
    setFileContent("");

    fetch("/api/github/files?owner=" + owner + "&repo=" + repo + "&path=" + encodeURIComponent(entry.path) + "&branch=" + branch)
      .then(function handleRes(res) {
        if (!res.ok) throw new Error("Failed to fetch file");
        return res.json();
      })
      .then(function handleData(data) {
        setFileContent(data.content || "");
      })
      .catch(function handleErr() {
        setFileContent("Failed to load file content.");
      })
      .finally(function done() {
        setFileLoading(false);
      });
  }

  function handleCopyRef(entry: FileEntry) {
    navigator.clipboard.writeText("@" + entry.path);
    setContextMenu(null);
  }

  function handleDeleteFile(entry: FileEntry) {
    if (!keysStored || !owner || !repo || !entry.sha) {
      setContextMenu(null);
      return;
    }

    fetch("/api/github/files", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ owner, repo, path: entry.path, sha: entry.sha }),
    })
      .then(function handleRes() {
        fetchFiles();
        if (expandedFile === entry.path) {
          setExpandedFile(null);
          setFileContent("");
        }
      })
      .catch(function handleErr() {
        alert("Failed to delete file.");
      });

    setContextMenu(null);
  }

  function handleCreateFile() {
    if (!keysStored || !owner || !repo || !newFileName.trim()) return;

    const path = "context/" + newFileName.trim();
    fetch("/api/github/files", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        owner,
        repo,
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
    if (!keysStored || !owner || !repo || !newFolderName.trim()) return;

    const path = "context/" + newFolderName.trim() + "/.gitkeep";
    fetch("/api/github/files", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        owner,
        repo,
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

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        fontFamily: "var(--font-inter), system-ui, sans-serif",
        fontSize: 12,
        position: "relative",
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
              setShowNewFolder(false);
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
            onMouseEnter={function handleEnter(e) {
              e.currentTarget.style.backgroundColor = "var(--color-surface-hover)";
            }}
            onMouseLeave={function handleLeave(e) {
              e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            <FilePlus size={14} />
          </button>
          <button
            onClick={function handleNewFolder() {
              setShowNewFolder(true);
              setShowNewFile(false);
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
            onMouseEnter={function handleEnter(e) {
              e.currentTarget.style.backgroundColor = "var(--color-surface-hover)";
            }}
            onMouseLeave={function handleLeave(e) {
              e.currentTarget.style.backgroundColor = "transparent";
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
            {owner ? "" : " Open a book first."}
          </div>
        ) : (
          <>
            {files.map(function renderEntry(entry) {
              return (
                <FileTreeNode
                  key={entry.path}
                  entry={entry}
                  depth={0}
                  onFileClick={handleFileClick}
                  onContextMenu={function handleCtx(e, ent) {
                    setContextMenu({ x: e.clientX, y: e.clientY, entry: ent });
                  }}
                  expandedFile={expandedFile}
                />
              );
            })}
          </>
        )}

        {expandedFile && (
          <div
            style={{
              margin: "4px 8px",
              padding: 10,
              borderRadius: 6,
              border: "1px solid var(--color-border)",
              backgroundColor: "var(--color-bg)",
              maxHeight: 240,
              overflowY: "auto",
            }}
          >
            {fileLoading ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  color: "var(--color-text-muted)",
                  fontSize: 11,
                }}
              >
                <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} />
                Loading...
              </div>
            ) : (
              <>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 6,
                  }}
                >
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      color: "var(--color-text-muted)",
                      textTransform: "uppercase",
                    }}
                  >
                    {expandedFile.split("/").pop()}
                  </span>
                  {fileContent && (
                    <span
                      style={{
                        fontSize: 10,
                        color: "var(--color-text-muted)",
                      }}
                    >
                      {formatTokenCount(estimateTokens(fileContent))}t
                    </span>
                  )}
                </div>
                <pre
                  style={{
                    fontSize: 11,
                    lineHeight: 1.5,
                    color: "var(--color-text)",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    fontFamily: "var(--font-literata), serif",
                    margin: 0,
                  }}
                >
                  {fileContent || "(empty)"}
                </pre>
              </>
            )}
          </div>
        )}
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
