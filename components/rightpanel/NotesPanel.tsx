"use client";

import { useState, useEffect, useRef } from "react";
import { Plus, Clipboard, X, StickyNote, FileText, MessageSquare, ChevronDown, Trash2 } from "lucide-react";
import { useAppStore } from "@/store";

interface Note {
  id: string;
  filePath: string;
  chapter: string;
  quote: string;
  text: string;
  ts: number;
}

interface Notepad {
  id: string;
  name: string;
  createdAt: number;
}

var actionBtnStyle: React.CSSProperties = {
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

function notepadIndexKey(repoKey: string): string {
  return "scriva:notepads:" + repoKey;
}

function notesStorageKey(repoKey: string, notepadId: string): string {
  return "scriva:notes:" + repoKey + ":" + notepadId;
}

function loadNotepads(repoKey: string): Notepad[] {
  try {
    var raw = localStorage.getItem(notepadIndexKey(repoKey));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveNotepads(repoKey: string, pads: Notepad[]) {
  localStorage.setItem(notepadIndexKey(repoKey), JSON.stringify(pads));
}

function loadNotes(repoKey: string, notepadId: string): Note[] {
  try {
    var raw = localStorage.getItem(notesStorageKey(repoKey, notepadId));
    if (raw) return JSON.parse(raw);
    var legacyRaw = localStorage.getItem("scriva:notes:" + repoKey);
    if (legacyRaw) return JSON.parse(legacyRaw);
    return [];
  } catch {
    return [];
  }
}

function saveNotes(repoKey: string, notepadId: string, notes: Note[]) {
  localStorage.setItem(notesStorageKey(repoKey, notepadId), JSON.stringify(notes));
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

function createNotepad(name?: string): Notepad {
  return {
    id: "pad-" + Date.now() + "-" + Math.random().toString(36).substring(2, 7),
    name: name || "Notepad " + (Date.now() % 1000),
    createdAt: Date.now(),
  };
}

export default function NotesPanel() {
  var repoKey = useAppStore(function (s) {
    return s.editor.currentBook;
  }) || "default";

  var [notepads, setNotepads] = useState<Notepad[]>([]);
  var [activepadId, setActivepadId] = useState<string>("");
  var [notes, setNotes] = useState<Note[]>([]);
  var [toast, setToast] = useState("");
  var [padListOpen, setPadListOpen] = useState(false);
  var [editingName, setEditingName] = useState(false);
  var [editName, setEditName] = useState("");
  var listRef = useRef<HTMLDivElement>(null);
  var padRef = useRef<HTMLDivElement>(null);

  useEffect(function init() {
    var pads = loadNotepads(repoKey);
    if (pads.length === 0) {
      var first = createNotepad("Notepad 1");
      pads = [first];
      saveNotepads(repoKey, pads);
    }
    setNotepads(pads);
    setActivepadId(pads[0].id);
  }, [repoKey]);

  useEffect(function loadNotesForPad() {
    if (!activepadId) return;
    setNotes(loadNotes(repoKey, activepadId));
    function onUpdated() {
      setNotes(loadNotes(repoKey, activepadId));
    }
    window.addEventListener("scriva:notes-updated", onUpdated);
    return function cleanup() {
      window.removeEventListener("scriva:notes-updated", onUpdated);
    };
  }, [repoKey, activepadId]);

  useEffect(function closePadList() {
    function handler(e: MouseEvent) {
      if (padRef.current && !padRef.current.contains(e.target as Node)) setPadListOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return function cleanup() { document.removeEventListener("mousedown", handler); };
  }, []);

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

  function handleNewNotepad() {
    var count = notepads.length + 1;
    var pad = createNotepad("Notepad " + count);
    var updated = [pad, ...notepads];
    setNotepads(updated);
    saveNotepads(repoKey, updated);
    setActivepadId(pad.id);
    setNotes([]);
    setPadListOpen(false);
  }

  function handleSwitchNotepad(padId: string) {
    setActivepadId(padId);
    setPadListOpen(false);
  }

  function handleDeleteNotepad(padId: string) {
    var updated = notepads.filter(function f(p) { return p.id !== padId; });
    if (updated.length === 0) {
      var fresh = createNotepad("Notepad 1");
      updated = [fresh];
    }
    setNotepads(updated);
    saveNotepads(repoKey, updated);
    localStorage.removeItem(notesStorageKey(repoKey, padId));
    if (padId === activepadId) {
      setActivepadId(updated[0].id);
    }
  }

  function handleRenameNotepad() {
    if (!editName.trim()) {
      setEditingName(false);
      return;
    }
    var updated = notepads.map(function f(p) {
      return p.id === activepadId ? { ...p, name: editName.trim() } : p;
    });
    setNotepads(updated);
    saveNotepads(repoKey, updated);
    setEditingName(false);
  }

  function handleAddBlank() {
    var id = "note-" + Date.now() + "-" + Math.random().toString(36).substring(2, 7);
    var newNote: Note = {
      id: id,
      filePath: "",
      chapter: "General",
      quote: "",
      text: "",
      ts: Date.now(),
    };
    var next = [...notes, newNote];
    setNotes(next);
    saveNotes(repoKey, activepadId, next);
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
      return n.id === id ? { ...n, text: text } : n;
    });
    setNotes(next);
    saveNotes(repoKey, activepadId, next);
  }

  function handleDeleteNote(id: string) {
    var next = notes.filter(function (n) {
      return n.id !== id;
    });
    setNotes(next);
    saveNotes(repoKey, activepadId, next);
    showToast("Note deleted");
  }

  function handleAddToChat(note: Note) {
    var text = "";
    if (note.quote) text += "> " + note.quote.substring(0, 200) + "\n\n";
    if (note.text) text += note.text;
    if (!text.trim()) return;
    window.dispatchEvent(new CustomEvent("scriva:add-note-to-chat", { detail: { text: text.trim() } }));
    showToast("Added to chat");
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

  var activePad = notepads.find(function f(p) { return p.id === activepadId; });

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
        ref={padRef}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "6px 12px",
          borderBottom: "1px solid var(--color-border)",
          flexShrink: 0,
          position: "relative",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1, minWidth: 0 }}>
          <StickyNote size={14} style={{ color: "var(--color-accent)", flexShrink: 0 }} />
          {editingName ? (
            <input
              value={editName}
              onChange={function handleChange(e) { setEditName(e.target.value); }}
              onBlur={handleRenameNotepad}
              onKeyDown={function handleKey(e) { if (e.key === "Enter") handleRenameNotepad(); if (e.key === "Escape") setEditingName(false); }}
              autoFocus
              style={{
                flex: 1,
                padding: "2px 4px",
                fontSize: 12,
                fontFamily: "inherit",
                fontWeight: 600,
                border: "1px solid var(--color-accent)",
                borderRadius: 4,
                backgroundColor: "var(--color-bg)",
                color: "var(--color-text)",
                outline: "none",
              }}
            />
          ) : (
            <button
              onClick={function toggle() { setPadListOpen(!padListOpen); }}
              onDoubleClick={function startRename() {
                setEditingName(true);
                setEditName(activePad?.name || "");
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                padding: 0,
                fontSize: 12,
                fontFamily: "inherit",
                fontWeight: 600,
                border: "none",
                background: "transparent",
                color: "var(--color-text)",
                cursor: "pointer",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                textAlign: "left",
              }}
            >
              <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                {activePad?.name || "Notepad"}
              </span>
              <ChevronDown size={10} style={{ flexShrink: 0, color: "var(--color-text-muted)", transform: padListOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 150ms" }} />
            </button>
          )}
        </div>
        <button
          onClick={handleNewNotepad}
          title="New notepad"
          style={actionBtnStyle}
        >
          <Plus size={14} />
        </button>
        {padListOpen && (
          <div
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              right: 0,
              marginTop: 2,
              backgroundColor: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: 8,
              boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
              padding: 4,
              zIndex: 50,
              maxHeight: 200,
              overflowY: "auto",
            }}
          >
            {notepads.map(function renderPad(pad) {
              var isActive = pad.id === activepadId;
              return (
                <div
                  key={pad.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    borderRadius: 4,
                  }}
                  onMouseEnter={function hover(e) { e.currentTarget.style.backgroundColor = "var(--color-surface-hover)"; }}
                  onMouseLeave={function unhover(e) { e.currentTarget.style.backgroundColor = "transparent"; }}
                >
                  <button
                    onClick={function switchPad() { handleSwitchNotepad(pad.id); }}
                    style={{
                      flex: 1,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "6px 10px",
                      fontSize: 12,
                      fontFamily: "inherit",
                      fontWeight: isActive ? 600 : 400,
                      color: isActive ? "var(--color-accent)" : "var(--color-text)",
                      border: "none",
                      background: "transparent",
                      cursor: "pointer",
                      borderRadius: 4,
                      textAlign: "left",
                    }}
                  >
                    {pad.name}
                  </button>
                  {notepads.length > 1 && (
                    <button
                      onClick={function del(e) { e.stopPropagation(); handleDeleteNotepad(pad.id); }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: 20,
                        height: 20,
                        border: "none",
                        background: "transparent",
                        color: "var(--color-text-muted)",
                        cursor: "pointer",
                        borderRadius: 3,
                        flexShrink: 0,
                        marginRight: 4,
                      }}
                    >
                      <Trash2 size={11} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "3px 12px",
          borderBottom: "1px solid var(--color-border)",
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 10, color: "var(--color-text-muted)" }}>
          {notes.length} note{notes.length !== 1 ? "s" : ""}
        </span>
        <div style={{ display: "flex", gap: 2 }}>
          <button
            title="Copy all notes"
            onClick={handleExport}
            disabled={notes.length === 0}
            style={{ ...actionBtnStyle, width: 22, height: 22 }}
          >
            <Clipboard size={12} />
          </button>
          <button title="New note" onClick={handleAddBlank} style={{ ...actionBtnStyle, width: 22, height: 22 }}>
            <Plus size={12} />
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
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginTop: 6,
                }}
              >
                <span
                  style={{
                    fontSize: 10,
                    color: "var(--color-text-muted)",
                    opacity: 0.7,
                  }}
                >
                  {formatTime(note.ts)}
                </span>
                <button
                  onClick={function addChat() { handleAddToChat(note); }}
                  title="Add to chat"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 3,
                    padding: "2px 8px",
                    fontSize: 10,
                    fontFamily: "inherit",
                    fontWeight: 500,
                    border: "1px solid var(--color-border)",
                    borderRadius: 4,
                    backgroundColor: "transparent",
                    color: "var(--color-text-muted)",
                    cursor: "pointer",
                    transition: "color 150ms, border-color 150ms",
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
                  <MessageSquare size={10} />
                  Add to Chat
                </button>
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
