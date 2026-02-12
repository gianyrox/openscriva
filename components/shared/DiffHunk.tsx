"use client";

import { Check, X } from "lucide-react";

interface DiffHunkProps {
  oldText: string;
  newText: string;
  onAccept: () => void;
  onReject: () => void;
}

export default function DiffHunk({ oldText, newText, onAccept, onReject }: DiffHunkProps) {
  return (
    <span
      style={{
        display: "inline",
        fontFamily: "var(--font-literata), serif",
        transition: "opacity 300ms ease",
      }}
    >
      {oldText && (
        <span
          style={{
            backgroundColor: "color-mix(in srgb, var(--color-error) 15%, transparent)",
            textDecoration: "line-through",
            color: "var(--color-error)",
            padding: "1px 2px",
            borderRadius: 2,
            transition: "background-color 300ms ease, opacity 300ms ease",
          }}
        >
          {oldText}
        </span>
      )}
      {newText && (
        <span
          style={{
            backgroundColor: "color-mix(in srgb, var(--color-success) 15%, transparent)",
            color: "var(--color-success)",
            padding: "1px 2px",
            borderRadius: 2,
            transition: "background-color 300ms ease, opacity 300ms ease",
          }}
        >
          {newText}
        </span>
      )}
      <button
        onClick={onAccept}
        title="Accept"
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 18,
          height: 18,
          marginLeft: 4,
          padding: 0,
          background: "none",
          border: "1px solid var(--color-success)",
          borderRadius: 3,
          color: "var(--color-success)",
          cursor: "pointer",
          verticalAlign: "middle",
        }}
      >
        <Check size={12} />
      </button>
      <button
        onClick={onReject}
        title="Reject"
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 18,
          height: 18,
          marginLeft: 2,
          padding: 0,
          background: "none",
          border: "1px solid var(--color-error)",
          borderRadius: 3,
          color: "var(--color-error)",
          cursor: "pointer",
          verticalAlign: "middle",
        }}
      >
        <X size={12} />
      </button>
    </span>
  );
}
