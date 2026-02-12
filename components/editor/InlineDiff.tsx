"use client";

import { Check, X } from "lucide-react";

interface InlineDiffProps {
  oldText: string;
  newText: string;
  onAccept: () => void;
  onReject: () => void;
}

export default function InlineDiff({ oldText, newText, onAccept, onReject }: InlineDiffProps) {
  return (
    <span
      style={{
        display: "inline",
        fontFamily: "var(--font-literata), serif",
      }}
    >
      {oldText && (
        <span
          style={{
            backgroundColor: "color-mix(in srgb, var(--color-error) 15%, transparent)",
            textDecoration: "line-through",
            textDecorationColor: "var(--color-error)",
            color: "var(--color-text-muted)",
            padding: "1px 2px",
            borderRadius: 2,
          }}
        >
          {oldText}
        </span>
      )}
      {newText && (
        <span
          style={{
            backgroundColor: "color-mix(in srgb, var(--color-success) 15%, transparent)",
            color: "var(--color-text)",
            padding: "1px 2px",
            borderRadius: 2,
          }}
        >
          {newText}
        </span>
      )}
      <span
        style={{
          display: "inline-flex",
          gap: 2,
          marginLeft: 4,
          verticalAlign: "middle",
        }}
      >
        <button
          onClick={onAccept}
          title="Accept (Enter)"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 20,
            height: 20,
            padding: 0,
            background: "none",
            border: "1px solid var(--color-success)",
            borderRadius: 4,
            color: "var(--color-success)",
            cursor: "pointer",
          }}
        >
          <Check size={12} />
        </button>
        <button
          onClick={onReject}
          title="Reject (Esc)"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 20,
            height: 20,
            padding: 0,
            background: "none",
            border: "1px solid var(--color-error)",
            borderRadius: 4,
            color: "var(--color-error)",
            cursor: "pointer",
          }}
        >
          <X size={12} />
        </button>
      </span>
    </span>
  );
}
