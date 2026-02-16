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
  X,
} from "lucide-react";
import type { Editor } from "@tiptap/react";
import { useAppStore } from "@/store";
import { estimateTokens, formatTokenCount } from "@/lib/tokens";

interface SelectionToolbarProps {
  editor: Editor;
  onClose: () => void;
  onAddNote?: (quote: string) => void;
}

export default function SelectionToolbar({
  editor,
  onClose,
  onAddNote,
}: SelectionToolbarProps) {
  const [instruction, setInstruction] = useState("");
  const [loading, setLoading] = useState(false);
  const [linkMode, setLinkMode] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const selectionRef = useRef({ from: 0, to: 0, text: "" });
  const toolbarRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const linkInputRef = useRef<HTMLInputElement>(null);
  const preferences = useAppStore(function selectPrefs(s) {
    return s.preferences;
  });

  useEffect(function captureSelection() {
    var { from, to } = editor.state.selection;
    var text = from !== to ? editor.state.doc.textBetween(from, to, " ") : "";
    selectionRef.current = { from, to, text };
    if (from !== to) {
      editor.commands.lockSelection({ from, to });
    }
    return function cleanup() {
      editor.commands.unlockSelection();
    };
  }, [editor]);

  useEffect(function handleKeys() {
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

  async function handleEdit(customInstruction: string) {
    if (!preferences.keysStored) return;
    var sel = selectionRef.current;
    if (!sel.text.trim()) return;
    setLoading(true);

    try {
      var res = await fetch("/api/ai/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: sel.text,
          instruction: customInstruction,
          mode: "inline",
          model: preferences.defaultModel,
        }),
      });

      if (!res.ok) throw new Error("API error: " + res.status);

      var data = await res.json();
      if (data.result) {
        editor.commands.setSuggestion({
          from: sel.from,
          to: sel.to,
          original: sel.text,
          suggested: data.result,
        });
        onClose();
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!instruction.trim()) return;
    handleEdit(instruction.trim());
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    e.stopPropagation();
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }

  function handleLinkSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!linkUrl.trim()) return;
    var { from, to } = selectionRef.current;
    editor.chain().focus().setTextSelection({ from, to }).setLink({ href: linkUrl.trim() }).run();
    setLinkMode(false);
    setLinkUrl("");
  }

  function handleLinkKeyDown(e: React.KeyboardEvent) {
    e.stopPropagation();
    if (e.key === "Enter") {
      e.preventDefault();
      handleLinkSubmit(e);
    }
  }

  function restoreSelectionAndRun(action: () => void) {
    return function run() {
      var { from, to } = selectionRef.current;
      editor.chain().focus().setTextSelection({ from, to }).run();
      action();
    };
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
        onClick={restoreSelectionAndRun(action)}
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

  var tokenEstimate = "~" + formatTokenCount(estimateTokens(selectionRef.current.text)) + "t";

  return (
    <div
      ref={toolbarRef}
      onMouseDown={function preventFocusSteal(e) {
        e.preventDefault();
      }}
      style={{
        backgroundColor: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderRadius: 10,
        boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
        fontFamily: "var(--font-inter), system-ui, sans-serif",
        minWidth: 340,
      }}
    >
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
          function toggleBold() { editor.chain().toggleBold().run(); },
          editor.isActive("bold"),
          "Bold",
        )}
        {formatBtn(
          <Italic size={14} />,
          function toggleItalic() { editor.chain().toggleItalic().run(); },
          editor.isActive("italic"),
          "Italic",
        )}
        {formatBtn(
          <Strikethrough size={14} />,
          function toggleStrike() { editor.chain().toggleStrike().run(); },
          editor.isActive("strike"),
          "Strikethrough",
        )}

        {separator()}

        {formatBtn(
          <Heading1 size={14} />,
          function toggleH1() { editor.chain().toggleHeading({ level: 1 }).run(); },
          editor.isActive("heading", { level: 1 }),
          "Heading 1",
        )}
        {formatBtn(
          <Heading2 size={14} />,
          function toggleH2() { editor.chain().toggleHeading({ level: 2 }).run(); },
          editor.isActive("heading", { level: 2 }),
          "Heading 2",
        )}
        {formatBtn(
          <Heading3 size={14} />,
          function toggleH3() { editor.chain().toggleHeading({ level: 3 }).run(); },
          editor.isActive("heading", { level: 3 }),
          "Heading 3",
        )}

        {separator()}

        {formatBtn(
          <Highlighter size={14} />,
          function toggleHighlight() { editor.chain().toggleHighlight({ color: "#fef08a" }).run(); },
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
              onClick={function focusLink() {
                linkInputRef.current?.focus();
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
              onAddNote(selectionRef.current.text);
            }
          },
          false,
          "Add Note",
        )}

        <div style={{ flex: 1 }} />

        <span
          style={{
            fontSize: 10,
            color: "var(--color-text-muted)",
            marginRight: 4,
          }}
        >
          {tokenEstimate}
        </span>

        <button
          title="Close"
          onClick={onClose}
          onMouseDown={function preventBlur(e) {
            e.preventDefault();
          }}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 24,
            height: 24,
            borderRadius: 4,
            border: "none",
            backgroundColor: "transparent",
            color: "var(--color-text-muted)",
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          <X size={14} />
        </button>
      </div>

      <div style={{ height: 1, backgroundColor: "var(--color-border)" }} />

      <div style={{ padding: "8px 10px" }}>
        <form
          onSubmit={handleSubmit}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <Sparkles size={14} style={{ color: "var(--color-text-muted)", flexShrink: 0 }} />
          <input
            ref={inputRef}
            type="text"
            value={instruction}
            onChange={function handleChange(e) {
              setInstruction(e.target.value);
            }}
            onClick={function focusInput() {
              inputRef.current?.focus();
            }}
            onKeyDown={handleKeyDown}
            placeholder={loading ? "Editing..." : "Edit instruction..."}
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
          {loading && (
            <span
              style={{
                width: 14,
                height: 14,
                border: "2px solid var(--color-border)",
                borderTopColor: "var(--color-accent)",
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
                flexShrink: 0,
              }}
            />
          )}
        </form>
      </div>
    </div>
  );
}
