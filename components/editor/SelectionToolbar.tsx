"use client";

import { useState, useRef, useEffect } from "react";
import {
  Bold,
  Italic,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  Highlighter,
  Link,
  Sparkles,
  StickyNote,
} from "lucide-react";
import type { Editor } from "@tiptap/react";
import { useAppStore } from "@/store";
import { estimateTokens, formatTokenCount } from "@/lib/tokens";

interface SelectionToolbarProps {
  editor: Editor;
  selectedText: string;
  position: { top: number; left: number };
  onAIResult: (oldText: string, newText: string) => void;
  onClose: () => void;
  onAddNote?: (quote: string) => void;
}

const QUICK_ACTIONS = [
  { label: "Polish", mode: "cleanup" as const, instruction: "" },
  { label: "Simplify", mode: "inline" as const, instruction: "Simplify this text. Make it clearer and more concise." },
  { label: "Expand", mode: "inline" as const, instruction: "Expand this text with more detail and description while maintaining the same style." },
];

export default function SelectionToolbar({
  editor,
  selectedText,
  position,
  onAIResult,
  onClose,
  onAddNote,
}: SelectionToolbarProps) {
  const [instruction, setInstruction] = useState("");
  const [loading, setLoading] = useState(false);
  const [linkMode, setLinkMode] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const toolbarRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const linkInputRef = useRef<HTMLInputElement>(null);
  const preferences = useAppStore(function selectPrefs(s) {
    return s.preferences;
  });

  useEffect(function handleEscape() {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (linkMode) {
          setLinkMode(false);
          setLinkUrl("");
        } else {
          onClose();
        }
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return function cleanup() {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose, linkMode]);

  useEffect(function focusLinkInput() {
    if (linkMode && linkInputRef.current) {
      linkInputRef.current.focus();
    }
  }, [linkMode]);

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
        onAIResult(selectedText, data.result);
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

  function handleLinkSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!linkUrl.trim()) return;
    editor.chain().focus().setLink({ href: linkUrl.trim() }).run();
    setLinkMode(false);
    setLinkUrl("");
  }

  function handleLinkKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleLinkSubmit(e);
    }
  }

  function formatBtn(
    icon: React.ReactNode,
    action: () => void,
    active: boolean,
    title: string,
  ) {
    return (
      <button
        key={title}
        title={title}
        onMouseDown={function preventBlur(e) {
          e.preventDefault();
        }}
        onClick={action}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 28,
          height: 28,
          borderRadius: 4,
          border: "none",
          backgroundColor: active ? "var(--color-accent)" : "transparent",
          color: active ? "#fff" : "var(--color-text)",
          cursor: "pointer",
          flexShrink: 0,
          transition: "background-color 100ms",
        }}
      >
        {icon}
      </button>
    );
  }

  function separator() {
    return (
      <div
        style={{
          width: 1,
          height: 18,
          backgroundColor: "var(--color-border)",
          margin: "0 4px",
          flexShrink: 0,
        }}
      />
    );
  }

  const tokenEstimate = `~${formatTokenCount(estimateTokens(selectedText))}t`;

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
        top: position.top - 52,
        left: position.left,
        transform: "translateY(-100%)",
        backgroundColor: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderRadius: 10,
        boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
        padding: 0,
        display: "flex",
        flexDirection: "column",
        fontFamily: "var(--font-inter), system-ui, sans-serif",
        zIndex: 50,
        animation: "selToolbarIn 200ms ease-out",
        minWidth: 320,
      }}
    >
      <style>{`
        @keyframes selToolbarIn {
          from { opacity: 0; transform: translateY(-100%) translateY(4px) scale(0.98); }
          to { opacity: 1; transform: translateY(-100%) scale(1); }
        }
      `}</style>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 2,
          padding: "6px 8px",
        }}
      >
        {formatBtn(
          <Bold size={14} />,
          function toggleBold() { editor.chain().focus().toggleBold().run(); },
          editor.isActive("bold"),
          "Bold",
        )}
        {formatBtn(
          <Italic size={14} />,
          function toggleItalic() { editor.chain().focus().toggleItalic().run(); },
          editor.isActive("italic"),
          "Italic",
        )}
        {formatBtn(
          <Strikethrough size={14} />,
          function toggleStrike() { editor.chain().focus().toggleStrike().run(); },
          editor.isActive("strike"),
          "Strikethrough",
        )}

        {separator()}

        {formatBtn(
          <Heading1 size={14} />,
          function toggleH1() { editor.chain().focus().toggleHeading({ level: 1 }).run(); },
          editor.isActive("heading", { level: 1 }),
          "Heading 1",
        )}
        {formatBtn(
          <Heading2 size={14} />,
          function toggleH2() { editor.chain().focus().toggleHeading({ level: 2 }).run(); },
          editor.isActive("heading", { level: 2 }),
          "Heading 2",
        )}
        {formatBtn(
          <Heading3 size={14} />,
          function toggleH3() { editor.chain().focus().toggleHeading({ level: 3 }).run(); },
          editor.isActive("heading", { level: 3 }),
          "Heading 3",
        )}

        {separator()}

        {formatBtn(
          <Highlighter size={14} />,
          function toggleHighlight() { editor.chain().focus().toggleHighlight({ color: "#fef08a" }).run(); },
          editor.isActive("highlight"),
          "Highlight",
        )}
        {linkMode ? (
          <form
            onSubmit={handleLinkSubmit}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              marginLeft: 2,
            }}
          >
            <input
              ref={linkInputRef}
              type="text"
              value={linkUrl}
              onChange={function handleLinkChange(e) {
                setLinkUrl(e.target.value);
              }}
              onKeyDown={handleLinkKeyDown}
              placeholder="https://..."
              style={{
                width: 120,
                padding: "3px 6px",
                fontSize: 11,
                fontFamily: "inherit",
                backgroundColor: "var(--color-bg)",
                color: "var(--color-text)",
                border: "1px solid var(--color-border)",
                borderRadius: 4,
                outline: "none",
              }}
            />
          </form>
        ) : (
          formatBtn(
            <Link size={14} />,
            function openLink() { setLinkMode(true); },
            editor.isActive("link"),
            "Link",
          )
        )}
        {separator()}
        {formatBtn(
          <StickyNote size={14} />,
          function addNote() {
            if (onAddNote) {
              onAddNote(selectedText);
            }
          },
          false,
          "Add Note",
        )}
      </div>

      <div
        style={{
          height: 1,
          backgroundColor: "var(--color-border)",
        }}
      />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 6,
          padding: "8px 10px",
        }}
      >
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
          <span
            style={{
              marginLeft: "auto",
              fontSize: 10,
              color: "var(--color-text-muted)",
              alignSelf: "center",
            }}
          >
            {tokenEstimate}
          </span>
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
    </div>
  );
}
