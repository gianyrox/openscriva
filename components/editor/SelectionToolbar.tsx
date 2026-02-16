"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Editor, Range, Node, Text } from "slate";
import { ReactEditor } from "slate-react";
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
import { useAppStore } from "@/store";
import { estimateTokens, formatTokenCount } from "@/lib/tokens";

interface SelectionToolbarProps {
  editor: any;
  onClose: () => void;
  onAddNote?: (quote: string) => void;
  onSuggestion?: (data: {
    anchor: { path: number[]; offset: number };
    focus: { path: number[]; offset: number };
    original: string;
    suggested: string;
  }) => void;
}

function getSelectedText(editor: any): string {
  if (!editor.selection || Range.isCollapsed(editor.selection)) return "";
  try {
    return Editor.string(editor, editor.selection);
  } catch {
    return "";
  }
}

function isMarkActive(editor: any, mark: string): boolean {
  try {
    var marks = Editor.marks(editor);
    return !!(marks as any)?.[mark];
  } catch {
    return false;
  }
}

function toggleMark(editor: any, mark: string) {
  try {
    var marks = Editor.marks(editor);
    if ((marks as any)?.[mark]) {
      Editor.removeMark(editor, mark);
    } else {
      Editor.addMark(editor, mark, true);
    }
  } catch {}
}

export default function SelectionToolbar({
  editor,
  onClose,
  onAddNote,
  onSuggestion,
}: SelectionToolbarProps) {
  var [instruction, setInstruction] = useState("");
  var [loading, setLoading] = useState(false);
  var [linkMode, setLinkMode] = useState(false);
  var [linkUrl, setLinkUrl] = useState("");
  var [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  var toolbarRef = useRef<HTMLDivElement>(null);
  var inputRef = useRef<HTMLInputElement>(null);
  var linkInputRef = useRef<HTMLInputElement>(null);
  var savedSelection = useRef<Range | null>(null);

  var preferences = useAppStore(function selectPrefs(s) {
    return s.preferences;
  });

  useEffect(function captureAndPosition() {
    if (editor.selection && !Range.isCollapsed(editor.selection)) {
      savedSelection.current = { ...editor.selection };
      try {
        var domRange = ReactEditor.toDOMRange(editor, editor.selection);
        var rect = domRange.getBoundingClientRect();
        setPosition({
          top: rect.top - 8,
          left: rect.left,
        });
      } catch {}
    }
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
    var text = getSelectedText(editor);
    if (!text.trim()) return;
    var sel = savedSelection.current;
    if (!sel) return;
    setLoading(true);

    try {
      var res = await fetch("/api/ai/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: text,
          instruction: customInstruction,
          mode: "inline",
          model: preferences.defaultModel,
        }),
      });

      if (!res.ok) throw new Error("API error: " + res.status);

      var data = await res.json();
      if (data.result && onSuggestion) {
        onSuggestion({
          anchor: sel.anchor,
          focus: sel.focus,
          original: text,
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
    if (!linkUrl.trim() || !savedSelection.current) return;
    try {
      var { Transforms } = require("slate");
      Transforms.select(editor, savedSelection.current);
      Transforms.wrapNodes(
        editor,
        { type: "a", url: linkUrl.trim(), children: [] } as any,
        { split: true }
      );
    } catch {}
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

  var selectedText = getSelectedText(editor);
  var tokenEstimate = "~" + formatTokenCount(estimateTokens(selectedText)) + "t";

  if (!position) return null;

  return (
    <div
      ref={toolbarRef}
      onMouseDown={function preventFocusSteal(e) {
        e.preventDefault();
      }}
      style={{
        position: "fixed",
        top: position.top,
        left: position.left,
        transform: "translateY(-100%)",
        zIndex: 50,
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
          function clickBold() { toggleMark(editor, "bold"); },
          isMarkActive(editor, "bold"),
          "Bold",
        )}
        {formatBtn(
          <Italic size={14} />,
          function clickItalic() { toggleMark(editor, "italic"); },
          isMarkActive(editor, "italic"),
          "Italic",
        )}
        {formatBtn(
          <Strikethrough size={14} />,
          function clickStrike() { toggleMark(editor, "strikethrough"); },
          isMarkActive(editor, "strikethrough"),
          "Strikethrough",
        )}

        {separator()}

        {formatBtn(
          <Heading1 size={14} />,
          function clickH1() {
            var { Transforms } = require("slate");
            Transforms.setNodes(editor, { type: "h1" } as any);
          },
          false,
          "Heading 1",
        )}
        {formatBtn(
          <Heading2 size={14} />,
          function clickH2() {
            var { Transforms } = require("slate");
            Transforms.setNodes(editor, { type: "h2" } as any);
          },
          false,
          "Heading 2",
        )}
        {formatBtn(
          <Heading3 size={14} />,
          function clickH3() {
            var { Transforms } = require("slate");
            Transforms.setNodes(editor, { type: "h3" } as any);
          },
          false,
          "Heading 3",
        )}

        {separator()}

        {formatBtn(
          <Highlighter size={14} />,
          function clickHighlight() { toggleMark(editor, "highlight"); },
          isMarkActive(editor, "highlight"),
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
            false,
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
