"use client";

import { useState, useEffect, useRef } from "react";
import { Plus, Clipboard, Trash2, X, StickyNote, FileText } from "lucide-react";
import { useAppStore } from "@/store";

interface Note {
  id: string;
  filePath: string;
  chapter: string;
  quote: string;
  text: string;
  ts: number;
}

const actionBtnStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: 28,
  height: 28,
  borderRadius: 4,
  border: "none",
  background: "none",
  color: "var(--color-text-muted)",
  cursor: "pointer",
};

function storageKey(repoKey: string): string {
  return `scriva:notes:${repoKey}`;
}

function loadNotes(repoKey: string): Note[] {
  try {
    var raw = localStorage.getItem(storageKey(repoKey));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveNotes(repoKey: string, notes: Note[]): void {
  localStorage.setItem(storageKey(repoKey), JSON.stringify(notes));
  window.dispatchEvent(new CustomEvent("scriva:notes-updated"));
}

function formatTime(ts: number): string {
  var d = new Date(ts);
  var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var h = d.getHours();
  var m = d.getMinutes();
  var ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  var mm = m < 10 ? "0" + m : String(m);
  return months[d.getMonth()] + " " + d.getDate() + ", " + h + ":" + mm + " " + ampm;
}

export default function NotesPanel() {
  var repoKey = useAppStore(function (s) {
    return s.editor.currentBook;
  }) || "default";
  var [notes, setNotes] = useState<Note[]>([]);
  var [toast, setToast] = useState("");
  var listRef = useRef<HTMLDivElement>(null);

  useEffect(
    function init() {
      setNotes(loadNotes(repoKey));
      function onUpdated() {
        setNotes(loadNotes(repoKey));
      }
      window.addEventListener("scriva:notes-updated", onUpdated);
      return function cleanup() {
        window.removeEventListener("scriva:notes-updated", onUpdated);
      };
    },
    [repoKey]
  );

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(function () {
      setToast("");
    }, 2000);
  }

  function scrollToNote(noteId: string) {
    var el = listRef.current?.querySelector('[data-note-id="' + noteId + '"]');
    if (el instanceof HTMLElement) {
      var target = el;
      target.scrollIntoView({ behavior: "smooth" });
      target.style.boxShadow = "0 0 0 2px var(--color-accent)";
      setTimeout(function () {
        target.style.boxShadow = "";
      }, 600);
    }
  }

  function handleAddBlank() {
    var id = "note-" + Date.now() + "-" + Math.random().toString(36).substring(2, 7);
    var newNote: Note = {
      id,
      filePath: "",
      chapter: "General",
      quote: "",
      text: "",
      ts: Date.now(),
    };
    var next = [...notes, newNote];
    setNotes(next);
    saveNotes(repoKey, next);
    scrollToNote(id);
    setTimeout(function () {
      var textarea = listRef.current?.querySelector('[data-note-id="' + id + '"] textarea');
      if (textarea instanceof HTMLTextAreaElement) {
        textarea.focus();
      }
    }, 100);
  }

  function handleUpdateNote(id: string, text: string) {
    var next = notes.map(function (n) {
      return n.id === id ? { ...n, text } : n;
    });
    setNotes(next);
    saveNotes(repoKey, next);
  }

  function handleDeleteNote(id: string) {
    var next = notes.filter(function (n) {
      return n.id !== id;
    });
    setNotes(next);
    saveNotes(repoKey, next);
    showToast("Note deleted");
  }

  function handleClearAll() {
    if (confirm("Delete all notes?")) {
      setNotes([]);
      saveNotes(repoKey, []);
      showToast("All notes cleared");
    }
  }

  function handleExport() {
    var date = new Date().toLocaleDateString();
    var chapters: Record<string, Note[]> = {};
    notes.forEach(function (n) {
      var ch = n.chapter || "General";
      if (!chapters[ch]) chapters[ch] = [];
      chapters[ch].push(n);
    });
    var lines = ["# Book Notes", "# Exported: " + date, "---"];
    Object.keys(chapters).sort().forEach(function (ch) {
      lines.push("## " + ch);
      chapters[ch].forEach(function (n) {
        if (n.quote) lines.push("> " + n.quote.replace(/\n/g, "\n> "));
        lines.push(n.text);
        lines.push("---");
      });
    });
    navigator.clipboard.writeText(lines.join("\n"));
    showToast("Notes copied to clipboard");
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        minHeight: 0,
        fontFamily: "var(--font-inter), system-ui, sans-serif",
        position: "relative",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 12px",
          borderBottom: "1px solid var(--color-border)",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <StickyNote size={14} style={{ color: "var(--color-accent)" }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text)" }}>Notes</span>
          <span style={{ fontSize: 11, color: "var(--color-text-muted)" }}>{notes.length}</span>
        </div>
        <div style={{ display: "flex", gap: 2 }}>
          <button title="New note" onClick={handleAddBlank} style={actionBtnStyle}>
            <Plus size={14} />
          </button>
          <button
            title="Copy all notes"
            onClick={handleExport}
            disabled={notes.length === 0}
            style={actionBtnStyle}
          >
            <Clipboard size={14} />
          </button>
          <button
            title="Clear all"
            onClick={handleClearAll}
            disabled={notes.length === 0}
            style={actionBtnStyle}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div
        ref={listRef}
        style={{
          flex: 1,
          overflowY: "auto",
          padding: 8,
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        {notes.length === 0 && (
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              padding: 24,
              color: "var(--color-text-muted)",
              fontSize: 13,
            }}
          >
            Select text in the editor and click the note icon to annotate it.
          </div>
        )}

        {notes.map(function renderNote(note) {
          return (
            <div
              key={note.id}
              data-note-id={note.id}
              style={{
                backgroundColor: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                borderRadius: 8,
                padding: "10px 12px",
                position: "relative",
                transition: "box-shadow 200ms",
              }}
            >
              <div
                onClick={function scrollToQuote() {
                  if (!note.filePath && !note.quote) return;
                  window.dispatchEvent(
                    new CustomEvent("scriva:scroll-to-quote", {
                      detail: { filePath: note.filePath, quote: note.quote },
                    })
                  );
                }}
                onMouseEnter={function hoverIn(e) {
                  if (note.filePath || note.quote) {
                    e.currentTarget.style.textDecoration = "underline";
                  }
                }}
                onMouseLeave={function hoverOut(e) {
                  e.currentTarget.style.textDecoration = "none";
                }}
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                  color: "var(--color-accent)",
                  marginBottom: 4,
                  cursor: note.filePath || note.quote ? "pointer" : "default",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                {note.filePath && <FileText size={10} />}
                {note.chapter || "General"}
              </div>

              {note.quote && (
                <div
                  onClick={function scrollToQuote() {
                    window.dispatchEvent(
                      new CustomEvent("scriva:scroll-to-quote", {
                        detail: { filePath: note.filePath, quote: note.quote },
                      })
                    );
                  }}
                  onMouseEnter={function hoverIn(e) {
                    e.currentTarget.style.backgroundColor = "rgba(184, 134, 11, 0.08)";
                  }}
                  onMouseLeave={function hoverOut(e) {
                    e.currentTarget.style.backgroundColor = "rgba(184, 134, 11, 0.04)";
                  }}
                  style={{
                    fontSize: 12,
                    fontStyle: "italic",
                    color: "var(--color-text-muted)",
                    lineHeight: 1.5,
                    padding: "6px 8px",
                    backgroundColor: "rgba(184, 134, 11, 0.04)",
                    borderLeft: "2px solid var(--color-accent)",
                    borderRadius: "0 4px 4px 0",
                    marginBottom: 8,
                    maxHeight: 64,
                    overflow: "hidden",
                    cursor: "pointer",
                    transition: "background-color 150ms",
                  }}
                >
                  {note.quote.length > 200 ? note.quote.substring(0, 200) + "..." : note.quote}
                </div>
              )}

              <textarea
                value={note.text}
                onChange={function handleChange(e) {
                  handleUpdateNote(note.id, e.target.value);
                }}
                placeholder="Write your note..."
                style={{
                  width: "100%",
                  minHeight: 44,
                  border: "1px solid var(--color-border)",
                  borderRadius: 4,
                  padding: "6px 8px",
                  fontFamily: "var(--font-inter), system-ui, sans-serif",
                  fontSize: 12,
                  color: "var(--color-text)",
                  backgroundColor: "var(--color-bg)",
                  resize: "vertical",
                  lineHeight: 1.5,
                  outline: "none",
                }}
              />

              <div
                style={{
                  fontSize: 10,
                  color: "var(--color-text-muted)",
                  marginTop: 4,
                  opacity: 0.7,
                }}
              >
                {formatTime(note.ts)}
              </div>

              <button
                onClick={function handleDel() {
                  handleDeleteNote(note.id);
                }}
                title="Delete note"
                style={{
                  position: "absolute",
                  top: 8,
                  right: 8,
                  width: 22,
                  height: 22,
                  borderRadius: 4,
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--color-text-muted)",
                  opacity: 0.4,
                  transition: "opacity 150ms",
                }}
                onMouseEnter={function show(e) {
                  e.currentTarget.style.opacity = "1";
                  e.currentTarget.style.color = "#c44";
                }}
                onMouseLeave={function hide(e) {
                  e.currentTarget.style.opacity = "0.4";
                  e.currentTarget.style.color = "var(--color-text-muted)";
                }}
              >
                <X size={13} />
              </button>
            </div>
          );
        })}
      </div>

      {toast && (
        <div
          style={{
            position: "absolute",
            bottom: 16,
            left: "50%",
            transform: "translateX(-50%)",
            backgroundColor: "#333",
            color: "#fff",
            fontSize: 12,
            padding: "6px 14px",
            borderRadius: 6,
            pointerEvents: "none",
            zIndex: 10,
          }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}
