"use client";

import { useState } from "react";

interface VoiceSeedStepProps {
  excerpts: string[];
  onChange: (excerpts: string[]) => void;
}

export default function VoiceSeedStep(props: VoiceSeedStepProps) {
  function updateExcerpt(index: number, value: string) {
    var updated = props.excerpts.slice();
    updated[index] = value;
    props.onChange(updated);
  }

  function addExcerpt() {
    if (props.excerpts.length < 5) {
      props.onChange(props.excerpts.concat([""]));
    }
  }

  function removeExcerpt(index: number) {
    var updated = props.excerpts.filter(function keep(_, i) { return i !== index; });
    props.onChange(updated);
  }

  var hasContent = props.excerpts.some(function hasText(e) { return e.trim().length > 0; });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <h2 style={{ fontFamily: "var(--font-literata), Georgia, serif", fontSize: "18px", fontWeight: 500, color: "var(--color-text)", margin: 0 }}>
        Voice Seeding
      </h2>
      <p style={{ fontFamily: "var(--font-inter), system-ui, sans-serif", fontSize: "13px", color: "var(--color-text-muted)", margin: 0, lineHeight: 1.5 }}>
        Paste 2-3 excerpts of your writing (or writing you aspire to match). The AI will analyze these to understand your voice. Skip this to do it later.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: "300px", overflowY: "auto" }}>
        {props.excerpts.map(function renderExcerpt(excerpt, i) {
          return (
            <div key={i} style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <label style={{ fontFamily: "var(--font-inter), system-ui, sans-serif", fontSize: "12px", fontWeight: 500, color: "var(--color-text-muted)" }}>
                  Excerpt {i + 1}
                </label>
                {props.excerpts.length > 1 && (
                  <button
                    type="button"
                    onClick={function handleRemove() { removeExcerpt(i); }}
                    style={{
                      fontFamily: "var(--font-inter), system-ui, sans-serif",
                      fontSize: "11px",
                      color: "var(--color-text-muted)",
                      backgroundColor: "transparent",
                      border: "none",
                      cursor: "pointer",
                      padding: "2px 6px",
                    }}
                  >
                    Remove
                  </button>
                )}
              </div>
              <textarea
                value={excerpt}
                onChange={function handleChange(e) { updateExcerpt(i, e.target.value); }}
                placeholder="Paste a paragraph or two of your writing..."
                rows={4}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  fontFamily: "var(--font-inter), system-ui, sans-serif",
                  fontSize: "13px",
                  color: "var(--color-text)",
                  backgroundColor: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "6px",
                  outline: "none",
                  resize: "vertical",
                  lineHeight: 1.5,
                  boxSizing: "border-box" as const,
                }}
              />
            </div>
          );
        })}
      </div>

      {props.excerpts.length < 5 && (
        <button
          type="button"
          onClick={addExcerpt}
          style={{
            padding: "8px 16px",
            fontFamily: "var(--font-inter), system-ui, sans-serif",
            fontSize: "13px",
            fontWeight: 500,
            color: "var(--color-text-muted)",
            backgroundColor: "transparent",
            border: "1px solid var(--color-border)",
            borderRadius: "6px",
            cursor: "pointer",
            alignSelf: "flex-start",
          }}
        >
          + Add Excerpt
        </button>
      )}

      {!hasContent && (
        <p style={{ fontFamily: "var(--font-inter), system-ui, sans-serif", fontSize: "12px", color: "var(--color-text-muted)", fontStyle: "italic", margin: 0 }}>
          You can skip this step. Voice analysis can also be done automatically after you write a few chapters.
        </p>
      )}
    </div>
  );
}
