"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { MessageSquare, StickyNote, ChevronDown, ChevronUp, ArrowDown } from "lucide-react";
import ChatPanel from "./ChatPanel";
import NotesPanel from "./NotesPanel";

var MIN_PANEL_PX = 36;
var DIVIDER_HEIGHT = 28;

export default function RightPanel() {
  var containerRef = useRef<HTMLDivElement>(null);
  var [notesFraction, setNotesFraction] = useState(0.33);
  var [dragging, setDragging] = useState(false);
  var dragStartY = useRef(0);
  var dragStartFraction = useRef(0);

  var notesCollapsed = notesFraction < 0.05;
  var chatCollapsed = notesFraction > 0.95;

  var handleMouseDown = useCallback(function onMouseDown(e: React.MouseEvent) {
    e.preventDefault();
    dragStartY.current = e.clientY;
    dragStartFraction.current = notesFraction;
    setDragging(true);
  }, [notesFraction]);

  useEffect(function setupDrag() {
    if (!dragging) return;

    function onMouseMove(e: MouseEvent) {
      if (!containerRef.current) return;
      var rect = containerRef.current.getBoundingClientRect();
      var totalHeight = rect.height - DIVIDER_HEIGHT;
      if (totalHeight <= 0) return;

      var deltaY = e.clientY - dragStartY.current;
      var deltaFraction = deltaY / totalHeight;
      var next = dragStartFraction.current + deltaFraction;

      var minFraction = MIN_PANEL_PX / totalHeight;
      if (next < minFraction * 0.5) next = 0;
      else if (next < minFraction) next = minFraction;
      if (next > 1 - minFraction * 0.5) next = 1;
      else if (next > 1 - minFraction) next = 1 - minFraction;

      setNotesFraction(next);
    }

    function onMouseUp() {
      setDragging(false);
    }

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    return function cleanup() {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, [dragging]);

  function handleAddAllNotesToChat() {
    window.dispatchEvent(new CustomEvent("scriva:add-all-notes-to-chat"));
  }

  function handleExpandNotes() {
    setNotesFraction(0.33);
  }

  function handleExpandChat() {
    setNotesFraction(0.33);
  }

  function handleCollapseNotes() {
    setNotesFraction(0);
  }

  function handleCollapseChat() {
    setNotesFraction(1);
  }

  return (
    <div
      ref={containerRef}
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        fontFamily: "var(--font-inter), system-ui, sans-serif",
        userSelect: dragging ? "none" : "auto",
      }}
    >
      {notesCollapsed ? (
        <button
          onClick={handleExpandNotes}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            padding: "6px 0",
            fontSize: 11,
            fontFamily: "inherit",
            fontWeight: 500,
            border: "none",
            borderBottom: "1px solid var(--color-border)",
            backgroundColor: "transparent",
            color: "var(--color-text-muted)",
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          <StickyNote size={12} />
          Notes
          <ChevronDown size={10} />
        </button>
      ) : (
        <div style={{ flex: notesFraction, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <NotesPanel />
        </div>
      )}

      <div
        onMouseDown={handleMouseDown}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          height: DIVIDER_HEIGHT,
          flexShrink: 0,
          borderTop: "1px solid var(--color-border)",
          borderBottom: "1px solid var(--color-border)",
          backgroundColor: "var(--color-surface)",
          cursor: "row-resize",
          position: "relative",
          zIndex: 2,
        }}
      >
        <div
          style={{
            width: 32,
            height: 3,
            borderRadius: 2,
            backgroundColor: "var(--color-text-muted)",
            opacity: 0.3,
            position: "absolute",
            left: 8,
            top: "50%",
            transform: "translateY(-50%)",
          }}
        />
        <button
          onClick={function addNotes(e) { e.stopPropagation(); handleAddAllNotesToChat(); }}
          onMouseDown={function stop(e) { e.stopPropagation(); }}
          title="Add full notepad to chat"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            padding: "2px 10px",
            fontSize: 10,
            fontFamily: "inherit",
            fontWeight: 500,
            border: "1px solid var(--color-border)",
            borderRadius: 4,
            backgroundColor: "transparent",
            color: "var(--color-text-muted)",
            cursor: "pointer",
            transition: "color 150ms, border-color 150ms",
            zIndex: 1,
          }}
          onMouseEnter={function hover(e) {
            e.currentTarget.style.color = "var(--color-accent)";
            e.currentTarget.style.borderColor = "var(--color-accent)";
          }}
          onMouseLeave={function unhover(e) {
            e.currentTarget.style.color = "var(--color-text-muted)";
            e.currentTarget.style.borderColor = "var(--color-border)";
          }}
        >
          <ArrowDown size={10} />
          Add Notes to Chat
        </button>
        {!notesCollapsed && !chatCollapsed && (
          <div style={{ position: "absolute", right: 6, display: "flex", gap: 2 }}>
            <button
              onClick={function colNotes(e) { e.stopPropagation(); handleCollapseNotes(); }}
              onMouseDown={function stop(e) { e.stopPropagation(); }}
              title="Collapse notes"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 18,
                height: 18,
                border: "none",
                background: "transparent",
                color: "var(--color-text-muted)",
                cursor: "pointer",
                borderRadius: 3,
              }}
            >
              <ChevronUp size={10} />
            </button>
            <button
              onClick={function colChat(e) { e.stopPropagation(); handleCollapseChat(); }}
              onMouseDown={function stop(e) { e.stopPropagation(); }}
              title="Collapse chat"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 18,
                height: 18,
                border: "none",
                background: "transparent",
                color: "var(--color-text-muted)",
                cursor: "pointer",
                borderRadius: 3,
              }}
            >
              <ChevronDown size={10} />
            </button>
          </div>
        )}
      </div>

      {chatCollapsed ? (
        <button
          onClick={handleExpandChat}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            padding: "6px 0",
            fontSize: 11,
            fontFamily: "inherit",
            fontWeight: 500,
            border: "none",
            backgroundColor: "transparent",
            color: "var(--color-text-muted)",
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          <MessageSquare size={12} />
          Chat
          <ChevronUp size={10} />
        </button>
      ) : (
        <div style={{ flex: 1 - notesFraction, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <ChatPanel />
        </div>
      )}
    </div>
  );
}
