"use client";

import { useState } from "react";
import { Settings, ChevronRight, Maximize2 } from "lucide-react";
import type { ScrivaConfig, ScrivaFeatures, FeatureKey, WritingType } from "@/types/scriva";

interface SidebarConfigProps {
  config: ScrivaConfig;
  onUpdate: (config: ScrivaConfig) => void;
  onOpen?: () => void;
}

var WRITING_TYPES: { id: WritingType; label: string }[] = [
  { id: "fiction", label: "Fiction" },
  { id: "nonfiction", label: "Nonfiction" },
  { id: "academic", label: "Academic" },
  { id: "custom", label: "Custom" },
];

var FEATURE_LABELS: { key: FeatureKey; label: string }[] = [
  { key: "characters", label: "Characters" },
  { key: "worldBuilding", label: "World Building" },
  { key: "plotThreads", label: "Plot Threads" },
  { key: "narrativeState", label: "Narrative State" },
  { key: "citations", label: "Citations" },
  { key: "voiceProfile", label: "Voice Profile" },
  { key: "chapterSummaries", label: "Chapter Summaries" },
  { key: "sceneSummaries", label: "Scene Summaries" },
  { key: "revisionTracking", label: "Revision Tracking" },
  { key: "tensionTracking", label: "Tension Tracking" },
  { key: "rag", label: "RAG Retrieval" },
];

export default function SidebarConfig(props: SidebarConfigProps) {
  var [open, setOpen] = useState(false);

  function handleWritingType(type: WritingType) {
    props.onUpdate({ ...props.config, writingType: type });
  }

  function handleFeatureToggle(key: FeatureKey) {
    var next: ScrivaFeatures = { ...props.config.features, [key]: !props.config.features[key] };
    props.onUpdate({ ...props.config, features: next });
  }

  var typeLabel = WRITING_TYPES.find(function match(t) { return t.id === props.config.writingType; })?.label || "Custom";

  return (
    <div style={{ borderBottom: "1px solid var(--color-border)" }}>
      <button
        onClick={function toggle() { setOpen(!open); }}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          width: "100%",
          padding: "8px 12px",
          border: "none",
          background: "transparent",
          cursor: "pointer",
          fontFamily: "var(--font-inter), system-ui, sans-serif",
          fontSize: 11,
          fontWeight: 600,
          color: "var(--color-text-muted)",
          letterSpacing: "0.5px",
          textAlign: "left",
          transition: "color 150ms",
        }}
        onMouseEnter={function enter(e) { e.currentTarget.style.color = "var(--color-text)"; }}
        onMouseLeave={function leave(e) { e.currentTarget.style.color = "var(--color-text-muted)"; }}
      >
        <ChevronRight
          size={12}
          style={{
            transform: open ? "rotate(90deg)" : "rotate(0deg)",
            transition: "transform 150ms ease",
            flexShrink: 0,
          }}
        />
        <Settings size={13} strokeWidth={1.5} style={{ flexShrink: 0 }} />
        <span style={{ flex: 1, textTransform: "uppercase" }}>Config</span>
        {props.onOpen && (
          <span
            onClick={function handleOpen(e) { e.stopPropagation(); if (props.onOpen) props.onOpen(); }}
            title="Open in editor"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 2,
              borderRadius: 3,
              color: "var(--color-text-muted)",
              opacity: 0.6,
              transition: "opacity 150ms, color 150ms",
              flexShrink: 0,
            }}
            onMouseEnter={function enter(e) { e.currentTarget.style.opacity = "1"; e.currentTarget.style.color = "var(--color-accent)"; }}
            onMouseLeave={function leave(e) { e.currentTarget.style.opacity = "0.6"; e.currentTarget.style.color = "var(--color-text-muted)"; }}
          >
            <Maximize2 size={11} strokeWidth={1.5} />
          </span>
        )}
        <span style={{
          fontSize: 10,
          fontWeight: 500,
          color: "var(--color-accent)",
          textTransform: "none",
          letterSpacing: "normal",
        }}>
          {typeLabel}
        </span>
      </button>

      {open && (
        <div style={{ padding: "0 12px 10px", fontFamily: "var(--font-inter), system-ui, sans-serif", fontSize: 12 }}>
          <div style={{ marginBottom: 10 }}>
            <span style={{ fontSize: 10, fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: 4 }}>
              Writing Type
            </span>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {WRITING_TYPES.map(function renderType(t) {
                var active = props.config.writingType === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={function select() { handleWritingType(t.id); }}
                    style={{
                      padding: "3px 10px",
                      fontSize: 11,
                      fontWeight: 500,
                      fontFamily: "inherit",
                      border: active ? "1px solid var(--color-accent)" : "1px solid var(--color-border)",
                      borderRadius: 5,
                      background: active ? "color-mix(in srgb, var(--color-accent) 10%, transparent)" : "transparent",
                      color: active ? "var(--color-accent)" : "var(--color-text-muted)",
                      cursor: "pointer",
                      transition: "all 150ms",
                    }}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <span style={{ fontSize: 10, fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: 4 }}>
              Features
            </span>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {FEATURE_LABELS.map(function renderFeature(f) {
                var enabled = props.config.features[f.key];
                return (
                  <button
                    key={f.key}
                    onClick={function toggle() { handleFeatureToggle(f.key); }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "4px 6px",
                      border: "none",
                      background: "transparent",
                      cursor: "pointer",
                      fontFamily: "inherit",
                      fontSize: 11,
                      color: enabled ? "var(--color-text)" : "var(--color-text-muted)",
                      textAlign: "left",
                      borderRadius: 4,
                      transition: "background 100ms",
                    }}
                    onMouseEnter={function enter(e) { e.currentTarget.style.backgroundColor = "var(--color-surface-hover)"; }}
                    onMouseLeave={function leave(e) { e.currentTarget.style.backgroundColor = "transparent"; }}
                  >
                    <div style={{
                      width: 14,
                      height: 14,
                      borderRadius: 3,
                      border: enabled ? "none" : "1.5px solid var(--color-text-muted)",
                      backgroundColor: enabled ? "var(--color-accent)" : "transparent",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      transition: "all 150ms",
                    }}>
                      {enabled && (
                        <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                    <span>{f.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
