"use client";

import { useRef, useCallback, useMemo } from "react";
import { Check, X, CheckCheck, XCircle } from "lucide-react";
import { computeDiff } from "@/lib/diff";
import type { DiffChange } from "@/types";

interface DiffViewProps {
  originalText: string;
  revisedText: string;
  onAcceptAll: () => void;
  onRejectAll: () => void;
  onAcceptChange: (index: number) => void;
  onRejectChange: (index: number) => void;
}

function groupChanges(changes: DiffChange[]): { original: DiffChange[]; revised: DiffChange[]; changeIndices: number[] }[] {
  const groups: { original: DiffChange[]; revised: DiffChange[]; changeIndices: number[] }[] = [];
  let currentOriginal: DiffChange[] = [];
  let currentRevised: DiffChange[] = [];
  let currentIndices: number[] = [];
  let hasChange = false;

  for (let i = 0; i < changes.length; i++) {
    const change = changes[i];
    if (change.type === "equal") {
      if (hasChange) {
        groups.push({
          original: currentOriginal,
          revised: currentRevised,
          changeIndices: currentIndices,
        });
        currentOriginal = [];
        currentRevised = [];
        currentIndices = [];
        hasChange = false;
      }
      currentOriginal.push(change);
      currentRevised.push(change);
    } else if (change.type === "remove") {
      currentOriginal.push(change);
      currentIndices.push(i);
      hasChange = true;
    } else if (change.type === "add") {
      currentRevised.push(change);
      currentIndices.push(i);
      hasChange = true;
    }
  }

  if (currentOriginal.length > 0 || currentRevised.length > 0) {
    groups.push({
      original: currentOriginal,
      revised: currentRevised,
      changeIndices: currentIndices,
    });
  }

  return groups;
}

export default function DiffView({
  originalText,
  revisedText,
  onAcceptAll,
  onRejectAll,
  onAcceptChange,
  onRejectChange,
}: DiffViewProps) {
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const scrollingRef = useRef(false);

  const changes = useMemo(function computeChanges() {
    return computeDiff(originalText, revisedText);
  }, [originalText, revisedText]);

  const groups = useMemo(function computeGroups() {
    return groupChanges(changes);
  }, [changes]);

  const handleLeftScroll = useCallback(function handleLeftScroll() {
    if (scrollingRef.current) return;
    scrollingRef.current = true;
    if (leftRef.current && rightRef.current) {
      rightRef.current.scrollTop = leftRef.current.scrollTop;
    }
    requestAnimationFrame(function resetFlag() {
      scrollingRef.current = false;
    });
  }, []);

  const handleRightScroll = useCallback(function handleRightScroll() {
    if (scrollingRef.current) return;
    scrollingRef.current = true;
    if (leftRef.current && rightRef.current) {
      leftRef.current.scrollTop = rightRef.current.scrollTop;
    }
    requestAnimationFrame(function resetFlag() {
      scrollingRef.current = false;
    });
  }, []);

  function renderSpan(change: DiffChange) {
    if (change.type === "remove") {
      return (
        <span
          style={{
            backgroundColor: "color-mix(in srgb, var(--color-error) 15%, transparent)",
            textDecoration: "line-through",
            textDecorationColor: "var(--color-error)",
          }}
        >
          {change.value}
        </span>
      );
    }
    if (change.type === "add") {
      return (
        <span
          style={{
            backgroundColor: "color-mix(in srgb, var(--color-success) 15%, transparent)",
          }}
        >
          {change.value}
        </span>
      );
    }
    return <span>{change.value}</span>;
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        fontFamily: "var(--font-inter), system-ui, sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          gap: 8,
          padding: "8px 12px",
          borderBottom: "1px solid var(--color-border)",
          flexShrink: 0,
        }}
      >
        <button
          onClick={onAcceptAll}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            padding: "4px 10px",
            fontSize: 12,
            fontFamily: "var(--font-inter), system-ui, sans-serif",
            border: "1px solid var(--color-success)",
            borderRadius: 5,
            backgroundColor: "transparent",
            color: "var(--color-success)",
            cursor: "pointer",
          }}
        >
          <CheckCheck size={13} />
          Accept All
        </button>
        <button
          onClick={onRejectAll}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            padding: "4px 10px",
            fontSize: 12,
            fontFamily: "var(--font-inter), system-ui, sans-serif",
            border: "1px solid var(--color-error)",
            borderRadius: 5,
            backgroundColor: "transparent",
            color: "var(--color-error)",
            cursor: "pointer",
          }}
        >
          <XCircle size={13} />
          Reject All
        </button>
      </div>

      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        <div
          ref={leftRef}
          onScroll={handleLeftScroll}
          style={{
            flex: 1,
            overflowY: "auto",
            padding: 16,
            borderRight: "1px solid var(--color-border)",
            fontFamily: "var(--font-literata), serif",
            fontSize: 14,
            lineHeight: 1.7,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 1, color: "var(--color-text-muted)", marginBottom: 12, fontFamily: "var(--font-inter), system-ui, sans-serif" }}>
            Original
          </div>
          {groups.map(function renderLeftGroup(group, gi) {
            return (
              <span key={gi}>
                {group.original.map(function renderLeftChange(change, ci) {
                  return <span key={ci}>{renderSpan(change)}</span>;
                })}
              </span>
            );
          })}
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "flex-start",
            padding: "40px 4px 4px",
            gap: 8,
            flexShrink: 0,
          }}
        >
          {groups.map(function renderActions(group, gi) {
            if (group.changeIndices.length === 0) return null;
            return (
              <div key={gi} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <button
                  onClick={function accept() {
                    for (const idx of group.changeIndices) {
                      onAcceptChange(idx);
                    }
                  }}
                  title="Accept"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 22,
                    height: 22,
                    padding: 0,
                    background: "none",
                    border: "1px solid var(--color-success)",
                    borderRadius: 4,
                    color: "var(--color-success)",
                    cursor: "pointer",
                  }}
                >
                  <Check size={12} />
                </button>
                <button
                  onClick={function reject() {
                    for (const idx of group.changeIndices) {
                      onRejectChange(idx);
                    }
                  }}
                  title="Reject"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 22,
                    height: 22,
                    padding: 0,
                    background: "none",
                    border: "1px solid var(--color-error)",
                    borderRadius: 4,
                    color: "var(--color-error)",
                    cursor: "pointer",
                  }}
                >
                  <X size={12} />
                </button>
              </div>
            );
          })}
        </div>

        <div
          ref={rightRef}
          onScroll={handleRightScroll}
          style={{
            flex: 1,
            overflowY: "auto",
            padding: 16,
            fontFamily: "var(--font-literata), serif",
            fontSize: 14,
            lineHeight: 1.7,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 1, color: "var(--color-text-muted)", marginBottom: 12, fontFamily: "var(--font-inter), system-ui, sans-serif" }}>
            Revised
          </div>
          {groups.map(function renderRightGroup(group, gi) {
            return (
              <span key={gi}>
                {group.revised.map(function renderRightChange(change, ci) {
                  return <span key={ci}>{renderSpan(change)}</span>;
                })}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
