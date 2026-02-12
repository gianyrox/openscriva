"use client";

import { useState, useEffect, useCallback } from "react";
import { GitPullRequest, User, FileText, Clock } from "lucide-react";
import { useAppStore } from "@/store";
import PRReviewView from "@/components/collab/PRReviewView";

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
}

interface CollabPanelProps {
  owner: string;
  repo: string;
}

function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) return "just now";
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function CollabPanel({ owner, repo }: CollabPanelProps) {
  const [pulls, setPulls] = useState<PullRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPR, setSelectedPR] = useState<PullRequest | null>(null);
  const keysStored = useAppStore(function selectKeysStored(s) {
    return s.preferences.keysStored;
  });

  const fetchPulls = useCallback(function fetchPulls() {
    if (!keysStored) return;
    setLoading(true);

    fetch(`/api/github/pulls?owner=${owner}&repo=${repo}`)
      .then(function handleRes(res) {
        return res.json();
      })
      .then(function handleData(data) {
        if (data.pulls) {
          setPulls(data.pulls);
        }
      })
      .catch(function noop() {})
      .finally(function done() {
        setLoading(false);
      });
  }, [keysStored, owner, repo]);

  useEffect(function loadPulls() {
    fetchPulls();
  }, [fetchPulls]);

  if (selectedPR) {
    return (
      <PRReviewView
        pr={selectedPR}
        owner={owner}
        repo={repo}
        onAction={function afterAction() {
          setSelectedPR(null);
          fetchPulls();
        }}
        onBack={function goBack() {
          setSelectedPR(null);
        }}
      />
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
          color: "var(--color-text-muted)",
          fontSize: 13,
        }}
      >
        Loading reviews...
      </div>
    );
  }

  if (pulls.length === 0) {
    return (
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
        <GitPullRequest size={32} strokeWidth={1} style={{ opacity: 0.5 }} />
        <span style={{ fontSize: 13 }}>No reviews pending.</span>
      </div>
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
      <div
        style={{
          padding: "12px 16px",
          borderBottom: "1px solid var(--color-border)",
          fontSize: 12,
          fontWeight: 600,
          color: "var(--color-text-muted)",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}
      >
        Reviews ({pulls.length})
      </div>

      <div style={{ flex: 1, overflow: "auto" }}>
        {pulls.map(function renderPR(pr) {
          return (
            <button
              key={pr.number}
              type="button"
              onClick={function selectPR() {
                setSelectedPR(pr);
              }}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 6,
                padding: "12px 16px",
                width: "100%",
                border: "none",
                borderBottom: "1px solid var(--color-border)",
                background: "transparent",
                cursor: "pointer",
                textAlign: "left",
                fontFamily: "inherit",
                transition: "background-color 150ms ease",
              }}
              onMouseEnter={function onEnter(e) {
                e.currentTarget.style.backgroundColor = "var(--color-surface-hover)";
              }}
              onMouseLeave={function onLeave(e) {
                e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 8,
                }}
              >
                <GitPullRequest
                  size={14}
                  strokeWidth={1.5}
                  style={{
                    color: "var(--color-success)",
                    flexShrink: 0,
                    marginTop: 2,
                  }}
                />
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: "var(--color-text)",
                    lineHeight: 1.3,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                  }}
                >
                  {pr.title}
                </span>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  fontSize: 11,
                  color: "var(--color-text-muted)",
                  paddingLeft: 22,
                }}
              >
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 3,
                  }}
                >
                  <User size={10} strokeWidth={1.5} />
                  {pr.user.login}
                </span>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 3,
                  }}
                >
                  <Clock size={10} strokeWidth={1.5} />
                  {formatRelativeDate(pr.created_at)}
                </span>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 3,
                  }}
                >
                  <FileText size={10} strokeWidth={1.5} />
                  {pr.changed_files}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
