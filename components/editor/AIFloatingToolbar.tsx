"use client";

import { useState, useRef, useEffect } from "react";
import { Sparkles } from "lucide-react";
import { useAppStore } from "@/store";

interface AIFloatingToolbarProps {
  selectedText: string;
  position: { top: number; left: number };
  onResult: (oldText: string, newText: string) => void;
  onClose: () => void;
}

const QUICK_ACTIONS = [
  { label: "Polish", mode: "cleanup" as const, instruction: "" },
  { label: "Simplify", mode: "inline" as const, instruction: "Simplify this text. Make it clearer and more concise." },
  { label: "Expand", mode: "inline" as const, instruction: "Expand this text with more detail and description while maintaining the same style." },
];

export default function AIFloatingToolbar({
  selectedText,
  position,
  onResult,
  onClose,
}: AIFloatingToolbarProps) {
  const [instruction, setInstruction] = useState("");
  const [loading, setLoading] = useState(false);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const preferences = useAppStore(function selectPrefs(s) {
    return s.preferences;
  });

  useEffect(function handleEscape() {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return function cleanup() {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  async function handleEdit(mode: "inline" | "cleanup", customInstruction: string) {
    if (!preferences.keysStored) return;
    setLoading(true);

    try {
      const res = await fetch("/api/ai/edit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: selectedText,
          instruction: customInstruction,
          mode,
          model: preferences.defaultModel,
        }),
      });

      if (!res.ok) throw new Error("API error: " + res.status);

      const data = await res.json();
      if (data.result) {
        onResult(selectedText, data.result);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!instruction.trim()) return;
    handleEdit("inline", instruction.trim());
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }

  return (
    <div
      ref={toolbarRef}
      onMouseDown={function preventFocusSteal(e) {
        var target = e.target as HTMLElement;
        if (target.tagName !== "INPUT" && target.tagName !== "TEXTAREA") {
          e.preventDefault();
        }
      }}
      style={{
        position: "absolute",
        top: position.top - 12,
        left: position.left,
        transform: "translateY(-100%)",
        backgroundColor: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderRadius: 10,
        boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
        padding: "8px 12px",
        display: "flex",
        flexDirection: "column",
        gap: 6,
        fontFamily: "var(--font-inter), system-ui, sans-serif",
        zIndex: 50,
        animation: "aiToolbarIn 200ms ease-out",
        minWidth: 280,
      }}
    >
      <style>{`
        @keyframes aiToolbarIn {
          from { opacity: 0; transform: translateY(-100%) translateY(4px) scale(0.98); }
          to { opacity: 1; transform: translateY(-100%) scale(1); }
        }
      `}</style>

      <form
        onSubmit={handleSubmit}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <input
          ref={inputRef}
          type="text"
          value={instruction}
          onChange={function handleChange(e) {
            setInstruction(e.target.value);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Make this more concise..."
          disabled={loading}
          style={{
            flex: 1,
            padding: "6px 8px",
            fontSize: 12,
            fontFamily: "inherit",
            backgroundColor: "var(--color-bg)",
            color: "var(--color-text)",
            border: "1px solid var(--color-border)",
            borderRadius: 6,
            outline: "none",
          }}
        />
        <button
          type="submit"
          disabled={!instruction.trim() || loading}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 28,
            height: 28,
            borderRadius: 6,
            border: "none",
            backgroundColor: instruction.trim() && !loading
              ? "var(--color-accent)"
              : "var(--color-surface-hover)",
            color: instruction.trim() && !loading ? "#fff" : "var(--color-text-muted)",
            cursor: instruction.trim() && !loading ? "pointer" : "default",
            flexShrink: 0,
          }}
        >
          <Sparkles size={14} />
        </button>
      </form>

      <div style={{ display: "flex", gap: 4 }}>
        {QUICK_ACTIONS.map(function renderAction(action) {
          return (
            <button
              key={action.label}
              onClick={function handleClick() {
                handleEdit(action.mode, action.instruction);
              }}
              disabled={loading}
              style={{
                padding: "4px 10px",
                fontSize: 11,
                fontFamily: "inherit",
                border: "1px solid var(--color-border)",
                borderRadius: 5,
                backgroundColor: "transparent",
                color: loading ? "var(--color-text-muted)" : "var(--color-text)",
                cursor: loading ? "default" : "pointer",
                transition: "background-color 100ms",
              }}
            >
              {action.label}
            </button>
          );
        })}
      </div>

      {loading && (
        <div
          style={{
            fontSize: 11,
            color: "var(--color-text-muted)",
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "2px 0",
          }}
        >
          <span
            style={{
              width: 12,
              height: 12,
              border: "2px solid var(--color-border)",
              borderTopColor: "var(--color-accent)",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
            }}
          />
          Editing...
        </div>
      )}
    </div>
  );
}
