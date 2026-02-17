"use client";

import { useState } from "react";
import type { WritingType } from "@/types/scriva";

interface WritingTypeStepProps {
  value: WritingType;
  onChange: (type: WritingType) => void;
}

var types: { id: WritingType; label: string; description: string }[] = [
  { id: "fiction", label: "Fiction", description: "Novels, short stories, novellas. Enables characters, world-building, plot threads, and narrative tracking." },
  { id: "nonfiction", label: "Nonfiction", description: "Memoir, essays, self-help, biography. Enables voice profile, chapter summaries, and revision tracking." },
  { id: "academic", label: "Academic", description: "Research papers, theses, textbooks. Enables citations, voice profile, summaries, and RAG retrieval." },
  { id: "custom", label: "Custom", description: "Start with minimal defaults and choose exactly what you need." },
];

export default function WritingTypeStep(props: WritingTypeStepProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <h2 style={{ fontFamily: "var(--font-literata), Georgia, serif", fontSize: "18px", fontWeight: 500, color: "var(--color-text)", margin: 0 }}>
        What are you writing?
      </h2>
      <p style={{ fontFamily: "var(--font-inter), system-ui, sans-serif", fontSize: "13px", color: "var(--color-text-muted)", margin: 0, lineHeight: 1.5 }}>
        This sets the AI features for your project. You can change any of these later.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "8px" }}>
        {types.map(function renderType(t) {
          var isSelected = props.value === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={function select() { props.onChange(t.id); }}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "4px",
                padding: "14px 16px",
                textAlign: "left",
                backgroundColor: isSelected ? "var(--color-surface)" : "transparent",
                border: isSelected ? "1.5px solid var(--color-accent)" : "1px solid var(--color-border)",
                borderRadius: "10px",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              <span style={{ fontFamily: "var(--font-inter), system-ui, sans-serif", fontSize: "14px", fontWeight: 500, color: isSelected ? "var(--color-accent)" : "var(--color-text)" }}>
                {t.label}
              </span>
              <span style={{ fontFamily: "var(--font-inter), system-ui, sans-serif", fontSize: "12px", color: "var(--color-text-muted)", lineHeight: 1.4 }}>
                {t.description}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
