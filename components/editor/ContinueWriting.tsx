"use client";

import { useState, useEffect, useCallback } from "react";
import { Check, X } from "lucide-react";
import { useAppStore } from "@/store";

interface ContinueWritingProps {
  precedingText: string;
  onAccept: (newText: string) => void;
  onReject: () => void;
}

export default function ContinueWriting({ precedingText, onAccept, onReject }: ContinueWritingProps) {
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState("");
  const [error, setError] = useState<string | null>(null);

  const preferences = useAppStore(function selectPrefs(s) {
    return s.preferences;
  });

  useEffect(function generate() {
    if (!preferences.keysStored) {
      setError("No API key configured");
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function run() {
      try {
        const res = await fetch("/api/ai/generate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text: precedingText,
            mode: "continue",
            model: preferences.defaultModel,
          }),
        });

        if (!res.ok) throw new Error("API error: " + res.status);

        const data = await res.json();
        if (cancelled) return;

        setResult(data.result || "");
        setLoading(false);
      } catch (err: unknown) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to continue");
        setLoading(false);
      }
    }

    run();

    return function cleanup() {
      cancelled = true;
    };
  }, [precedingText, preferences.keysStored, preferences.defaultModel]);

  const handleKeyDown = useCallback(function handleKey(e: KeyboardEvent) {
    if (loading) return;
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (result) onAccept(result);
    }
    if (e.key === "Escape") {
      e.preventDefault();
      onReject();
    }
  }, [loading, result, onAccept, onReject]);

  useEffect(function registerKeys() {
    window.addEventListener("keydown", handleKeyDown);
    return function cleanup() {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);

  if (loading) {
    return (
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "4px 8px",
          fontFamily: "var(--font-inter), system-ui, sans-serif",
          fontSize: 13,
          color: "var(--color-text-muted)",
        }}
      >
        <style>{`
          @keyframes continueDots {
            0%, 20% { opacity: 0.2; }
            50% { opacity: 1; }
            80%, 100% { opacity: 0.2; }
          }
        `}</style>
        <span>Continuing your story</span>
        <span style={{ display: "inline-flex", gap: 2 }}>
          <span style={{ animation: "continueDots 1.4s infinite", animationDelay: "0s" }}>.</span>
          <span style={{ animation: "continueDots 1.4s infinite", animationDelay: "0.2s" }}>.</span>
          <span style={{ animation: "continueDots 1.4s infinite", animationDelay: "0.4s" }}>.</span>
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "4px 8px",
          fontFamily: "var(--font-inter), system-ui, sans-serif",
          fontSize: 13,
        }}
      >
        <span style={{ color: "var(--color-error)" }}>{error}</span>
        <button
          onClick={onReject}
          style={{
            padding: "2px 8px",
            fontSize: 12,
            fontFamily: "inherit",
            border: "1px solid var(--color-border)",
            borderRadius: 4,
            backgroundColor: "transparent",
            color: "var(--color-text-muted)",
            cursor: "pointer",
          }}
        >
          Dismiss
        </button>
      </div>
    );
  }

  return (
    <span
      style={{
        display: "inline",
        fontFamily: "var(--font-literata), serif",
      }}
    >
      <span
        style={{
          backgroundColor: "color-mix(in srgb, var(--color-success) 15%, transparent)",
          color: "var(--color-text)",
          padding: "1px 2px",
          borderRadius: 2,
          borderLeft: "2px solid var(--color-success)",
        }}
      >
        {result}
      </span>
      <span
        style={{
          display: "inline-flex",
          gap: 2,
          marginLeft: 6,
          verticalAlign: "middle",
        }}
      >
        <button
          onClick={function accept() {
            onAccept(result);
          }}
          title="Accept (Enter)"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 22,
            height: 22,
            padding: 0,
            background: "none",
            border: "1px solid var(--color-success)",
            borderRadius: 4,
            color: "var(--color-success)",
            cursor: "pointer",
          }}
        >
          <Check size={13} />
        </button>
        <button
          onClick={onReject}
          title="Reject (Esc)"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 22,
            height: 22,
            padding: 0,
            background: "none",
            border: "1px solid var(--color-error)",
            borderRadius: 4,
            color: "var(--color-error)",
            cursor: "pointer",
          }}
        >
          <X size={13} />
        </button>
      </span>
    </span>
  );
}
