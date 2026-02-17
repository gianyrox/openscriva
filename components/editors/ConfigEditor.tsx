"use client";

import { Settings } from "lucide-react";
import EditorShell from "@/components/editors/EditorShell";
import { saveScrivaConfig } from "@/lib/bookConfig";
import { useAppStore } from "@/store";
import type { ScrivaConfig, ScrivaFeatures, WritingType, FeatureKey } from "@/types/scriva";

var WRITING_TYPES: { id: WritingType; label: string; desc: string }[] = [
  { id: "fiction", label: "Fiction", desc: "Novels, short stories, novellas" },
  { id: "nonfiction", label: "Nonfiction", desc: "Memoir, essays, biography" },
  { id: "academic", label: "Academic", desc: "Research, textbooks, papers" },
  { id: "custom", label: "Custom", desc: "Custom configuration" },
];

var FEATURE_INFO: { key: FeatureKey; label: string; desc: string }[] = [
  { key: "characters", label: "Characters", desc: "Track character profiles, relationships, arcs, and appearances across chapters" },
  { key: "worldBuilding", label: "World Building", desc: "Manage places, timeline events, objects, and world rules" },
  { key: "plotThreads", label: "Plot Threads", desc: "Track open and resolved plot threads across the narrative" },
  { key: "narrativeState", label: "Narrative State", desc: "AI tracks what the reader knows, expects, and dramatic irony" },
  { key: "citations", label: "Citations", desc: "Manage bibliography and references with format support" },
  { key: "voiceProfile", label: "Voice Profile", desc: "Analyze and maintain consistent authorial voice" },
  { key: "chapterSummaries", label: "Chapter Summaries", desc: "AI generates summaries for each chapter for context" },
  { key: "sceneSummaries", label: "Scene Summaries", desc: "AI breaks chapters into scene beats for granular recall" },
  { key: "revisionTracking", label: "Revision Tracking", desc: "Log edits and learn from author preferences" },
  { key: "tensionTracking", label: "Tension Tracking", desc: "Track pacing and tension levels across chapters" },
  { key: "rag", label: "RAG Retrieval", desc: "Embedding-based search for precise recall from the manuscript" },
];

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

export default function ConfigEditor(props: { filePath: string }) {
  var currentBook = useAppStore(function selectBook(s) { return s.editor.currentBook; });

  return (
    <EditorShell filePath={props.filePath} title="Framework Settings" icon={Settings}>
      {function renderForm(ctx) {
        var config = ctx.data as ScrivaConfig;

        function updateConfig(partial: Partial<ScrivaConfig>) {
          var next = { ...config, ...partial };
          ctx.setData(next);
          if (currentBook) saveScrivaConfig(currentBook, next);
        }

        function updateFeature(key: FeatureKey, enabled: boolean) {
          var next = { ...config, features: { ...config.features, [key]: enabled } };
          ctx.setData(next);
          if (currentBook) saveScrivaConfig(currentBook, next);
        }

        function updateAI(field: string, value: any) {
          updateConfig({ ai: { ...config.ai, [field]: value } });
        }

        return (
          <div style={{ maxWidth: 680, margin: "0 auto" }}>
            <div style={{ marginBottom: 32 }}>
              <h3 style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Writing Type
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {WRITING_TYPES.map(function renderType(t) {
                  var active = config.writingType === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={function select() { updateConfig({ writingType: t.id }); }}
                      style={{
                        padding: "12px 16px",
                        border: active ? "2px solid var(--color-accent)" : "1px solid var(--color-border)",
                        borderRadius: 8,
                        backgroundColor: active ? "color-mix(in srgb, var(--color-accent) 8%, transparent)" : "var(--color-surface)",
                        cursor: "pointer",
                        textAlign: "left",
                        fontFamily: "inherit",
                        transition: "all 150ms",
                      }}
                    >
                      <div style={{ fontSize: 13, fontWeight: 600, color: active ? "var(--color-accent)" : "var(--color-text)", marginBottom: 2 }}>
                        {t.label}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>{t.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ marginBottom: 32 }}>
              <h3 style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Features
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {FEATURE_INFO.map(function renderFeature(f) {
                  var enabled = config.features[f.key];
                  return (
                    <button
                      key={f.key}
                      onClick={function toggle() { updateFeature(f.key, !enabled); }}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 12,
                        padding: "10px 14px",
                        border: "1px solid var(--color-border)",
                        borderRadius: 6,
                        backgroundColor: enabled ? "color-mix(in srgb, var(--color-accent) 5%, transparent)" : "transparent",
                        cursor: "pointer",
                        fontFamily: "inherit",
                        textAlign: "left",
                        transition: "all 150ms",
                      }}
                    >
                      <div style={{
                        width: 18,
                        height: 18,
                        borderRadius: 4,
                        border: enabled ? "none" : "2px solid var(--color-text-muted)",
                        backgroundColor: enabled ? "var(--color-accent)" : "transparent",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        marginTop: 1,
                        transition: "all 150ms",
                      }}>
                        {enabled && (
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                            <path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 500, color: enabled ? "var(--color-text)" : "var(--color-text-muted)" }}>{f.label}</div>
                        <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 2, lineHeight: 1.4 }}>{f.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ marginBottom: 32 }}>
              <h3 style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                AI Configuration
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 500, color: "var(--color-text-muted)", marginBottom: 4 }}>Default Model</label>
                  <select
                    value={config.ai.defaultModel}
                    onChange={function ch(e) { updateAI("defaultModel", e.target.value); }}
                    style={inputStyle}
                  >
                    <option value="haiku">Haiku (fast, cheap)</option>
                    <option value="sonnet">Sonnet (balanced)</option>
                    <option value="opus">Opus (highest quality)</option>
                  </select>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 500, color: "var(--color-text-muted)", marginBottom: 4 }}>Context Budget (tokens)</label>
                  <input
                    type="number"
                    value={config.ai.contextBudget}
                    onChange={function ch(e) { updateAI("contextBudget", parseInt(e.target.value) || 4000); }}
                    style={inputStyle}
                  />
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 500, color: "var(--color-text-muted)", marginBottom: 4 }}>RAG Top-K Results</label>
                  <input
                    type="number"
                    value={config.ai.ragTopK}
                    onChange={function ch(e) { updateAI("ragTopK", parseInt(e.target.value) || 5); }}
                    style={inputStyle}
                  />
                </div>
                <div style={{ marginBottom: 12, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={config.ai.autoReindex}
                      onChange={function ch(e) { updateAI("autoReindex", e.target.checked); }}
                      style={{ width: 16, height: 16, accentColor: "var(--color-accent)" }}
                    />
                    <span style={{ fontSize: 13, color: "var(--color-text)" }}>Auto-reindex on save</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        );
      }}
    </EditorShell>
  );
}
