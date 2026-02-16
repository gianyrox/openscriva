"use client";

import { useState } from "react";
import { Check, X, ChevronLeft, ChevronRight, Columns } from "lucide-react";
import type { MergeConflict, ConflictSection } from "@/types";

interface MergeConflictEditorProps {
  conflicts: MergeConflict[];
  onResolve: (resolved: MergeConflict[]) => void;
  onCancel: () => void;
  onOpenSplit: (conflict: MergeConflict) => void;
}

function parsePatchSections(patch: string): ConflictSection[] {
  var lines = patch.split("\n");
  var sections: ConflictSection[] = [];
  var yours = "";
  var theirs = "";
  var context = "";
  var idx = 0;

  for (var i = 0; i < lines.length; i++) {
    var line = lines[i];
    if (line.startsWith("@@")) {
      if (yours || theirs || context) {
        sections.push({
          id: "section-" + idx,
          yours: yours.trim(),
          theirs: theirs.trim(),
          context: context.trim(),
        });
        idx++;
        yours = "";
        theirs = "";
        context = "";
      }
      continue;
    }
    if (line.startsWith("-")) {
      yours += line.substring(1) + "\n";
    } else if (line.startsWith("+")) {
      theirs += line.substring(1) + "\n";
    } else {
      context += (line.startsWith(" ") ? line.substring(1) : line) + "\n";
    }
  }

  if (yours || theirs || context) {
    sections.push({
      id: "section-" + idx,
      yours: yours.trim(),
      theirs: theirs.trim(),
      context: context.trim(),
    });
  }

  if (sections.length === 0) {
    sections.push({
      id: "section-0",
      yours: "",
      theirs: "",
      context: patch,
    });
  }

  return sections;
}

export function expandConflictSections(conflicts: MergeConflict[]): MergeConflict[] {
  return conflicts.map(function expandFile(conflict) {
    var hasPatch = conflict.sections.length === 1 && conflict.sections[0].context && !conflict.sections[0].yours && !conflict.sections[0].theirs;
    if (hasPatch) {
      return {
        file: conflict.file,
        sections: parsePatchSections(conflict.sections[0].context),
      };
    }
    return conflict;
  });
}

function ConflictSectionView({
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
          padding: "8px 12px",
          marginBottom: 8,
          borderRadius: 6,
          border: "1px solid var(--color-border)",
          backgroundColor: "color-mix(in srgb, var(--color-success) 5%, transparent)",
          fontFamily: "var(--font-jetbrains-mono), monospace",
          fontSize: 13,
          lineHeight: 1.6,
          whiteSpace: "pre-wrap",
          color: "var(--color-text-muted)",
        }}
      >
        <span style={{ fontSize: 11, color: "var(--color-success)", fontFamily: "var(--font-inter), system-ui, sans-serif" }}>
          Resolved ({section.resolved})
        </span>
        <div style={{ marginTop: 4, color: "var(--color-text)" }}>
          {section.resolvedContent ?? (section.resolved === "yours" ? section.yours : section.theirs)}
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
            padding: "6px 12px",
            backgroundColor: "var(--color-surface)",
            fontFamily: "var(--font-jetbrains-mono), monospace",
            fontSize: 12,
            lineHeight: 1.6,
            whiteSpace: "pre-wrap",
            color: "var(--color-text-muted)",
            borderBottom: "1px solid var(--color-border)",
          }}
        >
          {section.context}
        </div>
      )}

      {section.yours && (
        <div
          style={{
            padding: "8px 12px",
            backgroundColor: "color-mix(in srgb, var(--color-error) 8%, transparent)",
            borderLeft: "3px solid var(--color-error)",
            fontFamily: "var(--font-jetbrains-mono), monospace",
            fontSize: 13,
            lineHeight: 1.6,
            whiteSpace: "pre-wrap",
          }}
        >
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
        </div>
      )}

      {section.theirs && (
        <div
          style={{
            padding: "8px 12px",
            backgroundColor: "color-mix(in srgb, var(--color-success) 8%, transparent)",
            borderLeft: "3px solid var(--color-success)",
            fontFamily: "var(--font-jetbrains-mono), monospace",
            fontSize: 13,
            lineHeight: 1.6,
            whiteSpace: "pre-wrap",
          }}
        >
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
        </div>
      )}

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
        {section.yours && (
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
        {section.theirs && (
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
        {section.yours && section.theirs && (
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

export default function MergeConflictEditor({ conflicts, onResolve, onCancel, onOpenSplit }: MergeConflictEditorProps) {
  var expanded = expandConflictSections(conflicts);
  var [resolved, setResolved] = useState<MergeConflict[]>(expanded);
  var [currentFileIdx, setCurrentFileIdx] = useState(0);

  var currentFile = resolved[currentFileIdx];
  if (!currentFile) return null;

  var totalSections = currentFile.sections.length;
  var resolvedSections = currentFile.sections.filter(function isResolved(s) { return !!s.resolved; }).length;
  var allFilesResolved = resolved.every(function checkFile(f) {
    return f.sections.every(function checkSection(s) { return !!s.resolved; });
  });

  function handleSectionResolve(sectionId: string, resolution: ConflictSection["resolved"], content?: string) {
    setResolved(function update(prev) {
      return prev.map(function mapFile(file, fIdx) {
        if (fIdx !== currentFileIdx) return file;
        return {
          ...file,
          sections: file.sections.map(function mapSection(s) {
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
            Merge Conflicts
          </span>
          <span style={{ color: "var(--color-text-muted)", fontSize: 12 }}>
            {resolved.length} file{resolved.length === 1 ? "" : "s"}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            onClick={function openSplit() { onOpenSplit(currentFile); }}
            title="Open split view"
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
            <Columns size={14} strokeWidth={1.5} />
            Split View
          </button>
          <button
            onClick={onCancel}
            title="Cancel"
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
            Cancel
          </button>
          {allFilesResolved && (
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

      {resolved.length > 1 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            padding: "6px 16px",
            borderBottom: "1px solid var(--color-border)",
            backgroundColor: "var(--color-surface)",
            fontFamily: "var(--font-inter), system-ui, sans-serif",
            fontSize: 12,
          }}
        >
          <button
            onClick={function prev() { setCurrentFileIdx(function p(i) { return Math.max(0, i - 1); }); }}
            disabled={currentFileIdx === 0}
            style={{
              display: "inline-flex",
              alignItems: "center",
              border: "none",
              background: "transparent",
              color: currentFileIdx === 0 ? "var(--color-border)" : "var(--color-text-muted)",
              cursor: currentFileIdx === 0 ? "default" : "pointer",
              padding: 2,
            }}
          >
            <ChevronLeft size={16} strokeWidth={1.5} />
          </button>
          <span style={{ color: "var(--color-text)" }}>
            {currentFile.file}
          </span>
          <span style={{ color: "var(--color-text-muted)" }}>
            ({currentFileIdx + 1}/{resolved.length})
          </span>
          <button
            onClick={function next() { setCurrentFileIdx(function n(i) { return Math.min(resolved.length - 1, i + 1); }); }}
            disabled={currentFileIdx === resolved.length - 1}
            style={{
              display: "inline-flex",
              alignItems: "center",
              border: "none",
              background: "transparent",
              color: currentFileIdx === resolved.length - 1 ? "var(--color-border)" : "var(--color-text-muted)",
              cursor: currentFileIdx === resolved.length - 1 ? "default" : "pointer",
              padding: 2,
            }}
          >
            <ChevronRight size={16} strokeWidth={1.5} />
          </button>
        </div>
      )}

      <div
        style={{
          padding: "8px 16px",
          borderBottom: "1px solid var(--color-border)",
          fontFamily: "var(--font-inter), system-ui, sans-serif",
          fontSize: 12,
          color: "var(--color-text-muted)",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span style={{ fontWeight: 500, color: "var(--color-text)" }}>{currentFile.file}</span>
        <span>{resolvedSections}/{totalSections} resolved</span>
        <span
          style={{
            width: 60,
            height: 4,
            borderRadius: 2,
            background: "var(--color-border)",
            overflow: "hidden",
            display: "inline-block",
          }}
        >
          <span
            style={{
              display: "block",
              width: (totalSections > 0 ? (resolvedSections / totalSections) * 100 : 0) + "%",
              height: "100%",
              borderRadius: 2,
              background: resolvedSections === totalSections ? "var(--color-success)" : "var(--color-accent)",
              transition: "width 300ms ease",
            }}
          />
        </span>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px 32px" }}>
        {currentFile.sections.map(function renderSection(section) {
          return (
            <ConflictSectionView
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
