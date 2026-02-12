"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { X } from "lucide-react";
import DiffView from "./DiffView";
import FileViewer from "@/components/shared/FileViewer";

type SplitMode = "write-reference" | "diff" | "compare";

interface SplitViewProps {
  mode: SplitMode;
  leftContent: {
    label: string;
    content: string;
    filename?: string;
  };
  rightContent: {
    label: string;
    content: string;
    filename?: string;
  };
  onClose: () => void;
  onAcceptAll?: () => void;
  onRejectAll?: () => void;
  onAcceptChange?: (index: number) => void;
  onRejectChange?: (index: number) => void;
}

function modeLabel(mode: SplitMode): string {
  if (mode === "write-reference") return "Write + Reference";
  if (mode === "diff") return "Diff View";
  return "Compare";
}

export default function SplitView({
  mode,
  leftContent,
  rightContent,
  onClose,
  onAcceptAll,
  onRejectAll,
  onAcceptChange,
  onRejectChange,
}: SplitViewProps) {
  const [splitRatio, setSplitRatio] = useState(0.5);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const handleMouseDown = useCallback(function handleMouseDown(e: React.MouseEvent) {
    e.preventDefault();
    dragging.current = true;
  }, []);

  useEffect(function setupDragListeners() {
    function handleMouseMove(e: MouseEvent) {
      if (!dragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const ratio = Math.max(300 / rect.width, Math.min(1 - 300 / rect.width, x / rect.width));
      setSplitRatio(ratio);
    }

    function handleMouseUp() {
      dragging.current = false;
    }

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return function cleanup() {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  if (mode === "diff" && onAcceptAll && onRejectAll && onAcceptChange && onRejectChange) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
          animation: "scriva-fade-in 200ms ease-out",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "6px 12px",
            borderBottom: "1px solid var(--color-border)",
            backgroundColor: "var(--color-surface)",
            flexShrink: 0,
          }}
        >
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: "var(--color-text-muted)",
              fontFamily: "var(--font-inter), system-ui, sans-serif",
            }}
          >
            {modeLabel(mode)}
          </span>
          <button
            onClick={onClose}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 24,
              height: 24,
              border: "none",
              background: "none",
              color: "var(--color-text-muted)",
              cursor: "pointer",
              borderRadius: 4,
            }}
          >
            <X size={14} />
          </button>
        </div>
        <div style={{ flex: 1, minHeight: 0 }}>
          <DiffView
            originalText={leftContent.content}
            revisedText={rightContent.content}
            onAcceptAll={onAcceptAll}
            onRejectAll={onRejectAll}
            onAcceptChange={onAcceptChange}
            onRejectChange={onRejectChange}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        animation: "scriva-fade-in 200ms ease-out",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "6px 12px",
          borderBottom: "1px solid var(--color-border)",
          backgroundColor: "var(--color-surface)",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            fontSize: 11,
            fontFamily: "var(--font-inter), system-ui, sans-serif",
            color: "var(--color-text-muted)",
          }}
        >
          <span
            style={{
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            {modeLabel(mode)}
          </span>
          <span>{leftContent.label}</span>
          <span style={{ opacity: 0.4 }}>|</span>
          <span>{rightContent.label}</span>
        </div>
        <button
          onClick={onClose}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 24,
            height: 24,
            border: "none",
            background: "none",
            color: "var(--color-text-muted)",
            cursor: "pointer",
            borderRadius: 4,
          }}
        >
          <X size={14} />
        </button>
      </div>

      <div
        ref={containerRef}
        style={{
          flex: 1,
          display: "flex",
          minHeight: 0,
          position: "relative",
        }}
      >
        <div
          style={{
            width: `${splitRatio * 100}%`,
            minWidth: 300,
            overflow: "auto",
            borderRight: "none",
          }}
        >
          {mode === "write-reference" ? (
            <div
              style={{
                padding: 24,
                fontFamily: "var(--font-literata), serif",
                fontSize: 15,
                lineHeight: 1.8,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                color: "var(--color-text)",
              }}
            >
              {leftContent.content}
            </div>
          ) : (
            <div
              style={{
                padding: 16,
                fontFamily: "var(--font-literata), serif",
                fontSize: 14,
                lineHeight: 1.7,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                color: "var(--color-text)",
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  textTransform: "uppercase",
                  letterSpacing: 1,
                  color: "var(--color-text-muted)",
                  marginBottom: 12,
                  fontFamily: "var(--font-inter), system-ui, sans-serif",
                }}
              >
                {leftContent.label}
              </div>
              {leftContent.content}
            </div>
          )}
        </div>

        <div
          onMouseDown={handleMouseDown}
          style={{
            width: 6,
            cursor: "col-resize",
            backgroundColor: "var(--color-border)",
            flexShrink: 0,
            position: "relative",
            transition: "background-color 150ms ease",
          }}
          onMouseEnter={function onEnter(e) {
            e.currentTarget.style.backgroundColor = "var(--color-accent)";
          }}
          onMouseLeave={function onLeave(e) {
            if (!dragging.current) {
              e.currentTarget.style.backgroundColor = "var(--color-border)";
            }
          }}
        />

        <div
          style={{
            flex: 1,
            minWidth: 300,
            overflow: "auto",
          }}
        >
          {mode === "write-reference" ? (
            <FileViewer
              filename={rightContent.filename || rightContent.label}
              content={rightContent.content}
              onClose={onClose}
            />
          ) : (
            <div
              style={{
                padding: 16,
                fontFamily: "var(--font-literata), serif",
                fontSize: 14,
                lineHeight: 1.7,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                color: "var(--color-text)",
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  textTransform: "uppercase",
                  letterSpacing: 1,
                  color: "var(--color-text-muted)",
                  marginBottom: 12,
                  fontFamily: "var(--font-inter), system-ui, sans-serif",
                }}
              >
                {rightContent.label}
              </div>
              {rightContent.content}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
