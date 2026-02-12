"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { CheckCircle, ArrowLeft } from "lucide-react";
import { useAppStore } from "@/store";
import { computeDiff, applyChanges } from "@/lib/diff";
import DiffView from "./DiffView";

interface PolishViewProps {
  content: string;
  onComplete: (newContent: string) => void;
  onCancel: () => void;
}

export default function PolishView({ content, onComplete, onCancel }: PolishViewProps) {
  const [loading, setLoading] = useState(true);
  const [polished, setPolished] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState<boolean[]>([]);
  const [resolved, setResolved] = useState<boolean[]>([]);
  const [done, setDone] = useState(false);

  const preferences = useAppStore(function selectPrefs(s) {
    return s.preferences;
  });

  const changes = useMemo(function computeChanges() {
    if (!polished) return [];
    return computeDiff(content, polished);
  }, [content, polished]);

  const totalChanges = useMemo(function countChanges() {
    return changes.filter(function isChange(c) {
      return c.type !== "equal";
    }).length;
  }, [changes]);

  const resolvedCount = useMemo(function countResolved() {
    return resolved.filter(Boolean).length;
  }, [resolved]);

  const acceptedCount = useMemo(function countAccepted() {
    return accepted.filter(function wasAccepted(val, i) {
      return val && resolved[i];
    }).length;
  }, [accepted, resolved]);

  const rejectedCount = resolvedCount - acceptedCount;

  useEffect(function polish() {
    if (!preferences.keysStored) {
      setError("No API key configured");
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function run() {
      try {
        const res = await fetch("/api/ai/edit", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text: content,
            mode: "cleanup",
            model: preferences.defaultModel,
          }),
        });

        if (!res.ok) throw new Error("API error: " + res.status);

        const data = await res.json();
        if (cancelled) return;

        setPolished(data.result || "");
        const diff = computeDiff(content, data.result || "");
        setAccepted(new Array(diff.length).fill(false));
        setResolved(new Array(diff.length).fill(false));
        setLoading(false);
      } catch (err: unknown) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to polish");
        setLoading(false);
      }
    }

    run();

    return function cleanup() {
      cancelled = true;
    };
  }, [content, preferences.keysStored, preferences.defaultModel]);

  useEffect(function checkDone() {
    if (!polished || loading) return;
    if (totalChanges > 0 && resolvedCount >= totalChanges) {
      setDone(true);
    }
  }, [polished, loading, totalChanges, resolvedCount]);

  const handleAcceptChange = useCallback(function acceptChange(index: number) {
    setAccepted(function updateAccepted(prev) {
      const next = [...prev];
      next[index] = true;
      return next;
    });
    setResolved(function updateResolved(prev) {
      const next = [...prev];
      next[index] = true;
      return next;
    });
  }, []);

  const handleRejectChange = useCallback(function rejectChange(index: number) {
    setAccepted(function updateAccepted(prev) {
      const next = [...prev];
      next[index] = false;
      return next;
    });
    setResolved(function updateResolved(prev) {
      const next = [...prev];
      next[index] = true;
      return next;
    });
  }, []);

  const handleAcceptAll = useCallback(function acceptAll() {
    setAccepted(function updateAccepted(prev) {
      return prev.map(function setTrue() {
        return true;
      });
    });
    setResolved(function updateResolved(prev) {
      return prev.map(function setTrue() {
        return true;
      });
    });
  }, []);

  const handleRejectAll = useCallback(function rejectAll() {
    setAccepted(function updateAccepted(prev) {
      return prev.map(function setFalse() {
        return false;
      });
    });
    setResolved(function updateResolved(prev) {
      return prev.map(function setTrue() {
        return true;
      });
    });
  }, []);

  function handleDone() {
    const result = applyChanges(content, changes, accepted);
    onComplete(result);
  }

  if (loading) {
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
          gap: 16,
        }}
      >
        <style>{`
          @keyframes polishPulse {
            0%, 100% { opacity: 0.5; }
            50% { opacity: 1; }
          }
        `}</style>
        <div
          style={{
            fontSize: 16,
            color: "var(--color-text-muted)",
            animation: "polishPulse 2s ease-in-out infinite",
          }}
        >
          Polishing your prose…
        </div>
        <div
          style={{
            width: 48,
            height: 2,
            backgroundColor: "var(--color-accent)",
            borderRadius: 1,
            animation: "polishPulse 2s ease-in-out infinite",
          }}
        />
      </div>
    );
  }

  if (error) {
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
          gap: 12,
        }}
      >
        <div style={{ fontSize: 14, color: "var(--color-error)" }}>{error}</div>
        <button
          onClick={onCancel}
          style={{
            padding: "6px 16px",
            fontSize: 13,
            fontFamily: "inherit",
            border: "1px solid var(--color-border)",
            borderRadius: 6,
            backgroundColor: "transparent",
            color: "var(--color-text)",
            cursor: "pointer",
          }}
        >
          Back to editor
        </button>
      </div>
    );
  }

  if (done) {
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
          gap: 16,
        }}
      >
        <CheckCircle size={32} style={{ color: "var(--color-success)" }} />
        <div style={{ fontSize: 16, color: "var(--color-text)" }}>
          {acceptedCount} {acceptedCount === 1 ? "change" : "changes"} accepted, {rejectedCount} rejected
        </div>
        <button
          onClick={handleDone}
          style={{
            padding: "8px 24px",
            fontSize: 14,
            fontFamily: "inherit",
            fontWeight: 600,
            border: "none",
            borderRadius: 8,
            backgroundColor: "var(--color-accent)",
            color: "#fff",
            cursor: "pointer",
          }}
        >
          Done
        </button>
      </div>
    );
  }

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
          onClick={onCancel}
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
        <div style={{ flex: 1 }} />
        <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
          {resolvedCount} / {totalChanges} resolved
        </div>
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        <DiffView
          originalText={content}
          revisedText={polished}
          onAcceptAll={handleAcceptAll}
          onRejectAll={handleRejectAll}
          onAcceptChange={handleAcceptChange}
          onRejectChange={handleRejectChange}
        />
      </div>
    </div>
  );
}
