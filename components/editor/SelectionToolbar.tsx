"use client";

import { useState, useRef, useEffect } from "react";
import { Editor, Range, Transforms, Text } from "slate";
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
  SendHorizontal,
  Check,
} from "lucide-react";
import { useAppStore } from "@/store";
import { estimateTokens, formatTokenCount } from "@/lib/tokens";
import type { SuggestionData } from "./extensions/inlineSuggestion";

interface SelectionToolbarProps {
  editor: any;
  scrollContainer: HTMLDivElement | null;
  onClose: () => void;
  onAddNote?: (quote: string) => void;
  onSuggestion?: (data: SuggestionData) => void;
  suggestion?: SuggestionData | null;
  onAcceptSuggestion?: () => void;
  onRejectSuggestion?: () => void;
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
  scrollContainer,
  onClose,
  onAddNote,
  onSuggestion,
  suggestion,
  onAcceptSuggestion,
  onRejectSuggestion,
}: SelectionToolbarProps) {
  var [instruction, setInstruction] = useState("");
  var [loading, setLoading] = useState(false);
  var [linkMode, setLinkMode] = useState(false);
  var [linkUrl, setLinkUrl] = useState("");
  var [topOffset, setTopOffset] = useState<number | null>(null);
  var [highlightRects, setHighlightRects] = useState<{ top: number; left: number; width: number; height: number }[]>([]);
  var [, forceRender] = useState(0);
  var toolbarRef = useRef<HTMLDivElement>(null);
  var inputRef = useRef<HTMLInputElement>(null);
  var linkInputRef = useRef<HTMLInputElement>(null);
  var savedSelection = useRef<Range | null>(null);
  var savedText = useRef<string>("");
  var expandedRange = useRef<Range | null>(null);
  var expandedText = useRef<string>("");

  var preferences = useAppStore(function selectPrefs(s) {
    return s.preferences;
  });

  useEffect(function calculatePosition() {
    if (!scrollContainer) return;

    if (suggestion) return;

    if (editor.selection && !Range.isCollapsed(editor.selection)) {
      savedSelection.current = { ...editor.selection };
      try {
        savedText.current = Editor.string(editor, editor.selection);
      } catch {}
      try {
        var startPath = editor.selection.anchor.path.slice(0, 1);
        var endPath = editor.selection.focus.path.slice(0, 1);
        expandedRange.current = {
          anchor: Editor.start(editor, startPath),
          focus: Editor.end(editor, endPath),
        };
        expandedText.current = Editor.string(editor, expandedRange.current);
      } catch {
        expandedRange.current = savedSelection.current;
        expandedText.current = savedText.current;
      }
      try {
        var domRange = ReactEditor.toDOMRange(editor, editor.selection);
        var selRect = domRange.getBoundingClientRect();
        var containerRect = scrollContainer.getBoundingClientRect();
        var anchorTop = selRect.top - containerRect.top + scrollContainer.scrollTop;
        setTopOffset(anchorTop);
      } catch {}
    }
  }, [editor, scrollContainer, suggestion]);

  useEffect(function autoScroll() {
    if (!suggestion && topOffset !== null && toolbarRef.current) {
      toolbarRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [topOffset, suggestion]);

  useEffect(function handleKeys() {
    function onKeyDown(e: KeyboardEvent) {
      if (suggestion) {
        if (e.key === "Tab" && !e.shiftKey) {
          e.preventDefault();
          if (onAcceptSuggestion) onAcceptSuggestion();
          return;
        }
        if (e.key === "Escape") {
          e.preventDefault();
          if (onRejectSuggestion) onRejectSuggestion();
          return;
        }
        return;
      }
      if (e.key === "Escape") {
        if (linkMode) {
          setLinkMode(false);
          setLinkUrl("");
        } else {
          onClose();
        }
      }
    }
    window.addEventListener("keydown", onKeyDown, true);
    return function cleanup() {
      window.removeEventListener("keydown", onKeyDown, true);
    };
  }, [onClose, linkMode, suggestion, onAcceptSuggestion, onRejectSuggestion]);

  useEffect(function focusLinkInput() {
    if (linkMode && linkInputRef.current) {
      linkInputRef.current.focus();
    }
  }, [linkMode]);

  function computeHighlightRects() {
    if (!savedSelection.current || !scrollContainer) return;
    try {
      var domRange = ReactEditor.toDOMRange(editor, savedSelection.current);
      var rects = Array.from(domRange.getClientRects());
      var containerRect = scrollContainer.getBoundingClientRect();
      setHighlightRects(rects.map(function toAbsolute(r) {
        return {
          top: r.top - containerRect.top + scrollContainer.scrollTop,
          left: r.left - containerRect.left + scrollContainer.scrollLeft,
          width: r.width,
          height: r.height,
        };
      }));
    } catch {
      setHighlightRects([]);
    }
  }

  function clearHighlightRects() {
    setHighlightRects([]);
  }

  function restoreSelection() {
    try {
      ReactEditor.focus(editor);
      if (editor.selection && !Range.isCollapsed(editor.selection)) return;
      if (savedSelection.current) {
        Transforms.select(editor, savedSelection.current);
      }
    } catch {}
  }

  function syncSavedSelection() {
    if (editor.selection && !Range.isCollapsed(editor.selection)) {
      savedSelection.current = { ...editor.selection };
    }
  }

  async function handleEdit(customInstruction: string) {
    if (!preferences.keysStored) return;
    var range = expandedRange.current || savedSelection.current;
    var text = expandedText.current || savedText.current;
    if (!text.trim() || !range) return;
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
          anchor: range.anchor,
          focus: range.focus,
          original: text,
          suggested: data.result,
        });
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
          e.stopPropagation();
        }}
        onClick={function handleClick() {
          restoreSelection();
          action();
          syncSavedSelection();
          forceRender(function bump(n) { return n + 1; });
        }}
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

  if (suggestion) {
    return (
      <div
        ref={toolbarRef}
        data-selection-toolbar
        onMouseDown={function preventFocusSteal(e) {
          e.preventDefault();
        }}
        style={{
          position: "sticky",
          top: 0,
          zIndex: 40,
          maxWidth: 680,
          margin: "0 auto",
          backgroundColor: "var(--color-surface)",
          borderBottom: "1px solid var(--color-border)",
          boxShadow: "0 2px 12px rgba(0,0,0,0.1)",
          fontFamily: "var(--font-inter), system-ui, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "8px 16px",
          }}
        >
          <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
            AI suggestion — original struck through, new highlighted below
          </span>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              onClick={onAcceptSuggestion}
              onMouseDown={function preventBlur(e) {
                e.preventDefault();
                e.stopPropagation();
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                padding: "4px 12px",
                fontSize: 12,
                fontFamily: "inherit",
                fontWeight: 500,
                border: "none",
                borderRadius: 6,
                backgroundColor: "color-mix(in srgb, var(--color-success, #38a169) 15%, transparent)",
                color: "var(--color-success, #38a169)",
                cursor: "pointer",
              }}
            >
              <Check size={13} />
              Accept
              <span style={{ opacity: 0.6, fontSize: 10, marginLeft: 2 }}>Tab</span>
            </button>
            <button
              onClick={onRejectSuggestion}
              onMouseDown={function preventBlur(e) {
                e.preventDefault();
                e.stopPropagation();
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                padding: "4px 12px",
                fontSize: 12,
                fontFamily: "inherit",
                fontWeight: 500,
                border: "none",
                borderRadius: 6,
                backgroundColor: "color-mix(in srgb, var(--color-error, #e53e3e) 15%, transparent)",
                color: "var(--color-error, #e53e3e)",
                cursor: "pointer",
              }}
            >
              <X size={13} />
              Reject
              <span style={{ opacity: 0.6, fontSize: 10, marginLeft: 2 }}>Esc</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  var tokenEstimate = "~" + formatTokenCount(estimateTokens(expandedText.current || savedText.current)) + "t";

  if (topOffset === null) return null;

  return (
    <>
      {highlightRects.map(function renderRect(rect, i) {
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              top: rect.top,
              left: rect.left,
              width: rect.width,
              height: rect.height,
              backgroundColor: "var(--color-accent)",
              opacity: 0.12,
              pointerEvents: "none",
              borderRadius: 2,
              zIndex: 39,
            }}
          />
        );
      })}
      <div
        ref={toolbarRef}
        data-selection-toolbar
        onMouseDown={function preventFocusSteal(e) {
          var tag = (e.target as HTMLElement).tagName;
          if (tag === "INPUT" || tag === "TEXTAREA") return;
          e.preventDefault();
        }}
        style={{
          position: "absolute",
          top: topOffset,
          left: 0,
          right: 0,
          maxWidth: 680,
          margin: "0 auto",
          transform: "translateY(calc(-100% - 8px))",
          zIndex: 40,
          backgroundColor: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          borderRadius: 10,
          boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
          fontFamily: "var(--font-inter), system-ui, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 2,
            padding: "6px 12px",
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
              restoreSelection();
              Transforms.setNodes(editor, { type: "h1" } as any);
            },
            false,
            "Heading 1",
          )}
          {formatBtn(
            <Heading2 size={14} />,
            function clickH2() {
              restoreSelection();
              Transforms.setNodes(editor, { type: "h2" } as any);
            },
            false,
            "Heading 2",
          )}
          {formatBtn(
            <Heading3 size={14} />,
            function clickH3() {
              restoreSelection();
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
                onAddNote(savedText.current);
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
              e.stopPropagation();
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

        <div style={{ padding: "8px 12px" }}>
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
              onFocus={function handleInputFocus() {
                computeHighlightRects();
              }}
              onBlur={function handleInputBlur() {
                clearHighlightRects();
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
            {loading ? (
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
            ) : (
              <button
                type="submit"
                title="Send AI edit"
                disabled={!instruction.trim()}
                onMouseDown={function preventBlur(e) {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                  border: "none",
                  backgroundColor: instruction.trim() ? "var(--color-accent)" : "transparent",
                  color: instruction.trim() ? "#fff" : "var(--color-text-muted)",
                  cursor: instruction.trim() ? "pointer" : "default",
                  flexShrink: 0,
                  transition: "background-color 100ms, color 100ms",
                  opacity: instruction.trim() ? 1 : 0.5,
                }}
              >
                <SendHorizontal size={14} />
              </button>
            )}
          </form>
        </div>
      </div>
    </>
  );
}
