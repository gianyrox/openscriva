"use client";

import { useEffect, useCallback, useState } from "react";
import { Minimize2 } from "lucide-react";
import { useAppStore } from "@/store";

interface FocusModeProps {
  children: React.ReactNode;
}

export default function FocusMode({ children }: FocusModeProps) {
  const isFocusMode = useAppStore(function selectFocus(s) {
    return s.editor.isFocusMode;
  });
  const wordCount = useAppStore(function selectWordCount(s) {
    return s.editor.wordCount;
  });
  const toggleFocusMode = useAppStore(function selectToggle(s) {
    return s.toggleFocusMode;
  });

  const [showHint, setShowHint] = useState(false);
  const [hintOpacity, setHintOpacity] = useState(0);
  const [exitHovered, setExitHovered] = useState(false);

  const handleKeyDown = useCallback(
    function handleEscapeOrF11(e: KeyboardEvent) {
      if (e.key === "Escape" || e.key === "F11") {
        e.preventDefault();
        toggleFocusMode();
      }
    },
    [toggleFocusMode],
  );

  useEffect(function registerFocusKeys() {
    if (!isFocusMode) return;
    window.addEventListener("keydown", handleKeyDown);
    return function cleanup() {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isFocusMode, handleKeyDown]);

  useEffect(function showEscapeHint() {
    if (!isFocusMode) {
      setShowHint(false);
      setHintOpacity(0);
      return;
    }

    setShowHint(true);
    const fadeInTimer = setTimeout(function fadeIn() {
      setHintOpacity(1);
    }, 50);

    const fadeOutTimer = setTimeout(function fadeOut() {
      setHintOpacity(0);
    }, 2500);

    const hideTimer = setTimeout(function hide() {
      setShowHint(false);
    }, 3000);

    return function cleanup() {
      clearTimeout(fadeInTimer);
      clearTimeout(fadeOutTimer);
      clearTimeout(hideTimer);
    };
  }, [isFocusMode]);

  if (!isFocusMode) {
    return null;
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        backgroundColor: "var(--color-bg)",
        display: "flex",
        flexDirection: "column",
        overflow: "auto",
      }}
    >
      <div style={{ flex: 1, overflowY: "auto" }}>{children}</div>

      <div
        style={{
          position: "fixed",
          bottom: 16,
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          alignItems: "center",
          gap: 12,
          fontFamily: "var(--font-inter), system-ui, sans-serif",
          fontSize: 12,
          color: "var(--color-text-muted)",
          userSelect: "none",
          pointerEvents: "none",
        }}
      >
        <span>{wordCount.toLocaleString()} {wordCount === 1 ? "word" : "words"}</span>
        {showHint && (
          <span
            style={{
              opacity: hintOpacity,
              transition: "opacity 500ms ease",
              fontSize: 11,
              color: "var(--color-text-muted)",
            }}
          >
            Press Escape to exit
          </span>
        )}
      </div>

      <button
        onClick={function onExitFocus() {
          toggleFocusMode();
        }}
        onMouseEnter={function onEnter() {
          setExitHovered(true);
        }}
        onMouseLeave={function onLeave() {
          setExitHovered(false);
        }}
        style={{
          position: "fixed",
          bottom: 16,
          right: 20,
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontFamily: "var(--font-inter), system-ui, sans-serif",
          fontSize: 12,
          color: "var(--color-text-muted)",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          padding: "6px 10px",
          borderRadius: 6,
          opacity: exitHovered ? 0.8 : 0.3,
          transition: "opacity 200ms ease",
          userSelect: "none",
        }}
      >
        Exit Focus
        <Minimize2 size={14} strokeWidth={1.5} />
      </button>
    </div>
  );
}
