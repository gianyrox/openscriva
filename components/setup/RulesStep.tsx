"use client";

import { useState } from "react";
import type { WritingRules } from "@/types/scriva";

interface RulesStepProps {
  rules: WritingRules;
  onChange: (rules: WritingRules) => void;
}

function inputStyle(): React.CSSProperties {
  return {
    width: "100%",
    padding: "8px 12px",
    fontFamily: "var(--font-inter), system-ui, sans-serif",
    fontSize: "13px",
    color: "var(--color-text)",
    backgroundColor: "var(--color-surface)",
    border: "1px solid var(--color-border)",
    borderRadius: "6px",
    outline: "none",
    boxSizing: "border-box" as const,
  };
}

function labelStyle(): React.CSSProperties {
  return {
    fontFamily: "var(--font-inter), system-ui, sans-serif",
    fontSize: "12px",
    fontWeight: 500,
    color: "var(--color-text-muted)",
    marginBottom: "4px",
    display: "block",
  };
}

export default function RulesStep(props: RulesStepProps) {
  function updateField(field: keyof WritingRules, value: string | string[]) {
    props.onChange({ ...props.rules, [field]: value });
  }

  function updateCommaList(field: "tone" | "avoid" | "prefer" | "revisionFocus", value: string) {
    var items = value.split(",").map(function trim(s) { return s.trim(); }).filter(function nonEmpty(s) { return s.length > 0; });
    updateField(field, items);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <h2 style={{ fontFamily: "var(--font-literata), Georgia, serif", fontSize: "18px", fontWeight: 500, color: "var(--color-text)", margin: 0 }}>
        Writing Rules
      </h2>
      <p style={{ fontFamily: "var(--font-inter), system-ui, sans-serif", fontSize: "13px", color: "var(--color-text-muted)", margin: 0, lineHeight: 1.5 }}>
        Set rules the AI will follow in every interaction. All fields are optional.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "12px", maxHeight: "320px", overflowY: "auto", paddingRight: "4px" }}>
        <div>
          <label style={labelStyle()}>Point of View</label>
          <select
            value={props.rules.povConsistency}
            onChange={function handleChange(e) { updateField("povConsistency", e.target.value); }}
            style={inputStyle()}
          >
            <option value="">Not set</option>
            <option value="first person">First Person</option>
            <option value="second person">Second Person</option>
            <option value="third person limited">Third Person Limited</option>
            <option value="third person omniscient">Third Person Omniscient</option>
            <option value="alternating">Alternating POV</option>
          </select>
        </div>

        <div>
          <label style={labelStyle()}>Tense</label>
          <select
            value={props.rules.tenseConsistency}
            onChange={function handleChange(e) { updateField("tenseConsistency", e.target.value); }}
            style={inputStyle()}
          >
            <option value="">Not set</option>
            <option value="past tense">Past Tense</option>
            <option value="present tense">Present Tense</option>
            <option value="mixed">Mixed (intentional)</option>
          </select>
        </div>

        <div>
          <label style={labelStyle()}>Dialogue Style</label>
          <input
            type="text"
            value={props.rules.dialogueStyle}
            onChange={function handleChange(e) { updateField("dialogueStyle", e.target.value); }}
            placeholder='e.g. "naturalistic, contractions, subtext-heavy"'
            style={inputStyle()}
          />
        </div>

        <div>
          <label style={labelStyle()}>Tone (comma-separated)</label>
          <input
            type="text"
            value={props.rules.tone.join(", ")}
            onChange={function handleChange(e) { updateCommaList("tone", e.target.value); }}
            placeholder="e.g. dark, literary, dry humor"
            style={inputStyle()}
          />
        </div>

        <div>
          <label style={labelStyle()}>Prefer (comma-separated)</label>
          <input
            type="text"
            value={props.rules.prefer.join(", ")}
            onChange={function handleChange(e) { updateCommaList("prefer", e.target.value); }}
            placeholder="e.g. active voice, strong verbs, sensory detail"
            style={inputStyle()}
          />
        </div>

        <div>
          <label style={labelStyle()}>Avoid (comma-separated)</label>
          <input
            type="text"
            value={props.rules.avoid.join(", ")}
            onChange={function handleChange(e) { updateCommaList("avoid", e.target.value); }}
            placeholder="e.g. adverbs, cliches, purple prose"
            style={inputStyle()}
          />
        </div>

        <div>
          <label style={labelStyle()}>Custom Instructions</label>
          <textarea
            value={props.rules.customInstructions}
            onChange={function handleChange(e) { updateField("customInstructions", e.target.value); }}
            placeholder="Any additional rules the AI should follow..."
            rows={3}
            style={{ ...inputStyle(), resize: "vertical" }}
          />
        </div>
      </div>
    </div>
  );
}
