"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  ChevronRight,
  ChevronDown,
  FolderClosed,
  FolderOpen,
  FileText,
  FileCode,
  File,
  Braces,
  Table,
  Image as ImageIcon,
  BookOpen,
  Mic,
  Users,
  ListTree,
  RotateCw,
  Loader2,
  Plus,
  FolderPlus,
  Pencil,
  Trash2,
  Copy,
} from "lucide-react";
import { useAppStore } from "@/store";
import type { FileTreeNode } from "@/types";

interface ContextMenuState {
  x: number;
  y: number;
  node: FileTreeNode | null;
}

interface InlineInputState {
  parentPath: string;
  type: "file" | "folder" | "rename";
  initialValue: string;
  originalPath?: string;
}

function getFileIcon(name: string, path: string) {
  if (name === "book.json") return { icon: BookOpen, color: "var(--color-accent)" };
  if (name === "voice.md") return { icon: Mic, color: "var(--color-accent)" };
  if (name === "characters.md") return { icon: Users, color: "var(--color-accent)" };
  if (name === "outline.json") return { icon: ListTree, color: "var(--color-accent)" };

  const ext = name.split(".").pop()?.toLowerCase() ?? "";

  if (ext === "md") return { icon: FileText, color: undefined };
  if (ext === "json") return { icon: Braces, color: undefined };
  if (ext === "txt") return { icon: FileText, color: undefined };
  if (ext === "py") return { icon: FileCode, color: undefined };
  if (ext === "js" || ext === "ts" || ext === "tsx" || ext === "jsx") return { icon: FileCode, color: undefined };
  if (ext === "csv") return { icon: Table, color: undefined };
  if (ext === "png" || ext === "jpg" || ext === "jpeg" || ext === "gif" || ext === "svg" || ext === "webp") return { icon: ImageIcon, color: undefined };

  return { icon: File, color: undefined };
}

function buildTree(paths: string[]): FileTreeNode[] {
  const root: FileTreeNode = { name: "", path: "", type: "dir", children: [] };

  for (const filePath of paths) {
    const parts = filePath.split("/");
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const currentPath = parts.slice(0, i + 1).join("/");
      const isFile = i === parts.length - 1;

      let existing = current.children?.find(function findChild(c) {
        return c.name === part;
      });

      if (!existing) {
        existing = {
          name: part,
          path: currentPath,
          type: isFile ? "file" : "dir",
          children: isFile ? undefined : [],
        };
        current.children!.push(existing);
      }

      if (!isFile) {
        current = existing;
      }
    }
  }

  function sortNodes(nodes: FileTreeNode[]): FileTreeNode[] {
    return nodes.sort(function compare(a, b) {
      if (a.type !== b.type) {
        return a.type === "dir" ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    }).map(function recurse(node) {
      if (node.children) {
        return { ...node, children: sortNodes(node.children) };
      }
      return node;
    });
  }

  return sortNodes(root.children ?? []);
}

function getExpandedKey(repoFullName: string): string {
  return "scriva-expanded-" + repoFullName;
}

export default function FileExplorer() {
  const router = useRouter();
  const pathname = usePathname();
  const keysStored = useAppStore(function selectKeysStored(s) {
    return s.preferences.keysStored;
  });
  const currentChapter = useAppStore(function selectChapter(s) {
    return s.editor.currentChapter;
  });

  const [tree, setTree] = useState<FileTreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [inlineInput, setInlineInput] = useState<InlineInputState | null>(null);
  const [repoInfo, setRepoInfo] = useState<{ owner: string; repo: string; branch: string; fullName: string } | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function loadExpandedState(fullName: string): Set<string> {
    try {
      const raw = localStorage.getItem(getExpandedKey(fullName));
      if (raw) return new Set(JSON.parse(raw));
    } catch {}
    return new Set();
  }

  function saveExpandedState(fullName: string, expandedSet: Set<string>) {
    try {
      localStorage.setItem(getExpandedKey(fullName), JSON.stringify(Array.from(expandedSet)));
    } catch {}
  }

  const fetchTree = useCallback(function fetchTree() {
    if (!keysStored) {
      setLoading(false);
      return;
    }

    const raw = localStorage.getItem("scriva-current-book");
    if (!raw) {
      setLoading(false);
      return;
    }

    let bookData: { full_name: string; default_branch: string };
    try {
      bookData = JSON.parse(raw);
    } catch {
      setLoading(false);
      return;
    }

    const [owner, repo] = bookData.full_name.split("/");
    if (!owner || !repo) {
      setLoading(false);
      return;
    }

    setRepoInfo({ owner, repo, branch: bookData.default_branch, fullName: bookData.full_name });
    const savedExpanded = loadExpandedState(bookData.full_name);
    if (savedExpanded.size > 0) {
      setExpanded(savedExpanded);
    }

    setLoading(true);
    fetch(
      "/api/github/tree?owner=" + owner + "&repo=" + repo + "&branch=" + bookData.default_branch,
    )
      .then(function handleRes(res) {
        return res.json();
      })
      .then(function handleData(data) {
        if (!data.tree) {
          setTree([]);
          return;
        }

        const filePaths = data.tree
          .filter(function isBlob(item: { type: string }) {
            return item.type === "blob";
          })
          .map(function getPath(item: { path: string }) {
            return item.path;
          });

        setTree(buildTree(filePaths));
      })
      .catch(function handleErr() {
        setTree([]);
      })
      .finally(function done() {
        setLoading(false);
        setRefreshing(false);
      });
  }, [keysStored]);

  useEffect(function onMount() {
    fetchTree();
  }, [fetchTree]);

  function handleRefresh() {
    setRefreshing(true);
    fetchTree();
  }

  function toggleFolder(path: string) {
    setExpanded(function update(prev) {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      if (repoInfo) {
        saveExpandedState(repoInfo.fullName, next);
      }
      return next;
    });
  }

  function handleFileClick(node: FileTreeNode) {
    router.push("/book/" + node.path);
  }

  function handleContextMenu(e: React.MouseEvent, node: FileTreeNode) {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, node });
  }

  function closeContextMenu() {
    setContextMenu(null);
  }

  useEffect(function closeOnClick() {
    function handleClick() {
      setContextMenu(null);
    }
    window.addEventListener("click", handleClick);
    return function cleanup() {
      window.removeEventListener("click", handleClick);
    };
  }, []);

  function handleNewFile(parentPath: string) {
    closeContextMenu();
    const folderPath = parentPath;
    if (folderPath && !expanded.has(folderPath)) {
      toggleFolder(folderPath);
    }
    setInlineInput({ parentPath: folderPath, type: "file", initialValue: "" });
  }

  function handleNewFolder(parentPath: string) {
    closeContextMenu();
    const folderPath = parentPath;
    if (folderPath && !expanded.has(folderPath)) {
      toggleFolder(folderPath);
    }
    setInlineInput({ parentPath: folderPath, type: "folder", initialValue: "" });
  }

  function handleRename(node: FileTreeNode) {
    closeContextMenu();
    const parentPath = node.path.includes("/") ? node.path.substring(0, node.path.lastIndexOf("/")) : "";
    setInlineInput({ parentPath, type: "rename", initialValue: node.name, originalPath: node.path });
  }

  function handleDelete(node: FileTreeNode) {
    closeContextMenu();
    if (!repoInfo || !keysStored) return;

    const confirmed = window.confirm("Delete " + node.path + "?");
    if (!confirmed) return;

    if (node.type === "dir") {
      const filesToDelete = collectFiles(node);
      let chain = Promise.resolve();
      for (const filePath of filesToDelete) {
        chain = chain.then(function deleteOneFile() {
          return fetch("/api/github/files?owner=" + repoInfo!.owner + "&repo=" + repoInfo!.repo + "&path=" + encodeURIComponent(filePath) + "&branch=" + repoInfo!.branch)
            .then(function getSha(res) { return res.json(); })
            .then(function doDelete(data: { sha: string }) {
              return fetch("/api/github/files", {
                method: "DELETE",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  owner: repoInfo!.owner,
                  repo: repoInfo!.repo,
                  path: filePath,
                  sha: data.sha,
                  branch: repoInfo!.branch,
                }),
              }).then(function ignore() { return; });
            });
        });
      }
      chain.then(function refresh() { fetchTree(); });
    } else {
      fetch("/api/github/files?owner=" + repoInfo.owner + "&repo=" + repoInfo.repo + "&path=" + encodeURIComponent(node.path) + "&branch=" + repoInfo.branch)
        .then(function getSha(res) { return res.json(); })
        .then(function doDelete(data: { sha: string }) {
          return fetch("/api/github/files", {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              owner: repoInfo!.owner,
              repo: repoInfo!.repo,
              path: node.path,
              sha: data.sha,
              branch: repoInfo!.branch,
            }),
          });
        })
        .then(function refresh() { fetchTree(); });
    }
  }

  function collectFiles(node: FileTreeNode): string[] {
    if (node.type === "file") return [node.path];
    const result: string[] = [];
    if (node.children) {
      for (const child of node.children) {
        result.push(...collectFiles(child));
      }
    }
    return result;
  }

  function handleCopyPath(node: FileTreeNode) {
    closeContextMenu();
    navigator.clipboard.writeText(node.path);
  }

  function handleInlineSubmit(value: string) {
    if (!value.trim() || !repoInfo || !keysStored) {
      setInlineInput(null);
      return;
    }

    const trimmed = value.trim();

    if (inlineInput?.type === "rename" && inlineInput.originalPath) {
      const oldPath = inlineInput.originalPath;
      const parentDir = oldPath.includes("/") ? oldPath.substring(0, oldPath.lastIndexOf("/")) + "/" : "";
      const newPath = parentDir + trimmed;

      fetch("/api/github/files?owner=" + repoInfo.owner + "&repo=" + repoInfo.repo + "&path=" + encodeURIComponent(oldPath) + "&branch=" + repoInfo.branch)
        .then(function getOld(res) { return res.json(); })
        .then(function createNew(data: { content: string; sha: string }) {
          return fetch("/api/github/files", {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              owner: repoInfo!.owner,
              repo: repoInfo!.repo,
              path: newPath,
              content: data.content,
              branch: repoInfo!.branch,
              message: "Rename " + oldPath + " to " + newPath,
            }),
          }).then(function deleteOld() {
            return fetch("/api/github/files", {
              method: "DELETE",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                owner: repoInfo!.owner,
                repo: repoInfo!.repo,
                path: oldPath,
                sha: data.sha,
                branch: repoInfo!.branch,
              }),
            });
          });
        })
        .then(function refresh() { fetchTree(); });
    } else if (inlineInput?.type === "folder") {
      const folderPath = inlineInput.parentPath ? inlineInput.parentPath + "/" + trimmed : trimmed;
      const keepPath = folderPath + "/.gitkeep";

      fetch("/api/github/files", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          owner: repoInfo.owner,
          repo: repoInfo.repo,
          path: keepPath,
          content: "",
          branch: repoInfo.branch,
          message: "Create folder " + folderPath,
        }),
      }).then(function refresh() { fetchTree(); });
    } else {
      const filePath = inlineInput?.parentPath ? inlineInput.parentPath + "/" + trimmed : trimmed;

      fetch("/api/github/files", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          owner: repoInfo.owner,
          repo: repoInfo.repo,
          path: filePath,
          content: "",
          branch: repoInfo.branch,
          message: "Create " + filePath,
        }),
      }).then(function refresh() {
        fetchTree();
        router.push("/book/" + filePath);
      });
    }

    setInlineInput(null);
  }

  useEffect(function focusInput() {
    if (inlineInput && inputRef.current) {
      inputRef.current.focus();
      if (inlineInput.type === "rename") {
        const dotIdx = inlineInput.initialValue.lastIndexOf(".");
        if (dotIdx > 0) {
          inputRef.current.setSelectionRange(0, dotIdx);
        } else {
          inputRef.current.select();
        }
      }
    }
  }, [inlineInput]);

  function renderInlineInput(depth: number) {
    if (!inlineInput) return null;

    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          height: 28,
          paddingLeft: 8 + depth * 16,
          paddingRight: 8,
        }}
      >
        <InlineInputField
          ref={inputRef}
          initialValue={inlineInput.initialValue}
          onSubmit={handleInlineSubmit}
          onCancel={function cancel() { setInlineInput(null); }}
        />
      </div>
    );
  }

  function renderNode(node: FileTreeNode, depth: number) {
    const isExpanded = expanded.has(node.path);
    const isActive = currentChapter === node.path || pathname === "/book/" + node.path;

    if (node.type === "dir") {
      const showInlineHere = inlineInput && inlineInput.parentPath === node.path && inlineInput.type !== "rename";
      const showRenameHere = inlineInput && inlineInput.type === "rename" && inlineInput.originalPath === node.path;

      return (
        <div key={node.path}>
          {showRenameHere ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                height: 28,
                paddingLeft: 8 + depth * 16,
                paddingRight: 8,
              }}
            >
              <InlineInputField
                ref={inputRef}
                initialValue={inlineInput!.initialValue}
                onSubmit={handleInlineSubmit}
                onCancel={function cancel() { setInlineInput(null); }}
              />
            </div>
          ) : (
            <div
              onClick={function onClick() { toggleFolder(node.path); }}
              onContextMenu={function onCtx(e) { handleContextMenu(e, node); }}
              style={{
                display: "flex",
                alignItems: "center",
                height: 28,
                paddingLeft: 8 + depth * 16,
                paddingRight: 8,
                cursor: "pointer",
                gap: 4,
                position: "relative",
                userSelect: "none",
              }}
              onMouseEnter={function onEnter(e) {
                e.currentTarget.style.backgroundColor = "var(--color-surface-hover)";
              }}
              onMouseLeave={function onLeave(e) {
                e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              {depth > 0 && Array.from({ length: depth }).map(function renderGuide(_, i) {
                return (
                  <div
                    key={i}
                    style={{
                      position: "absolute",
                      left: 16 + i * 16,
                      top: 0,
                      bottom: 0,
                      width: 1,
                      backgroundColor: "var(--color-border)",
                      opacity: 0.5,
                    }}
                  />
                );
              })}
              {isExpanded ? (
                <ChevronDown size={14} strokeWidth={1.5} style={{ flexShrink: 0, color: "var(--color-text-muted)" }} />
              ) : (
                <ChevronRight size={14} strokeWidth={1.5} style={{ flexShrink: 0, color: "var(--color-text-muted)" }} />
              )}
              {isExpanded ? (
                <FolderOpen size={16} strokeWidth={1.5} style={{ flexShrink: 0, color: "var(--color-text-muted)" }} />
              ) : (
                <FolderClosed size={16} strokeWidth={1.5} style={{ flexShrink: 0, color: "var(--color-text-muted)" }} />
              )}
              <span
                style={{
                  flex: 1,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  fontWeight: 500,
                  color: "var(--color-text)",
                  marginLeft: 2,
                }}
              >
                {node.name}
              </span>
            </div>
          )}
          {isExpanded && (
            <div>
              {showInlineHere && renderInlineInput(depth + 1)}
              {node.children?.map(function renderChild(child) {
                return renderNode(child, depth + 1);
              })}
            </div>
          )}
        </div>
      );
    }

    const { icon: FileIcon, color: iconColor } = getFileIcon(node.name, node.path);
    const showRenameHere = inlineInput && inlineInput.type === "rename" && inlineInput.originalPath === node.path;

    if (showRenameHere) {
      return (
        <div
          key={node.path}
          style={{
            display: "flex",
            alignItems: "center",
            height: 28,
            paddingLeft: 8 + depth * 16 + 18,
            paddingRight: 8,
          }}
        >
          <InlineInputField
            ref={inputRef}
            initialValue={inlineInput!.initialValue}
            onSubmit={handleInlineSubmit}
            onCancel={function cancel() { setInlineInput(null); }}
          />
        </div>
      );
    }

    return (
      <div
        key={node.path}
        onClick={function onClick() { handleFileClick(node); }}
        onContextMenu={function onCtx(e) { handleContextMenu(e, node); }}
        style={{
          display: "flex",
          alignItems: "center",
          height: 28,
          paddingLeft: 8 + depth * 16 + 18,
          paddingRight: 8,
          cursor: "pointer",
          gap: 4,
          position: "relative",
          userSelect: "none",
          backgroundColor: isActive ? "rgba(var(--color-accent-rgb, 99, 102, 241), 0.08)" : "transparent",
        }}
        onMouseEnter={function onEnter(e) {
          if (!isActive) {
            e.currentTarget.style.backgroundColor = "var(--color-surface-hover)";
          }
        }}
        onMouseLeave={function onLeave(e) {
          if (!isActive) {
            e.currentTarget.style.backgroundColor = isActive ? "rgba(var(--color-accent-rgb, 99, 102, 241), 0.08)" : "transparent";
          }
        }}
      >
        {depth > 0 && Array.from({ length: depth }).map(function renderGuide(_, i) {
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: 16 + i * 16,
                top: 0,
                bottom: 0,
                width: 1,
                backgroundColor: "var(--color-border)",
                opacity: 0.5,
              }}
            />
          );
        })}
        <FileIcon
          size={16}
          strokeWidth={1.5}
          style={{ flexShrink: 0, color: iconColor ?? "var(--color-text-muted)" }}
        />
        <span
          style={{
            flex: 1,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            color: isActive ? "var(--color-accent)" : "var(--color-text)",
            marginLeft: 2,
          }}
        >
          {node.name}
        </span>
      </div>
    );
  }

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          gap: 8,
          color: "var(--color-text-muted)",
          padding: 24,
        }}
      >
        <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
        <span style={{ fontSize: 13 }}>Loading files...</span>
      </div>
    );
  }

  const rootInline = inlineInput && inlineInput.parentPath === "" && inlineInput.type !== "rename";

  return (
    <div ref={containerRef} style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 12px 4px",
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            color: "var(--color-text-muted)",
          }}
        >
          Explorer
        </span>
        <div style={{ display: "flex", gap: 2 }}>
          <button
            onClick={function onNewFile() { handleNewFile(""); }}
            title="New File"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 22,
              height: 22,
              border: "none",
              background: "transparent",
              color: "var(--color-text-muted)",
              cursor: "pointer",
              borderRadius: 4,
            }}
            onMouseEnter={function onEnter(e) { e.currentTarget.style.background = "var(--color-surface-hover)"; }}
            onMouseLeave={function onLeave(e) { e.currentTarget.style.background = "transparent"; }}
          >
            <Plus size={14} strokeWidth={1.5} />
          </button>
          <button
            onClick={function onNewFolder() { handleNewFolder(""); }}
            title="New Folder"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 22,
              height: 22,
              border: "none",
              background: "transparent",
              color: "var(--color-text-muted)",
              cursor: "pointer",
              borderRadius: 4,
            }}
            onMouseEnter={function onEnter(e) { e.currentTarget.style.background = "var(--color-surface-hover)"; }}
            onMouseLeave={function onLeave(e) { e.currentTarget.style.background = "transparent"; }}
          >
            <FolderPlus size={14} strokeWidth={1.5} />
          </button>
          <button
            onClick={handleRefresh}
            title="Refresh"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 22,
              height: 22,
              border: "none",
              background: "transparent",
              color: "var(--color-text-muted)",
              cursor: "pointer",
              borderRadius: 4,
            }}
            onMouseEnter={function onEnter(e) { e.currentTarget.style.background = "var(--color-surface-hover)"; }}
            onMouseLeave={function onLeave(e) { e.currentTarget.style.background = "transparent"; }}
          >
            <RotateCw
              size={14}
              strokeWidth={1.5}
              style={refreshing ? { animation: "spin 1s linear infinite" } : undefined}
            />
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", paddingBottom: 8 }}>
        {rootInline && renderInlineInput(0)}
        {tree.map(function renderRoot(node) {
          return renderNode(node, 0);
        })}
        {tree.length === 0 && (
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
            <FolderClosed size={32} strokeWidth={1} style={{ opacity: 0.5 }} />
            <span style={{ fontSize: 13 }}>No files found</span>
          </div>
        )}
      </div>

      {contextMenu && contextMenu.node && (
        <ContextMenuPopup
          x={contextMenu.x}
          y={contextMenu.y}
          node={contextMenu.node}
          onNewFile={handleNewFile}
          onNewFolder={handleNewFolder}
          onRename={handleRename}
          onDelete={handleDelete}
          onCopyPath={handleCopyPath}
          onClose={closeContextMenu}
        />
      )}
    </div>
  );
}

import { forwardRef } from "react";

interface InlineInputFieldProps {
  initialValue: string;
  onSubmit: (value: string) => void;
  onCancel: () => void;
}

const InlineInputField = forwardRef<HTMLInputElement, InlineInputFieldProps>(
  function InlineInputField(props, ref) {
    const [value, setValue] = useState(props.initialValue);

    return (
      <input
        ref={ref}
        type="text"
        value={value}
        onChange={function onChange(e) { setValue(e.target.value); }}
        onKeyDown={function onKey(e) {
          if (e.key === "Enter") {
            props.onSubmit(value);
          }
          if (e.key === "Escape") {
            props.onCancel();
          }
        }}
        onBlur={function onBlur() {
          if (value.trim()) {
            props.onSubmit(value);
          } else {
            props.onCancel();
          }
        }}
        style={{
          width: "100%",
          height: 22,
          border: "1px solid var(--color-accent)",
          borderRadius: 3,
          backgroundColor: "var(--color-surface)",
          color: "var(--color-text)",
          fontSize: 13,
          fontFamily: "var(--font-inter), system-ui, sans-serif",
          padding: "0 6px",
          outline: "none",
        }}
      />
    );
  }
);

interface ContextMenuPopupProps {
  x: number;
  y: number;
  node: FileTreeNode;
  onNewFile: (parentPath: string) => void;
  onNewFolder: (parentPath: string) => void;
  onRename: (node: FileTreeNode) => void;
  onDelete: (node: FileTreeNode) => void;
  onCopyPath: (node: FileTreeNode) => void;
  onClose: () => void;
}

function ContextMenuPopup({
  x,
  y,
  node,
  onNewFile,
  onNewFolder,
  onRename,
  onDelete,
  onCopyPath,
  onClose,
}: ContextMenuPopupProps) {
  const parentPath = node.type === "dir" ? node.path : (node.path.includes("/") ? node.path.substring(0, node.path.lastIndexOf("/")) : "");

  const items = [
    { label: "New File", icon: Plus, action: function newFile() { onNewFile(parentPath); } },
    { label: "New Folder", icon: FolderPlus, action: function newFolder() { onNewFolder(parentPath); } },
    { label: "divider", icon: null, action: function noop() {} },
    { label: "Rename", icon: Pencil, action: function rename() { onRename(node); } },
    { label: "Delete", icon: Trash2, action: function del() { onDelete(node); } },
    { label: "divider2", icon: null, action: function noop() {} },
    { label: "Copy Path", icon: Copy, action: function copy() { onCopyPath(node); } },
  ];

  return (
    <div
      style={{
        position: "fixed",
        top: y,
        left: x,
        zIndex: 9999,
        backgroundColor: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderRadius: 6,
        boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
        padding: "4px 0",
        minWidth: 160,
        fontFamily: "var(--font-inter), system-ui, sans-serif",
        fontSize: 13,
      }}
      onClick={function stopPropagation(e) { e.stopPropagation(); }}
    >
      {items.map(function renderItem(item) {
        if (item.label.startsWith("divider")) {
          return (
            <div
              key={item.label}
              style={{
                height: 1,
                backgroundColor: "var(--color-border)",
                margin: "4px 0",
              }}
            />
          );
        }

        const Icon = item.icon!;

        return (
          <button
            key={item.label}
            onClick={function handleClick() {
              item.action();
              onClose();
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              width: "100%",
              padding: "6px 12px",
              border: "none",
              background: "transparent",
              color: item.label === "Delete" ? "var(--color-error)" : "var(--color-text)",
              cursor: "pointer",
              textAlign: "left",
              fontFamily: "inherit",
              fontSize: "inherit",
            }}
            onMouseEnter={function onEnter(e) {
              e.currentTarget.style.backgroundColor = "var(--color-surface-hover)";
            }}
            onMouseLeave={function onLeave(e) {
              e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            <Icon size={14} strokeWidth={1.5} />
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
