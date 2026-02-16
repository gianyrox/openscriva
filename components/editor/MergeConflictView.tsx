"use client";

import { useState } from "react";
import { Check, X, ChevronLeft, ChevronRight } from "lucide-react";
import type { MergeConflict, ConflictSection } from "@/types";

interface MergeConflictViewProps {
  conflict: MergeConflict;
  onResolve: (resolved: MergeConflict) => void;
  onCancel: () => void;
}

function SplitSection({
  section,
  onResolve,
}: {
  section: ConflictSection;
  onResolve: (resolution: ConflictSection["resolved"], content?: string) => void;
}) {
  if (section.resolved) {
    return (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 0,
          marginBottom: 8,
          borderRadius: 6,
          border: "1px solid var(--color-border)",
          overflow: "hidden",
          backgroundColor: "color-mix(in srgb, var(--color-success) 5%, transparent)",
        }}
      >
        <div
          style={{
            padding: "8px 12px",
            gridColumn: "1 / -1",
            fontFamily: "var(--font-inter), system-ui, sans-serif",
            fontSize: 12,
            color: "var(--color-success)",
          }}
        >
          Resolved: accepted {section.resolved}
        </div>
      </div>
    );
  }

  var hasYours = !!section.yours;
  var hasTheirs = !!section.theirs;
  var contextOnly = !hasYours && !hasTheirs;

  if (contextOnly) {
    return (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 0,
          marginBottom: 8,
          borderRadius: 6,
          border: "1px solid var(--color-border)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "8px 12px",
            fontFamily: "var(--font-jetbrains-mono), monospace",
            fontSize: 13,
            lineHeight: 1.6,
            whiteSpace: "pre-wrap",
            color: "var(--color-text-muted)",
            borderRight: "1px solid var(--color-border)",
          }}
        >
          {section.context}
        </div>
        <div
          style={{
            padding: "8px 12px",
            fontFamily: "var(--font-jetbrains-mono), monospace",
            fontSize: 13,
            lineHeight: 1.6,
            whiteSpace: "pre-wrap",
            color: "var(--color-text-muted)",
          }}
        >
          {section.context}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        marginBottom: 12,
        borderRadius: 6,
        border: "1px solid var(--color-border)",
        overflow: "hidden",
      }}
    >
      {section.context && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 0,
            borderBottom: "1px solid var(--color-border)",
          }}
        >
          <div
            style={{
              padding: "6px 12px",
              backgroundColor: "var(--color-surface)",
              fontFamily: "var(--font-jetbrains-mono), monospace",
              fontSize: 12,
              lineHeight: 1.6,
              whiteSpace: "pre-wrap",
              color: "var(--color-text-muted)",
              borderRight: "1px solid var(--color-border)",
            }}
          >
            {section.context}
          </div>
          <div
            style={{
              padding: "6px 12px",
              backgroundColor: "var(--color-surface)",
              fontFamily: "var(--font-jetbrains-mono), monospace",
              fontSize: 12,
              lineHeight: 1.6,
              whiteSpace: "pre-wrap",
              color: "var(--color-text-muted)",
            }}
          >
            {section.context}
          </div>
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 0,
        }}
      >
        <div
          style={{
            padding: "8px 12px",
            backgroundColor: hasYours ? "color-mix(in srgb, var(--color-error) 8%, transparent)" : "transparent",
            borderLeft: hasYours ? "3px solid var(--color-error)" : "none",
            borderRight: "1px solid var(--color-border)",
            fontFamily: "var(--font-jetbrains-mono), monospace",
            fontSize: 13,
            lineHeight: 1.6,
            whiteSpace: "pre-wrap",
            minHeight: 40,
          }}
        >
          {hasYours && (
            <>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  color: "var(--color-error)",
                  marginBottom: 4,
                  fontFamily: "var(--font-inter), system-ui, sans-serif",
                }}
              >
                Your Draft
              </div>
              {section.yours}
            </>
          )}
        </div>
        <div
          style={{
            padding: "8px 12px",
            backgroundColor: hasTheirs ? "color-mix(in srgb, var(--color-success) 8%, transparent)" : "transparent",
            borderLeft: hasTheirs ? "3px solid var(--color-success)" : "none",
            fontFamily: "var(--font-jetbrains-mono), monospace",
            fontSize: 13,
            lineHeight: 1.6,
            whiteSpace: "pre-wrap",
            minHeight: 40,
          }}
        >
          {hasTheirs && (
            <>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  color: "var(--color-success)",
                  marginBottom: 4,
                  fontFamily: "var(--font-inter), system-ui, sans-serif",
                }}
              >
                From Main
              </div>
              {section.theirs}
            </>
          )}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "6px 12px",
          backgroundColor: "var(--color-surface)",
          borderTop: "1px solid var(--color-border)",
        }}
      >
        {hasYours && (
          <button
            onClick={function acceptYours() { onResolve("yours"); }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "3px 10px",
              borderRadius: 4,
              border: "1px solid var(--color-error)",
              background: "transparent",
              color: "var(--color-error)",
              cursor: "pointer",
              fontSize: 11,
              fontFamily: "var(--font-inter), system-ui, sans-serif",
            }}
          >
            <Check size={12} />
            Accept Yours
          </button>
        )}
        {hasTheirs && (
          <button
            onClick={function acceptTheirs() { onResolve("theirs"); }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "3px 10px",
              borderRadius: 4,
              border: "1px solid var(--color-success)",
              background: "transparent",
              color: "var(--color-success)",
              cursor: "pointer",
              fontSize: 11,
              fontFamily: "var(--font-inter), system-ui, sans-serif",
            }}
          >
            <Check size={12} />
            Accept Main
          </button>
        )}
        {hasYours && hasTheirs && (
          <button
            onClick={function acceptBoth() { onResolve("both", section.yours + "\n" + section.theirs); }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "3px 10px",
              borderRadius: 4,
              border: "1px solid var(--color-border)",
              background: "transparent",
              color: "var(--color-text-muted)",
              cursor: "pointer",
              fontSize: 11,
              fontFamily: "var(--font-inter), system-ui, sans-serif",
            }}
          >
            Accept Both
          </button>
        )}
      </div>
    </div>
  );
}

export default function MergeConflictView({ conflict, onResolve, onCancel }: MergeConflictViewProps) {
  var [resolved, setResolved] = useState<MergeConflict>(conflict);

  var totalSections = resolved.sections.length;
  var resolvedSections = resolved.sections.filter(function isResolved(s) { return !!s.resolved; }).length;
  var allResolved = resolvedSections === totalSections;

  function handleSectionResolve(sectionId: string, resolution: ConflictSection["resolved"], content?: string) {
    setResolved(function update(prev) {
      return {
        ...prev,
        sections: prev.sections.map(function mapSection(s) {
          if (s.id !== sectionId) return s;
          var resolvedContent = content;
          if (!resolvedContent) {
            if (resolution === "yours") resolvedContent = s.yours;
            else if (resolution === "theirs") resolvedContent = s.theirs;
            else if (resolution === "both") resolvedContent = s.yours + "\n" + s.theirs;
          }
          return { ...s, resolved: resolution, resolvedContent: resolvedContent };
        }),
      };
    });
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        backgroundColor: "var(--color-bg)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 16px",
          borderBottom: "1px solid var(--color-border)",
          backgroundColor: "var(--color-surface)",
          fontFamily: "var(--font-inter), system-ui, sans-serif",
          fontSize: 13,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontWeight: 600, color: "var(--color-text)" }}>
            Split Merge View
          </span>
          <span style={{ color: "var(--color-text-muted)", fontSize: 12 }}>
            {resolved.file}
          </span>
          <span style={{ color: "var(--color-text-muted)", fontSize: 11 }}>
            {resolvedSections}/{totalSections} resolved
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            onClick={onCancel}
            title="Back to inline view"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "4px 10px",
              borderRadius: 4,
              border: "1px solid var(--color-border)",
              background: "transparent",
              color: "var(--color-text-muted)",
              cursor: "pointer",
              fontSize: 12,
              fontFamily: "inherit",
            }}
          >
            <X size={14} strokeWidth={1.5} />
            Back
          </button>
          {allResolved && (
            <button
              onClick={function done() { onResolve(resolved); }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                padding: "4px 12px",
                borderRadius: 4,
                border: "none",
                background: "var(--color-accent)",
                color: "#fff",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 600,
                fontFamily: "inherit",
              }}
            >
              <Check size={14} strokeWidth={1.5} />
              Done
            </button>
          )}
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 0,
          borderBottom: "1px solid var(--color-border)",
          backgroundColor: "var(--color-surface)",
          fontFamily: "var(--font-inter), system-ui, sans-serif",
          fontSize: 12,
          fontWeight: 600,
        }}
      >
        <div
          style={{
            padding: "6px 16px",
            borderRight: "1px solid var(--color-border)",
            color: "var(--color-error)",
          }}
        >
          Your Draft
        </div>
        <div
          style={{
            padding: "6px 16px",
            color: "var(--color-success)",
          }}
        >
          Main
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px 32px" }}>
        {resolved.sections.map(function renderSection(section) {
          return (
            <SplitSection
              key={section.id}
              section={section}
              onResolve={function resolve(resolution, content) {
                handleSectionResolve(section.id, resolution, content);
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
