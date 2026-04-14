"use client";

import { useEffect, useState, useRef } from "react";
import { Editor, Text } from "slate";
import { ReactEditor } from "slate-react";
import { Check, X } from "lucide-react";

interface InlineSuggestionOverlayProps {
  editor: any;
  onAccept: () => void;
  onReject: () => void;
}

export default function InlineSuggestionOverlay({
  editor,
  onAccept,
  onReject,
}: InlineSuggestionOverlayProps) {
  var [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  useEffect(function updatePosition() {
    try {
      var newNodes = Array.from(
        Editor.nodes(editor, {
          at: [],
          match: function matchSuggestionNew(n: any) {
            return Text.isText(n) && (n as any).suggestionNew === true;
          },
        })
      );
      if (newNodes.length === 0) {
        setPosition(null);
        return;
      }
      var lastNode = newNodes[newNodes.length - 1];
      var path = lastNode[1];
      var textLen = ((lastNode[0] as any).text || "").length;
      var point = { path: path, offset: textLen };
      var domRange = ReactEditor.toDOMRange(editor, { anchor: point, focus: point });
      var rect = domRange.getBoundingClientRect();
      setPosition({ top: rect.bottom + 4, left: rect.right });
    } catch {
      setPosition(null);
    }
  }, [editor]);

  useEffect(function handleKeys() {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Tab" && !e.shiftKey) {
        e.preventDefault();
        onAccept();
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        onReject();
        return;
      }
    }
    window.addEventListener("keydown", onKeyDown, true);
    return function cleanup() {
      window.removeEventListener("keydown", onKeyDown, true);
    };
  }, [onAccept, onReject]);

  if (!position) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: position.top,
        left: position.left,
        transform: "translateX(-50%)",
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        gap: 4,
        backgroundColor: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderRadius: 6,
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        padding: "3px 6px",
        fontFamily: "var(--font-inter), system-ui, sans-serif",
        fontSize: 11,
      }}
      onMouseDown={function preventBlur(e) {
        e.preventDefault();
      }}
    >
      <button
        onClick={onAccept}
        title="Accept (Tab)"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 3,
          padding: "2px 6px",
          fontSize: 11,
          fontFamily: "inherit",
          border: "none",
          borderRadius: 4,
          backgroundColor: "color-mix(in srgb, var(--color-success, #38a169) 15%, transparent)",
          color: "var(--color-success, #38a169)",
          cursor: "pointer",
        }}
      >
        <Check size={11} />
        Tab
      </button>
      <button
        onClick={onReject}
        title="Reject (Esc)"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 3,
          padding: "2px 6px",
          fontSize: 11,
          fontFamily: "inherit",
          border: "none",
          borderRadius: 4,
          backgroundColor: "color-mix(in srgb, var(--color-error, #e53e3e) 15%, transparent)",
          color: "var(--color-error, #e53e3e)",
          cursor: "pointer",
        }}
      >
        <X size={11} />
        Esc
      </button>
    </div>
  );
}
