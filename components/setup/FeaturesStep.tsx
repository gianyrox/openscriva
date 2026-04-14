"use client";

import type { ScrivaFeatures, FeatureKey } from "@/types/scriva";

interface FeaturesStepProps {
  features: ScrivaFeatures;
  onChange: (features: ScrivaFeatures) => void;
}

var featureList: { key: FeatureKey; label: string; description: string }[] = [
  { key: "characters", label: "Characters", description: "Track character states, relationships, and arcs" },
  { key: "worldBuilding", label: "World Building", description: "Places, timeline, objects, and world rules" },
  { key: "plotThreads", label: "Plot Threads", description: "Track open/resolved plot threads across chapters" },
  { key: "narrativeState", label: "Narrative State", description: "What the reader knows, expects, and dramatic irony" },
  { key: "citations", label: "Citations", description: "Bibliography management with APA/Chicago/MLA formatting" },
  { key: "voiceProfile", label: "Voice Profile", description: "Analyze and maintain consistent writing voice" },
  { key: "chapterSummaries", label: "Chapter Summaries", description: "AI-generated summaries for each chapter" },
  { key: "sceneSummaries", label: "Scene Summaries", description: "Granular scene-level beat tracking" },
  { key: "revisionTracking", label: "Revision Tracking", description: "Track edits and learn from accept/reject patterns" },
  { key: "tensionTracking", label: "Tension Tracking", description: "Pacing and emotional beat tracking per chapter" },
  { key: "rag", label: "RAG Retrieval", description: "Semantic search across your manuscript and research" },
];

export default function FeaturesStep(props: FeaturesStepProps) {
  function toggle(key: FeatureKey) {
    props.onChange({ ...props.features, [key]: !props.features[key] });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <h2 style={{ fontFamily: "var(--font-literata), Georgia, serif", fontSize: "18px", fontWeight: 500, color: "var(--color-text)", margin: 0 }}>
        AI Features
      </h2>
      <p style={{ fontFamily: "var(--font-inter), system-ui, sans-serif", fontSize: "13px", color: "var(--color-text-muted)", margin: 0, lineHeight: 1.5 }}>
        Toggle the features the AI will use. Disabled features cost nothing. You can change these anytime.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "4px", maxHeight: "340px", overflowY: "auto" }}>
        {featureList.map(function renderFeature(f) {
          var isOn = props.features[f.key];
          return (
            <button
              key={f.key}
              type="button"
              onClick={function handleClick() { toggle(f.key); }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "10px 14px",
                textAlign: "left",
                backgroundColor: isOn ? "var(--color-surface)" : "transparent",
                border: isOn ? "1px solid var(--color-accent)" : "1px solid var(--color-border)",
                borderRadius: "8px",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              <div style={{
                width: "18px",
                height: "18px",
                borderRadius: "4px",
                border: isOn ? "none" : "1.5px solid var(--color-text-muted)",
                backgroundColor: isOn ? "var(--color-accent)" : "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                transition: "all 0.15s",
              }}>
                {isOn && (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                <span style={{ fontFamily: "var(--font-inter), system-ui, sans-serif", fontSize: "13px", fontWeight: 500, color: "var(--color-text)" }}>
                  {f.label}
                </span>
                <span style={{ fontFamily: "var(--font-inter), system-ui, sans-serif", fontSize: "11px", color: "var(--color-text-muted)" }}>
                  {f.description}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
