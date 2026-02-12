"use client";

import { useState } from "react";
import {
  GitPullRequest,
  GitMerge,
  XCircle,
  MessageSquare,
  FileText,
  GitBranch,
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

interface PRReviewViewProps {
  pr: PullRequest;
  owner: string;
  repo: string;
  onAction?: () => void;
  onBack?: () => void;
}

function StatusBadge({ state, merged }: { state: string; merged?: boolean }) {
  let color = "var(--color-success)";
  let label = "Open";

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

export default function PRReviewView({
  pr,
  owner,
  repo,
  onAction,
  onBack,
}: PRReviewViewProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const keysStored = useAppStore(function selectKeysStored(s) {
    return s.preferences.keysStored;
  });

  function handleAction(action: "merge" | "comment" | "close") {
    if (!keysStored) return;
    setLoading(action);

    fetch("/api/github/pulls", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        owner,
        repo,
        pull_number: pr.number,
        action,
        message: action === "comment" ? comment : undefined,
        body: action === "comment" ? comment : undefined,
      }),
    })
      .then(function afterAction() {
        if (action === "comment") setComment("");
        if (onAction) onAction();
      })
      .catch(function noop() {})
      .finally(function done() {
        setLoading(null);
      });
  }

  const isOpen = pr.state === "open" && !pr.merged;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 16,
        padding: 16,
        fontFamily: "var(--font-inter), system-ui, sans-serif",
      }}
    >
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          style={{
            alignSelf: "flex-start",
            border: "none",
            background: "none",
            color: "var(--color-text-muted)",
            fontSize: 12,
            cursor: "pointer",
            padding: 0,
            fontFamily: "inherit",
          }}
        >
          &larr; Back to reviews
        </button>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <StatusBadge state={pr.state} merged={pr.merged} />
          <span
            style={{
              fontSize: 11,
              color: "var(--color-text-muted)",
            }}
          >
            #{pr.number}
          </span>
        </div>

        <h3
          style={{
            margin: 0,
            fontSize: 16,
            fontWeight: 600,
            color: "var(--color-text)",
            lineHeight: 1.3,
          }}
        >
          {pr.title}
        </h3>

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
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <GitBranch size={12} strokeWidth={1.5} />
            {pr.head.ref} &rarr; {pr.base.ref}
          </span>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <FileText size={12} strokeWidth={1.5} />
            {pr.changed_files} file{pr.changed_files !== 1 ? "s" : ""} changed
          </span>
        </div>
      </div>

      {pr.body && (
        <div
          style={{
            padding: 12,
            backgroundColor: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: 8,
            fontSize: 13,
            color: "var(--color-text)",
            lineHeight: 1.5,
            whiteSpace: "pre-wrap",
          }}
        >
          {pr.body}
        </div>
      )}

      <div
        style={{
          padding: 24,
          backgroundColor: "var(--color-surface)",
          border: "1px dashed var(--color-border)",
          borderRadius: 8,
          textAlign: "center",
          color: "var(--color-text-muted)",
          fontSize: 13,
        }}
      >
        Diff view will be connected here
      </div>

      {isOpen && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
            paddingTop: 8,
            borderTop: "1px solid var(--color-border)",
          }}
        >
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="text"
              value={comment}
              onChange={function onInput(e) {
                setComment(e.target.value);
              }}
              placeholder="Leave a comment..."
              style={{
                flex: 1,
                padding: "8px 10px",
                border: "1px solid var(--color-border)",
                borderRadius: 8,
                backgroundColor: "var(--color-bg)",
                color: "var(--color-text)",
                fontSize: 13,
                fontFamily: "inherit",
                outline: "none",
              }}
              onKeyDown={function onKey(e) {
                if (e.key === "Enter" && comment.trim()) {
                  handleAction("comment");
                }
              }}
            />
            <button
              type="button"
              onClick={function onComment() {
                handleAction("comment");
              }}
              disabled={!comment.trim() || loading === "comment"}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                padding: "8px 12px",
                border: "1px solid var(--color-border)",
                borderRadius: 8,
                backgroundColor: "var(--color-surface)",
                color: "var(--color-text)",
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
              onClick={function onClose() {
                handleAction("close");
              }}
              disabled={loading === "close"}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 14px",
                border: "1px solid var(--color-border)",
                borderRadius: 8,
                backgroundColor: "transparent",
                color: "var(--color-text-muted)",
                fontSize: 12,
                fontWeight: 500,
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "color 150ms ease",
              }}
              onMouseEnter={function onEnter(e) {
                e.currentTarget.style.color = "var(--color-error)";
              }}
              onMouseLeave={function onLeave(e) {
                e.currentTarget.style.color = "var(--color-text-muted)";
              }}
            >
              <XCircle size={14} strokeWidth={1.5} />
              Close
            </button>
            <button
              type="button"
              onClick={function onMerge() {
                handleAction("merge");
              }}
              disabled={loading === "merge"}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 16px",
                border: "none",
                borderRadius: 8,
                backgroundColor: "var(--color-success)",
                color: "#fff",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
                opacity: loading === "merge" ? 0.6 : 1,
                transition: "opacity 150ms ease",
              }}
            >
              <GitMerge size={14} strokeWidth={2} />
              Merge
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
