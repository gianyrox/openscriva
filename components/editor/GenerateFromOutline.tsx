"use client";

import { useState, useEffect, useMemo } from "react";
import { FileText, ArrowLeft } from "lucide-react";
import { useAppStore } from "@/store";
import { computeDiff, applyChanges } from "@/lib/diff";
import type { OutlineNode } from "@/types";
import DiffView from "./DiffView";

interface GenerateFromOutlineProps {
  outlineNode: OutlineNode;
  onAccept: (content: string) => void;
  onReject: () => void;
}

export default function GenerateFromOutline({ outlineNode, onAccept, onReject }: GenerateFromOutlineProps) {
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showDiff, setShowDiff] = useState(false);
  const [accepted, setAccepted] = useState<boolean[]>([]);
  const [resolved, setResolved] = useState<boolean[]>([]);

  const preferences = useAppStore(function selectPrefs(s) {
    return s.preferences;
  });

  const changes = useMemo(function computeChanges() {
    if (!generated) return [];
    return computeDiff("", generated);
  }, [generated]);

  const allResolved = useMemo(function checkResolved() {
    if (changes.length === 0) return false;
    const changeCount = changes.filter(function isChange(c) {
      return c.type !== "equal";
    }).length;
    const resolvedCount = resolved.filter(Boolean).length;
    return resolvedCount >= changeCount;
  }, [changes, resolved]);

  async function handleGenerate() {
    if (!preferences.keysStored) {
      setError("No API key configured");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: outlineNode.synopsis || outlineNode.title,
          mode: "draft",
          model: preferences.defaultModel,
          contexts: [
            { type: "outline", content: "Title: " + outlineNode.title + (outlineNode.synopsis ? "\nSynopsis: " + outlineNode.synopsis : "") },
          ],
        }),
      });

      if (!res.ok) throw new Error("API error: " + res.status);

      const data = await res.json();
      setGenerated(data.result || "");

      const diff = computeDiff("", data.result || "");
      setAccepted(new Array(diff.length).fill(false));
      setResolved(new Array(diff.length).fill(false));
      setShowDiff(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to generate");
    } finally {
      setLoading(false);
    }
  }

  function handleAcceptChange(index: number) {
    setAccepted(function update(prev) {
      const next = [...prev];
      next[index] = true;
      return next;
    });
    setResolved(function update(prev) {
      const next = [...prev];
      next[index] = true;
      return next;
    });
  }

  function handleRejectChange(index: number) {
    setAccepted(function update(prev) {
      const next = [...prev];
      next[index] = false;
      return next;
    });
    setResolved(function update(prev) {
      const next = [...prev];
      next[index] = true;
      return next;
    });
  }

  function handleAcceptAll() {
    setAccepted(function update(prev) {
      return prev.map(function setTrue() { return true; });
    });
    setResolved(function update(prev) {
      return prev.map(function setTrue() { return true; });
    });
  }

  function handleRejectAll() {
    setAccepted(function update(prev) {
      return prev.map(function setFalse() { return false; });
    });
    setResolved(function update(prev) {
      return prev.map(function setTrue() { return true; });
    });
  }

  function handleDone() {
    const result = applyChanges("", changes, accepted);
    onAccept(result);
  }

  useEffect(function doneCheck() {
    if (allResolved && showDiff) {
      const result = applyChanges("", changes, accepted);
      if (result.trim()) {
        onAccept(result);
      } else {
        onReject();
      }
    }
  }, [allResolved, showDiff, changes, accepted, onAccept, onReject]);

  if (showDiff && generated) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
          backgroundColor: "var(--color-bg)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "8px 16px",
            borderBottom: "1px solid var(--color-border)",
            fontFamily: "var(--font-inter), system-ui, sans-serif",
            gap: 12,
          }}
        >
          <button
            onClick={onReject}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: "4px 8px",
              fontSize: 12,
              fontFamily: "inherit",
              border: "none",
              borderRadius: 5,
              backgroundColor: "transparent",
              color: "var(--color-text-muted)",
              cursor: "pointer",
            }}
          >
            <ArrowLeft size={14} />
            Cancel
          </button>
          <div style={{ flex: 1, fontSize: 13, color: "var(--color-text)" }}>
            Generated draft for: {outlineNode.title}
          </div>
        </div>
        <div style={{ flex: 1, minHeight: 0 }}>
          <DiffView
            originalText=""
            revisedText={generated}
            onAcceptAll={handleAcceptAll}
            onRejectAll={handleRejectAll}
            onAcceptChange={handleAcceptChange}
            onRejectChange={handleRejectChange}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        backgroundColor: "var(--color-bg)",
        fontFamily: "var(--font-inter), system-ui, sans-serif",
        padding: "2rem",
        gap: 20,
      }}
    >
      <FileText size={36} style={{ color: "var(--color-text-muted)" }} />

      <div style={{ textAlign: "center", maxWidth: 480 }}>
        <h2
          style={{
            fontSize: 18,
            fontWeight: 600,
            color: "var(--color-text)",
            margin: "0 0 8px",
          }}
        >
          {outlineNode.title}
        </h2>
        {outlineNode.synopsis && (
          <p
            style={{
              fontSize: 14,
              color: "var(--color-text-muted)",
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            {outlineNode.synopsis}
          </p>
        )}
      </div>

      {error && (
        <div style={{ fontSize: 13, color: "var(--color-error)" }}>{error}</div>
      )}

      <div style={{ display: "flex", gap: 10 }}>
        <button
          onClick={onReject}
          style={{
            padding: "8px 20px",
            fontSize: 13,
            fontFamily: "inherit",
            border: "1px solid var(--color-border)",
            borderRadius: 8,
            backgroundColor: "transparent",
            color: "var(--color-text-muted)",
            cursor: "pointer",
          }}
        >
          Cancel
        </button>
        <button
          onClick={handleGenerate}
          disabled={loading}
          style={{
            padding: "8px 20px",
            fontSize: 13,
            fontFamily: "inherit",
            fontWeight: 600,
            border: "none",
            borderRadius: 8,
            backgroundColor: loading ? "var(--color-surface)" : "var(--color-accent)",
            color: loading ? "var(--color-text-muted)" : "#fff",
            cursor: loading ? "default" : "pointer",
          }}
        >
          {loading ? "Writing your draft…" : "Generate Draft"}
        </button>
      </div>
    </div>
  );
}
