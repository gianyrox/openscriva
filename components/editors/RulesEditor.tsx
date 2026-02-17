"use client";

import { Settings } from "lucide-react";
import EditorShell from "@/components/editors/EditorShell";
import type { WritingRules } from "@/types/scriva";

var inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 12px",
  fontSize: 13,
  border: "1px solid var(--color-border)",
  borderRadius: 6,
  backgroundColor: "var(--color-bg)",
  color: "var(--color-text)",
  fontFamily: "var(--font-inter), system-ui, sans-serif",
  outline: "none",
};

function TagInput(props: { value: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      var val = e.currentTarget.value.trim();
      if (val && props.value.indexOf(val) === -1) {
        props.onChange([...props.value, val]);
      }
      e.currentTarget.value = "";
    }
  }

  function removeTag(idx: number) {
    props.onChange(props.value.filter(function f(_, i) { return i !== idx; }));
  }

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: props.value.length > 0 ? 4 : 0 }}>
        {props.value.map(function renderTag(tag, i) {
          return (
            <span key={tag + i} style={{
              display: "inline-flex", alignItems: "center", gap: 3, padding: "2px 8px", fontSize: 11, borderRadius: 4,
              backgroundColor: "color-mix(in srgb, var(--color-accent) 12%, transparent)", color: "var(--color-accent)",
            }}>
              {tag}
              <button onClick={function rm() { removeTag(i); }} style={{ border: "none", background: "none", color: "inherit", cursor: "pointer", padding: 0, fontSize: 12, lineHeight: 1 }}>x</button>
            </span>
          );
        })}
      </div>
      <input type="text" onKeyDown={handleKeyDown} placeholder={props.placeholder || "Type and press Enter..."} style={inputStyle} />
    </div>
  );
}

function Field(props: { label: string; desc?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "var(--color-text)", marginBottom: 4 }}>
        {props.label}
      </label>
      {props.desc && <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginBottom: 6, lineHeight: 1.4 }}>{props.desc}</div>}
      {props.children}
    </div>
  );
}

export default function RulesEditor(props: { filePath: string }) {
  return (
    <EditorShell filePath={props.filePath} title="Writing Rules" icon={Settings}>
      {function renderForm(ctx) {
        var rules = ctx.data as WritingRules;

        function update(field: string, value: any) {
          ctx.setData({ ...rules, [field]: value });
        }

        return (
          <div style={{ maxWidth: 680, margin: "0 auto" }}>
            <div style={{ marginBottom: 32 }}>
              <h3 style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Voice & Style
              </h3>
              <Field label="POV Consistency" desc="The point of view the AI should maintain">
                <input type="text" value={rules.povConsistency || ""} onChange={function ch(e) { update("povConsistency", e.target.value); }} placeholder="e.g., Third person limited" style={inputStyle} />
              </Field>
              <Field label="Tense Consistency" desc="The tense the AI should use">
                <input type="text" value={rules.tenseConsistency || ""} onChange={function ch(e) { update("tenseConsistency", e.target.value); }} placeholder="e.g., Past tense" style={inputStyle} />
              </Field>
              <Field label="Dialogue Style" desc="How the AI should format and approach dialogue">
                <input type="text" value={rules.dialogueStyle || ""} onChange={function ch(e) { update("dialogueStyle", e.target.value); }} placeholder="e.g., Naturalistic, with subtext" style={inputStyle} />
              </Field>
            </div>

            <div style={{ marginBottom: 32 }}>
              <h3 style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Tone & Preferences
              </h3>
              <Field label="Tone" desc="Words that describe the desired tone">
                <TagInput value={rules.tone || []} onChange={function ch(v) { update("tone", v); }} placeholder="Add tone word..." />
              </Field>
              <Field label="Prefer" desc="Stylistic choices the AI should lean toward">
                <TagInput value={rules.prefer || []} onChange={function ch(v) { update("prefer", v); }} placeholder="Add preference..." />
              </Field>
              <Field label="Avoid" desc="Things the AI should never do">
                <TagInput value={rules.avoid || []} onChange={function ch(v) { update("avoid", v); }} placeholder="Add avoidance..." />
              </Field>
            </div>

            <div style={{ marginBottom: 32 }}>
              <h3 style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Revision
              </h3>
              <Field label="Revision Focus" desc="Areas the AI should prioritize when reviewing">
                <TagInput value={rules.revisionFocus || []} onChange={function ch(v) { update("revisionFocus", v); }} placeholder="Add focus area..." />
              </Field>
            </div>

            <div style={{ marginBottom: 32 }}>
              <h3 style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Custom Instructions
              </h3>
              <Field label="Custom Instructions" desc="Free-form instructions that will be included in every AI prompt">
                <textarea
                  value={rules.customInstructions || ""}
                  onChange={function ch(e) { update("customInstructions", e.target.value); }}
                  placeholder="Any additional instructions for the AI..."
                  style={{ ...inputStyle, minHeight: 120, resize: "vertical" as const }}
                />
              </Field>
            </div>
          </div>
        );
      }}
    </EditorShell>
  );
}
