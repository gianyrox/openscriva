"use client";

import { useState } from "react";
import { Mic, Plus, Trash2, ChevronRight } from "lucide-react";
import EditorShell from "@/components/editors/EditorShell";
import type { VoiceProfile, VoiceExemplar, AntiPattern } from "@/types/scriva";

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

export default function VoiceProfileEditor(props: { filePath: string }) {
  var [showExemplars, setShowExemplars] = useState(false);
  var [showAntiPatterns, setShowAntiPatterns] = useState(false);

  return (
    <EditorShell filePath={props.filePath} title="Voice Profile" icon={Mic}>
      {function renderForm(ctx) {
        var profile = ctx.data as VoiceProfile & { exemplars?: VoiceExemplar[]; antiPatterns?: AntiPattern[] };

        function updateProfile(field: string, value: any) {
          ctx.setData({ ...profile, [field]: value });
        }

        function updateMetric(field: string, value: any) {
          ctx.setData({ ...profile, metrics: { ...profile.metrics, [field]: value } });
        }

        return (
          <div style={{ maxWidth: 680, margin: "0 auto" }}>
            <div style={{ marginBottom: 32 }}>
              <h3 style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Voice Summary
              </h3>
              <textarea
                value={profile.summary || ""}
                onChange={function ch(e) { updateProfile("summary", e.target.value); }}
                placeholder="Describe the author's voice and writing style..."
                style={{ ...inputStyle, minHeight: 120, resize: "vertical" as const, lineHeight: 1.6 }}
              />
            </div>

            <div style={{ marginBottom: 32 }}>
              <h3 style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Style Metrics
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div style={{ marginBottom: 8 }}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 500, color: "var(--color-text-muted)", marginBottom: 4 }}>Avg Sentence Length</label>
                  <input type="number" value={profile.metrics?.avgSentenceLength || 0} onChange={function ch(e) { updateMetric("avgSentenceLength", parseFloat(e.target.value) || 0); }} style={inputStyle} />
                </div>
                <div style={{ marginBottom: 8 }}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 500, color: "var(--color-text-muted)", marginBottom: 4 }}>Vocabulary Richness</label>
                  <input type="text" value={profile.metrics?.vocabularyRichness || ""} onChange={function ch(e) { updateMetric("vocabularyRichness", e.target.value); }} placeholder="e.g., high, moderate" style={inputStyle} />
                </div>
                <div style={{ marginBottom: 8 }}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 500, color: "var(--color-text-muted)", marginBottom: 4 }}>POV Style</label>
                  <input type="text" value={profile.metrics?.povStyle || ""} onChange={function ch(e) { updateMetric("povStyle", e.target.value); }} placeholder="e.g., third person limited" style={inputStyle} />
                </div>
                <div style={{ marginBottom: 8 }}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 500, color: "var(--color-text-muted)", marginBottom: 4 }}>Dialogue/Narration Ratio</label>
                  <input type="text" value={profile.metrics?.dialogueToNarrationRatio || ""} onChange={function ch(e) { updateMetric("dialogueToNarrationRatio", e.target.value); }} placeholder="e.g., 40/60" style={inputStyle} />
                </div>
                <div style={{ marginBottom: 8 }}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 500, color: "var(--color-text-muted)", marginBottom: 4 }}>Metaphor Usage</label>
                  <input type="text" value={profile.metrics?.metaphorUsage || ""} onChange={function ch(e) { updateMetric("metaphorUsage", e.target.value); }} placeholder="e.g., frequent and vivid" style={inputStyle} />
                </div>
                <div style={{ marginBottom: 8 }}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 500, color: "var(--color-text-muted)", marginBottom: 4 }}>Paragraph Rhythm</label>
                  <input type="text" value={profile.metrics?.paragraphRhythm || ""} onChange={function ch(e) { updateMetric("paragraphRhythm", e.target.value); }} placeholder="e.g., short punchy paragraphs" style={inputStyle} />
                </div>
                <div style={{ marginBottom: 8 }}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 500, color: "var(--color-text-muted)", marginBottom: 4 }}>Tense Usage</label>
                  <input type="text" value={profile.metrics?.tenseUsage || ""} onChange={function ch(e) { updateMetric("tenseUsage", e.target.value); }} placeholder="e.g., past tense" style={inputStyle} />
                </div>
              </div>
            </div>

            <div style={{ marginBottom: 32 }}>
              <h3 style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Genre Calibration
              </h3>
              <textarea
                value={profile.genreCalibration || ""}
                onChange={function ch(e) { updateProfile("genreCalibration", e.target.value); }}
                placeholder="How does the voice fit the genre?"
                style={{ ...inputStyle, minHeight: 60, resize: "vertical" as const }}
              />
            </div>

            {profile.lastUpdated > 0 && (
              <div style={{ marginBottom: 24, fontSize: 11, color: "var(--color-text-muted)" }}>
                Last analyzed: {new Date(profile.lastUpdated).toLocaleDateString()}
                {profile.analyzedChapters && profile.analyzedChapters.length > 0 && (
                  <span> ({profile.analyzedChapters.length} chapter{profile.analyzedChapters.length !== 1 ? "s" : ""})</span>
                )}
              </div>
            )}
          </div>
        );
      }}
    </EditorShell>
  );
}
