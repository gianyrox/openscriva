"use client";

import { useState, useEffect } from "react";
import {
  GitPullRequest,
  GitMerge,
  XCircle,
  MessageSquare,
  FileText,
  GitBranch,
  ChevronDown,
  ChevronRight,
  Loader2,
  ArrowLeft,
  Plus,
  Minus,
  Check,
} from "lucide-react";
import { useAppStore } from "@/store";

interface PullRequest {
  number: number;
  title: string;
  body: string | null;
  state: string;
  user: { login: string };
  head: { ref: string };
  base: { ref: string };
  created_at: string;
  changed_files: number;
  merged?: boolean;
}

interface DiffFile {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  changes: number;
  patch: string | null;
}

interface PRReviewViewProps {
  pr: PullRequest;
  owner: string;
  repo: string;
  onAction?: () => void;
  onBack?: () => void;
  onClose?: () => void;
}

function StatusBadge({ state, merged }: { state: string; merged?: boolean }) {
  var color = "var(--color-success)";
  var label = "Open";

  if (merged || state === "merged") {
    color = "#8b5cf6";
    label = "Merged";
  } else if (state === "closed") {
    color = "var(--color-error)";
    label = "Closed";
  }

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "3px 10px",
        borderRadius: 9999,
        backgroundColor: color,
        color: "#fff",
        fontSize: 11,
        fontWeight: 600,
      }}
    >
      <GitPullRequest size={11} strokeWidth={2} />
      {label}
    </span>
  );
}

function FileStatusBadge({ status }: { status: string }) {
  var color = "var(--color-text-muted)";
  var label = status;

  if (status === "added") {
    color = "var(--color-success)";
    label = "added";
  } else if (status === "removed") {
    color = "var(--color-error)";
    label = "deleted";
  } else if (status === "modified") {
    color = "var(--color-accent)";
    label = "modified";
  } else if (status === "renamed") {
    color = "#f59e0b";
    label = "renamed";
  }

  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 600,
        padding: "1px 6px",
        borderRadius: 3,
        backgroundColor: "color-mix(in srgb, " + color + " 15%, transparent)",
        color: color,
        textTransform: "uppercase",
        letterSpacing: "0.03em",
      }}
    >
      {label}
    </span>
  );
}

function parsePatchLines(patch: string): { type: "add" | "remove" | "context" | "header"; text: string }[] {
  var lines = patch.split("\n");
  var result: { type: "add" | "remove" | "context" | "header"; text: string }[] = [];
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i];
    if (line.startsWith("@@")) {
      result.push({ type: "header", text: line });
    } else if (line.startsWith("+")) {
      result.push({ type: "add", text: line.substring(1) });
    } else if (line.startsWith("-")) {
      result.push({ type: "remove", text: line.substring(1) });
    } else {
      result.push({ type: "context", text: line.startsWith(" ") ? line.substring(1) : line });
    }
  }
  return result;
}

function FileDiff({ file }: { file: DiffFile }) {
  var [expanded, setExpanded] = useState(true);

  if (!file.patch) {
    return (
      <div style={{ padding: "8px 12px", fontSize: 12, color: "var(--color-text-muted)" }}>
        Binary file or no diff available
      </div>
    );
  }

  var lines = parsePatchLines(file.patch);

  return (
    <div>
      <button
        type="button"
        onClick={function toggle() { setExpanded(!expanded); }}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          width: "100%",
          padding: "8px 12px",
          border: "none",
          borderBottom: "1px solid var(--color-border)",
          background: "var(--color-surface)",
          cursor: "pointer",
          fontFamily: "var(--font-inter), system-ui, sans-serif",
          fontSize: 13,
          color: "var(--color-text)",
          textAlign: "left",
        }}
      >
        {expanded ? <ChevronDown size={12} strokeWidth={1.5} /> : <ChevronRight size={12} strokeWidth={1.5} />}
        <FileText size={13} strokeWidth={1.5} style={{ color: "var(--color-text-muted)", flexShrink: 0 }} />
        <span style={{ fontWeight: 500, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {file.filename}
        </span>
        <FileStatusBadge status={file.status} />
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--color-text-muted)", flexShrink: 0 }}>
          <span style={{ color: "var(--color-success)", display: "inline-flex", alignItems: "center", gap: 2 }}>
            <Plus size={10} strokeWidth={2} />{file.additions}
          </span>
          <span style={{ color: "var(--color-error)", display: "inline-flex", alignItems: "center", gap: 2 }}>
            <Minus size={10} strokeWidth={2} />{file.deletions}
          </span>
        </span>
      </button>

      {expanded && (
        <div
          style={{
            overflowX: "auto",
            fontSize: 12,
            fontFamily: "var(--font-jetbrains-mono), monospace",
            lineHeight: 1.6,
          }}
        >
          {lines.map(function renderLine(line, idx) {
            var bg = "transparent";
            var color = "var(--color-text)";
            var prefix = " ";

            if (line.type === "header") {
              bg = "color-mix(in srgb, var(--color-accent) 8%, transparent)";
              color = "var(--color-accent)";
              prefix = "";
            } else if (line.type === "add") {
              bg = "color-mix(in srgb, var(--color-success) 10%, transparent)";
              color = "var(--color-text)";
              prefix = "+";
            } else if (line.type === "remove") {
              bg = "color-mix(in srgb, var(--color-error) 10%, transparent)";
              color = "var(--color-text)";
              prefix = "-";
            }

            return (
              <div
                key={idx}
                style={{
                  backgroundColor: bg,
                  color: color,
                  padding: "0 12px",
                  whiteSpace: "pre",
                  minHeight: "1.6em",
                  borderLeft: line.type === "add" ? "3px solid var(--color-success)" : line.type === "remove" ? "3px solid var(--color-error)" : "3px solid transparent",
                }}
              >
                <span style={{ display: "inline-block", width: 16, color: line.type === "add" ? "var(--color-success)" : line.type === "remove" ? "var(--color-error)" : "transparent", userSelect: "none" }}>
                  {prefix}
                </span>
                {line.text}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function PRReviewView({
  pr,
  owner,
  repo,
  onAction,
  onBack,
  onClose,
}: PRReviewViewProps) {
  var [loading, setLoading] = useState<string | null>(null);
  var [comment, setComment] = useState("");
  var [files, setFiles] = useState<DiffFile[]>([]);
  var [loadingDiff, setLoadingDiff] = useState(true);
  var [merged, setMerged] = useState(false);
  var keysStored = useAppStore(function selectKeysStored(s) {
    return s.preferences.keysStored;
  });

  useEffect(function fetchDiff() {
    if (!keysStored) return;

    fetch(
      "/api/github/compare?owner=" + encodeURIComponent(owner) +
      "&repo=" + encodeURIComponent(repo) +
      "&base=" + encodeURIComponent(pr.base.ref) +
      "&head=" + encodeURIComponent(pr.head.ref),
    )
      .then(function handleRes(res) { return res.json(); })
      .then(function handleData(data) {
        if (data.files) setFiles(data.files);
      })
      .catch(function noop() {})
      .finally(function done() { setLoadingDiff(false); });
  }, [keysStored, owner, repo, pr.base.ref, pr.head.ref]);

  function handleAction(action: "merge" | "comment" | "close") {
    if (!keysStored) return;
    setLoading(action);

    fetch("/api/github/pulls", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        owner,
        repo,
        pull_number: pr.number,
        action,
        message: action === "comment" ? comment : undefined,
        body: action === "comment" ? comment : undefined,
      }),
    })
      .then(function handleRes(res) { return res.json(); })
      .then(function afterAction(data) {
        if (action === "comment") setComment("");
        if (action === "merge" && data.merged) setMerged(true);
        if (onAction) onAction();
      })
      .catch(function noop() {})
      .finally(function done() { setLoading(null); });
  }

  var isOpen = pr.state === "open" && !pr.merged && !merged;

  var totalAdditions = 0;
  var totalDeletions = 0;
  for (var i = 0; i < files.length; i++) {
    totalAdditions += files[i].additions;
    totalDeletions += files[i].deletions;
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        fontFamily: "var(--font-inter), system-ui, sans-serif",
        backgroundColor: "var(--color-bg)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "12px 20px",
          borderBottom: "1px solid var(--color-border)",
          backgroundColor: "var(--color-surface)",
          flexShrink: 0,
        }}
      >
        {(onBack || onClose) && (
          <button
            type="button"
            onClick={onClose ?? onBack}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              border: "none",
              background: "none",
              color: "var(--color-text-muted)",
              fontSize: 12,
              cursor: "pointer",
              padding: "4px 0",
              fontFamily: "inherit",
            }}
          >
            <ArrowLeft size={14} strokeWidth={1.5} />
            Back to editor
          </button>
        )}

        <div style={{ flex: 1 }} />

        <StatusBadge state={merged ? "merged" : pr.state} merged={pr.merged || merged} />
        <span style={{ fontSize: 11, color: "var(--color-text-muted)" }}>#{pr.number}</span>
      </div>

      <div style={{ flex: 1, overflowY: "auto" }}>
        <div
          style={{
            maxWidth: 900,
            margin: "0 auto",
            padding: "24px 20px",
            display: "flex",
            flexDirection: "column",
            gap: 20,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <h2
              style={{
                margin: 0,
                fontSize: 22,
                fontWeight: 700,
                color: "var(--color-text)",
                fontFamily: "var(--font-literata), Georgia, serif",
                lineHeight: 1.3,
              }}
            >
              {pr.title}
            </h2>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                fontSize: 12,
                color: "var(--color-text-muted)",
                flexWrap: "wrap",
              }}
            >
              <span>by @{pr.user.login}</span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <GitBranch size={12} strokeWidth={1.5} />
                {pr.head.ref} &rarr; {pr.base.ref}
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <FileText size={12} strokeWidth={1.5} />
                {files.length} file{files.length !== 1 ? "s" : ""}
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <span style={{ color: "var(--color-success)" }}>+{totalAdditions}</span>
                <span style={{ color: "var(--color-error)" }}>-{totalDeletions}</span>
              </span>
            </div>
          </div>

          {pr.body && (
            <div
              style={{
                padding: 16,
                backgroundColor: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                borderRadius: 8,
                fontSize: 13,
                color: "var(--color-text)",
                lineHeight: 1.6,
                whiteSpace: "pre-wrap",
              }}
            >
              {pr.body}
            </div>
          )}

          <div>
            <h3
              style={{
                margin: "0 0 12px",
                fontSize: 14,
                fontWeight: 600,
                color: "var(--color-text)",
              }}
            >
              Changed Files
            </h3>

            {loadingDiff && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: 24, color: "var(--color-text-muted)", fontSize: 13 }}>
                <Loader2 size={14} strokeWidth={1.5} style={{ animation: "spin 1s linear infinite" }} />
                Loading diff...
              </div>
            )}

            {!loadingDiff && files.length === 0 && (
              <div style={{ padding: 24, textAlign: "center", color: "var(--color-text-muted)", fontSize: 13 }}>
                No file changes found
              </div>
            )}

            {!loadingDiff && files.length > 0 && (
              <div
                style={{
                  border: "1px solid var(--color-border)",
                  borderRadius: 8,
                  overflow: "hidden",
                }}
              >
                {files.map(function renderFile(f, idx) {
                  return (
                    <div
                      key={f.filename}
                      style={{
                        borderTop: idx > 0 ? "1px solid var(--color-border)" : "none",
                      }}
                    >
                      <FileDiff file={f} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {merged && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: 16,
                backgroundColor: "color-mix(in srgb, #8b5cf6 10%, transparent)",
                borderRadius: 8,
                border: "1px solid color-mix(in srgb, #8b5cf6 25%, transparent)",
                fontSize: 13,
                fontWeight: 500,
                color: "#8b5cf6",
              }}
            >
              <Check size={16} strokeWidth={2} />
              Pull request merged successfully
            </div>
          )}

          {isOpen && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 12,
                padding: 16,
                backgroundColor: "var(--color-surface)",
                borderRadius: 8,
                border: "1px solid var(--color-border)",
              }}
            >
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type="text"
                  value={comment}
                  onChange={function onInput(e) { setComment(e.target.value); }}
                  placeholder="Leave a comment..."
                  style={{
                    flex: 1,
                    padding: "8px 12px",
                    border: "1px solid var(--color-border)",
                    borderRadius: 6,
                    backgroundColor: "var(--color-bg)",
                    color: "var(--color-text)",
                    fontSize: 13,
                    fontFamily: "inherit",
                    outline: "none",
                  }}
                  onKeyDown={function onKey(e) {
                    if (e.key === "Enter" && comment.trim()) handleAction("comment");
                  }}
                />
                <button
                  type="button"
                  onClick={function onComment() { handleAction("comment"); }}
                  disabled={!comment.trim() || loading === "comment"}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "8px 12px",
                    border: "1px solid var(--color-border)",
                    borderRadius: 6,
                    backgroundColor: "transparent",
                    color: !comment.trim() ? "var(--color-text-muted)" : "var(--color-text)",
                    fontSize: 12,
                    cursor: !comment.trim() ? "default" : "pointer",
                    opacity: !comment.trim() ? 0.5 : 1,
                    fontFamily: "inherit",
                  }}
                >
                  <MessageSquare size={13} strokeWidth={1.5} />
                  Comment
                </button>
              </div>

              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={function onCloseAction() { handleAction("close"); }}
                  disabled={loading === "close"}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "8px 16px",
                    border: "1px solid var(--color-border)",
                    borderRadius: 6,
                    backgroundColor: "transparent",
                    color: "var(--color-text-muted)",
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    transition: "color 150ms ease",
                  }}
                  onMouseEnter={function onEnter(e) { e.currentTarget.style.color = "var(--color-error)"; }}
                  onMouseLeave={function onLeave(e) { e.currentTarget.style.color = "var(--color-text-muted)"; }}
                >
                  <XCircle size={14} strokeWidth={1.5} />
                  Close PR
                </button>
                <button
                  type="button"
                  onClick={function onMerge() { handleAction("merge"); }}
                  disabled={loading === "merge"}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "8px 20px",
                    border: "none",
                    borderRadius: 6,
                    backgroundColor: "var(--color-success)",
                    color: "#fff",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    opacity: loading === "merge" ? 0.6 : 1,
                    transition: "opacity 150ms ease",
                  }}
                >
                  {loading === "merge" ? (
                    <Loader2 size={14} strokeWidth={2} style={{ animation: "spin 1s linear infinite" }} />
                  ) : (
                    <GitMerge size={14} strokeWidth={2} />
                  )}
                  Merge into {pr.base.ref}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
