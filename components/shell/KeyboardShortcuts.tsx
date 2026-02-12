"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

interface KeyboardShortcutsProps {
  open: boolean;
  onClose: () => void;
}

interface ShortcutEntry {
  keys: string[];
  label: string;
}

interface ShortcutCategory {
  title: string;
  shortcuts: ShortcutEntry[];
}

const CATEGORIES: ShortcutCategory[] = [
  {
    title: "Editor",
    shortcuts: [
      { keys: ["⌘", "B"], label: "Bold" },
      { keys: ["⌘", "I"], label: "Italic" },
      { keys: ["⌘", "/"], label: "Toggle markdown" },
      { keys: ["⌘", "S"], label: "Save" },
    ],
  },
  {
    title: "Navigation",
    shortcuts: [
      { keys: ["⌘", "B"], label: "Toggle sidebar" },
      { keys: ["⌘", "J"], label: "Toggle right panel" },
      { keys: ["⌘", "⇧", "R"], label: "Reader preview" },
    ],
  },
  {
    title: "AI",
    shortcuts: [
      { keys: ["⌘", "⇧", "K"], label: "Polish selection" },
      { keys: ["⌘", "⇧", "↵"], label: "Continue writing" },
    ],
  },
  {
    title: "General",
    shortcuts: [
      { keys: ["F11"], label: "Focus mode" },
      { keys: ["⌘", "\\"], label: "Split view" },
      { keys: ["?"], label: "Keyboard shortcuts" },
      { keys: ["Esc"], label: "Close dialog" },
    ],
  },
];

function Kbd({ children }: { children: string }) {
  return (
    <kbd
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minWidth: 24,
        height: 24,
        padding: "0 6px",
        fontFamily: "var(--font-inter), system-ui, sans-serif",
        fontSize: 11,
        fontWeight: 500,
        color: "var(--color-text)",
        backgroundColor: "var(--color-surface-hover)",
        border: "1px solid var(--color-border)",
        borderRadius: 5,
        lineHeight: 1,
      }}
    >
      {children}
    </kbd>
  );
}

export default function KeyboardShortcuts({ open, onClose }: KeyboardShortcutsProps) {
  useEffect(function handleEscape() {
    if (!open) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return function cleanup() {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(0, 0, 0, 0.4)",
        animation: "scriva-fade-in 150ms ease-out",
      }}
      onClick={function handleBackdropClick(e) {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        style={{
          width: 520,
          maxHeight: "80vh",
          overflow: "auto",
          backgroundColor: "var(--color-surface)",
          borderRadius: 12,
          border: "1px solid var(--color-border)",
          boxShadow: "0 24px 48px rgba(0, 0, 0, 0.2)",
          fontFamily: "var(--font-inter), system-ui, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 20px 12px",
            borderBottom: "1px solid var(--color-border)",
          }}
        >
          <h2
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: "var(--color-text)",
              margin: 0,
            }}
          >
            Keyboard Shortcuts
          </h2>
          <button
            onClick={onClose}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 28,
              height: 28,
              border: "none",
              background: "none",
              color: "var(--color-text-muted)",
              cursor: "pointer",
              borderRadius: 6,
            }}
          >
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: "12px 20px 20px" }}>
          {CATEGORIES.map(function renderCategory(category) {
            return (
              <div key={category.title} style={{ marginBottom: 20 }}>
                <h3
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    color: "var(--color-text-muted)",
                    margin: "0 0 8px",
                  }}
                >
                  {category.title}
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {category.shortcuts.map(function renderShortcut(shortcut) {
                    return (
                      <div
                        key={shortcut.label}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "6px 8px",
                          borderRadius: 6,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 13,
                            color: "var(--color-text)",
                          }}
                        >
                          {shortcut.label}
                        </span>
                        <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                          {shortcut.keys.map(function renderKey(key, i) {
                            return <Kbd key={i}>{key}</Kbd>;
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
