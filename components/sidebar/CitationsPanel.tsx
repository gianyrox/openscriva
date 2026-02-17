"use client";

import { useState, useEffect } from "react";
import { ChevronRight, Plus, Loader2 } from "lucide-react";
import { useAppStore } from "@/store";
import { getBookConfig } from "@/lib/bookConfig";
import type { CitationEntry } from "@/types/scriva";

var TYPE_LABELS: Record<string, string> = {
  book: "Book",
  article: "Article",
  web: "Web",
  journal: "Journal",
  chapter: "Chapter",
  other: "Other",
};

export default function CitationsPanel() {
  var currentBook = useAppStore(function selectBook(s) { return s.editor.currentBook; });
  var [citations, setCitations] = useState<CitationEntry[]>([]);
  var [loading, setLoading] = useState(true);
  var [expandedId, setExpandedId] = useState<string | null>(null);
  var [addingOpen, setAddingOpen] = useState(false);
  var [newTitle, setNewTitle] = useState("");
  var [newAuthors, setNewAuthors] = useState("");
  var [newType, setNewType] = useState<CitationEntry["type"]>("book");
  var [saving, setSaving] = useState(false);

  useEffect(function loadCitations() {
    var cfg = getBookConfig(currentBook);
    if (!cfg) { setLoading(false); return; }

    window.fetch("/api/github/files?owner=" + cfg.owner + "&repo=" + cfg.repo + "&path=.scriva/citations.json&branch=" + cfg.branch)
      .then(function handleRes(res) {
        if (!res.ok) return [];
        return res.json().then(function parse(data) {
          if (data.content) return JSON.parse(data.content);
          return [];
        });
      })
      .then(function setCites(data) { setCitations(Array.isArray(data) ? data : []); })
      .catch(function err() { setCitations([]); })
      .finally(function done() { setLoading(false); });
  }, [currentBook]);

  function toggleExpand(id: string) {
    setExpandedId(function toggle(prev) { return prev === id ? null : id; });
  }

  function handleQuickAdd() {
    if (!newTitle.trim() || saving) return;
    var cfg = getBookConfig(currentBook);
    if (!cfg) return;

    setSaving(true);

    var entry: CitationEntry = {
      id: "cite-" + Date.now(),
      type: newType,
      title: newTitle.trim(),
      authors: newAuthors.split(",").map(function trim(s) { return s.trim(); }).filter(Boolean),
    };

    var updated = [...citations, entry];

    window.fetch("/api/github/files", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        owner: cfg.owner,
        repo: cfg.repo,
        path: ".scriva/citations.json",
        content: JSON.stringify(updated, null, 2),
        message: "Add citation: " + entry.title,
        branch: cfg.branch,
      }),
    })
      .then(function done() {
        setCitations(updated);
        setNewTitle("");
        setNewAuthors("");
        setAddingOpen(false);
      })
      .catch(function err() {})
      .finally(function fin() { setSaving(false); });
  }

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 16, color: "var(--color-text-muted)" }}>
        <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "var(--font-inter), system-ui, sans-serif", fontSize: 12 }}>
      <div style={{ maxHeight: 300, overflowY: "auto" }}>
        {citations.length === 0 && !addingOpen && (
          <div style={{ padding: 16, textAlign: "center", color: "var(--color-text-muted)", fontSize: 11 }}>
            No citations yet
          </div>
        )}

        {citations.map(function renderCite(cite) {
          var isExpanded = expandedId === cite.id;
          var authorsStr = cite.authors.length > 0 ? cite.authors[0] + (cite.authors.length > 1 ? " et al." : "") : "";
          var yearStr = cite.year ? " (" + cite.year + ")" : "";

          return (
            <div key={cite.id} style={{ borderBottom: "1px solid var(--color-border)" }}>
              <button
                onClick={function toggle() { toggleExpand(cite.id); }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  width: "100%",
                  padding: "6px 12px",
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  fontSize: 11,
                  color: "var(--color-text)",
                  textAlign: "left",
                  transition: "background 100ms",
                }}
                onMouseEnter={function enter(e) { e.currentTarget.style.backgroundColor = "var(--color-surface-hover)"; }}
                onMouseLeave={function leave(e) { e.currentTarget.style.backgroundColor = "transparent"; }}
              >
                <ChevronRight
                  size={10}
                  style={{
                    transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
                    transition: "transform 150ms ease",
                    flexShrink: 0,
                  }}
                />
                <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  <span style={{ fontWeight: 500 }}>{authorsStr}{yearStr}</span>
                  {authorsStr && " — "}
                  <span style={{ color: "var(--color-text-muted)" }}>{cite.title}</span>
                </span>
                <span style={{ fontSize: 9, color: "var(--color-text-muted)", textTransform: "uppercase", flexShrink: 0 }}>
                  {TYPE_LABELS[cite.type] || cite.type}
                </span>
              </button>

              {isExpanded && (
                <div style={{ padding: "4px 12px 8px 28px", fontSize: 11, color: "var(--color-text-muted)", lineHeight: 1.5 }}>
                  {cite.authors.length > 0 && <div><strong>Authors:</strong> {cite.authors.join(", ")}</div>}
                  {cite.year && <div><strong>Year:</strong> {cite.year}</div>}
                  {cite.publisher && <div><strong>Publisher:</strong> {cite.publisher}</div>}
                  {cite.journal && <div><strong>Journal:</strong> {cite.journal}</div>}
                  {cite.url && <div><strong>URL:</strong> {cite.url}</div>}
                  {cite.doi && <div><strong>DOI:</strong> {cite.doi}</div>}
                  {cite.notes && <div><strong>Notes:</strong> {cite.notes}</div>}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {addingOpen && (
        <div style={{ padding: "8px 12px", borderTop: "1px solid var(--color-border)", display: "flex", flexDirection: "column", gap: 4 }}>
          <select
            value={newType}
            onChange={function change(e) { setNewType(e.target.value as CitationEntry["type"]); }}
            style={{
              fontSize: 11,
              padding: "3px 6px",
              border: "1px solid var(--color-border)",
              borderRadius: 4,
              backgroundColor: "var(--color-bg)",
              color: "var(--color-text)",
              fontFamily: "inherit",
            }}
          >
            <option value="book">Book</option>
            <option value="article">Article</option>
            <option value="journal">Journal</option>
            <option value="web">Web</option>
            <option value="chapter">Chapter</option>
            <option value="other">Other</option>
          </select>
          <input
            type="text"
            value={newTitle}
            onChange={function change(e) { setNewTitle(e.target.value); }}
            placeholder="Title..."
            style={{
              fontSize: 11,
              padding: "3px 6px",
              border: "1px solid var(--color-border)",
              borderRadius: 4,
              backgroundColor: "var(--color-bg)",
              color: "var(--color-text)",
              outline: "none",
              fontFamily: "inherit",
            }}
          />
          <input
            type="text"
            value={newAuthors}
            onChange={function change(e) { setNewAuthors(e.target.value); }}
            placeholder="Authors (comma separated)..."
            style={{
              fontSize: 11,
              padding: "3px 6px",
              border: "1px solid var(--color-border)",
              borderRadius: 4,
              backgroundColor: "var(--color-bg)",
              color: "var(--color-text)",
              outline: "none",
              fontFamily: "inherit",
            }}
          />
          <div style={{ display: "flex", gap: 4 }}>
            <button
              onClick={handleQuickAdd}
              disabled={saving || !newTitle.trim()}
              style={{
                flex: 1,
                fontSize: 11,
                padding: "4px 0",
                border: "none",
                borderRadius: 4,
                backgroundColor: "var(--color-accent)",
                color: "#fff",
                cursor: saving ? "default" : "pointer",
                fontFamily: "inherit",
                opacity: saving || !newTitle.trim() ? 0.5 : 1,
              }}
            >
              {saving ? "Saving..." : "Add"}
            </button>
            <button
              onClick={function cancel() { setAddingOpen(false); }}
              style={{
                fontSize: 11,
                padding: "4px 8px",
                border: "1px solid var(--color-border)",
                borderRadius: 4,
                backgroundColor: "transparent",
                color: "var(--color-text-muted)",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {!addingOpen && (
        <div style={{ padding: "6px 8px", borderTop: citations.length > 0 ? "1px solid var(--color-border)" : "none" }}>
          <button
            onClick={function open() { setAddingOpen(true); }}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
              width: "100%",
              padding: "5px 0",
              border: "1px dashed var(--color-border)",
              borderRadius: 5,
              background: "none",
              color: "var(--color-text-muted)",
              fontSize: 11,
              fontFamily: "inherit",
              cursor: "pointer",
              transition: "color 150ms, border-color 150ms",
            }}
            onMouseEnter={function enter(e) { e.currentTarget.style.color = "var(--color-accent)"; e.currentTarget.style.borderColor = "var(--color-accent)"; }}
            onMouseLeave={function leave(e) { e.currentTarget.style.color = "var(--color-text-muted)"; e.currentTarget.style.borderColor = "var(--color-border)"; }}
          >
            <Plus size={11} />
            Add Citation
          </button>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
