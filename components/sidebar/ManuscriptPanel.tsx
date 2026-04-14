"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { GripVertical, Plus, ChevronRight, FileText } from "lucide-react";
import { useAppStore } from "@/store";
import { getBookConfig, saveBookConfig } from "@/lib/bookConfig";
import type { BookConfig, Chapter, Part, Book } from "@/types";
import type { MatterSection } from "@/types/scriva";

var STATUS_COLORS: Record<string, string> = {
  idea: "var(--color-text-muted)",
  draft: "#5b9bd5",
  revision: "#d4a843",
  final: "#6ab04c",
};

function StatusDot(props: { status: string }) {
  return (
    <span
      style={{
        width: 6,
        height: 6,
        borderRadius: "50%",
        backgroundColor: STATUS_COLORS[props.status] || "var(--color-text-muted)",
        flexShrink: 0,
      }}
    />
  );
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    || "chapter";
}

export default function ManuscriptPanel() {
  var router = useRouter();
  var currentBook = useAppStore(function selectBook(s) { return s.editor.currentBook; });
  var [config, setConfig] = useState<BookConfig | null>(null);
  var [expandedParts, setExpandedParts] = useState<Record<number, boolean>>({});
  var [expandFront, setExpandFront] = useState(false);
  var [expandBack, setExpandBack] = useState(false);
  var [adding, setAdding] = useState(false);
  var [newTitle, setNewTitle] = useState("");
  var [addingToPartIndex, setAddingToPartIndex] = useState(-1);
  var inputRef = useRef<HTMLInputElement>(null);
  var [saving, setSaving] = useState(false);

  useEffect(function loadConfig() {
    var cfg = getBookConfig(currentBook);
    setConfig(cfg);
    if (cfg && cfg.book.parts) {
      var ex: Record<number, boolean> = {};
      cfg.book.parts.forEach(function init(_, i) { ex[i] = true; });
      setExpandedParts(ex);
    }
  }, [currentBook]);

  useEffect(function focusInput() {
    if (adding && inputRef.current) inputRef.current.focus();
  }, [adding]);

  function handleFileClick(path: string) {
    router.push("/book/" + path);
  }

  function togglePart(index: number) {
    setExpandedParts(function toggle(prev) {
      return { ...prev, [index]: !prev[index] };
    });
  }

  function startAddChapter(partIndex: number) {
    setAdding(true);
    setAddingToPartIndex(partIndex);
    setNewTitle("");
  }

  function cancelAdd() {
    setAdding(false);
    setNewTitle("");
    setAddingToPartIndex(-1);
  }

  function handleAddChapter() {
    if (!config || !newTitle.trim() || saving) return;
    setSaving(true);

    var book = config.book;
    var slug = slugify(newTitle.trim());
    var filePath = (book.bookDir || "book") + "/" + slug + ".md";
    var chapterId = slug;

    var partIdx = addingToPartIndex;
    if (partIdx < 0 || partIdx >= book.parts.length) {
      if (book.parts.length === 0) {
        book = { ...book, parts: [{ title: "Part 1", chapters: [] }] };
        partIdx = 0;
      } else {
        partIdx = book.parts.length - 1;
      }
    }

    var newChapter: Chapter = {
      id: chapterId,
      file: filePath,
      label: newTitle.trim(),
    };

    var newParts = book.parts.map(function clonePart(p, i) {
      if (i === partIdx) {
        return { ...p, chapters: [...p.chapters, newChapter] };
      }
      return p;
    });

    var updatedBook: Book = { ...book, parts: newParts };
    var updatedConfig: BookConfig = { ...config, book: updatedBook };

    var bookJsonContent = JSON.stringify(updatedBook, null, 2);
    var chapterContent = "# " + newTitle.trim() + "\n\n";

    Promise.all([
      window.fetch("/api/github/files", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner: config.owner,
          repo: config.repo,
          path: "book.json",
          content: bookJsonContent,
          message: "Add chapter: " + newTitle.trim(),
          branch: config.branch,
        }),
      }),
      window.fetch("/api/github/files", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner: config.owner,
          repo: config.repo,
          path: filePath,
          content: chapterContent,
          message: "Create chapter: " + newTitle.trim(),
          branch: config.branch,
        }),
      }),
    ])
      .then(function done() {
        saveBookConfig(updatedConfig);
        setConfig(updatedConfig);
        cancelAdd();
      })
      .catch(function err() {
        saveBookConfig(updatedConfig);
        setConfig(updatedConfig);
        cancelAdd();
      })
      .finally(function fin() { setSaving(false); });
  }

  function handleAddPart() {
    if (!config || saving) return;
    var book = config.book;
    var newPartTitle = "Part " + (book.parts.length + 1);
    var newParts = [...book.parts, { title: newPartTitle, chapters: [] }];
    var updatedConfig: BookConfig = { ...config, book: { ...book, parts: newParts } };

    saveBookConfig(updatedConfig);
    setConfig(updatedConfig);
    setExpandedParts(function expand(prev) { return { ...prev, [newParts.length - 1]: true }; });

    window.fetch("/api/github/files", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        owner: config.owner,
        repo: config.repo,
        path: "book.json",
        content: JSON.stringify(updatedConfig.book, null, 2),
        message: "Add part: " + newPartTitle,
        branch: config.branch,
      }),
    }).catch(function ignore() {});
  }

  if (!currentBook || !config) {
    return (
      <div style={{ padding: 16, textAlign: "center", color: "var(--color-text-muted)", fontSize: 12 }}>
        Select a book from your shelf
      </div>
    );
  }

  var book = config.book;
  var frontMatter = book.frontMatter || [];
  var backMatter = book.backMatter || [];

  return (
    <div style={{ fontFamily: "var(--font-inter), system-ui, sans-serif", fontSize: 12 }}>
      <div style={{ maxHeight: 500, overflowY: "auto" }}>
        {frontMatter.length > 0 && (
          <div>
            <button
              onClick={function toggle() { setExpandFront(!expandFront); }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                width: "100%",
                padding: "5px 8px 5px 12px",
                border: "none",
                background: "transparent",
                cursor: "pointer",
                fontSize: 11,
                fontWeight: 600,
                color: "var(--color-text-muted)",
                fontFamily: "inherit",
                textAlign: "left",
              }}
            >
              <ChevronRight
                size={10}
                style={{
                  transform: expandFront ? "rotate(90deg)" : "rotate(0deg)",
                  transition: "transform 150ms ease",
                }}
              />
              Front Matter
            </button>
            {expandFront && frontMatter.map(function renderFM(m, i) {
              return (
                <div
                  key={"fm-" + i}
                  onClick={function click() { if (m.file) handleFileClick(m.file); }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "4px 8px 4px 28px",
                    cursor: m.file ? "pointer" : "default",
                    color: "var(--color-text-muted)",
                    fontSize: 11,
                    borderRadius: 3,
                    margin: "0 4px",
                    transition: "background 100ms",
                  }}
                  onMouseEnter={function enter(e) { if (m.file) e.currentTarget.style.backgroundColor = "var(--color-surface-hover)"; }}
                  onMouseLeave={function leave(e) { e.currentTarget.style.backgroundColor = "transparent"; }}
                >
                  <FileText size={11} strokeWidth={1.5} />
                  {m.title}
                </div>
              );
            })}
          </div>
        )}

        {book.parts.map(function renderPart(part, pIdx) {
          var isExpanded = expandedParts[pIdx] !== false;
          return (
            <div key={"part-" + pIdx}>
              {book.parts.length > 1 && (
                <button
                  onClick={function toggle() { togglePart(pIdx); }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    width: "100%",
                    padding: "5px 8px 5px 12px",
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    fontSize: 11,
                    fontWeight: 600,
                    color: "var(--color-text)",
                    fontFamily: "inherit",
                    textAlign: "left",
                  }}
                >
                  <ChevronRight
                    size={10}
                    style={{
                      transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
                      transition: "transform 150ms ease",
                    }}
                  />
                  {part.title}
                  <span style={{ fontSize: 10, color: "var(--color-text-muted)", fontWeight: 400, marginLeft: 4 }}>
                    {part.chapters.length}
                  </span>
                </button>
              )}

              {isExpanded && part.chapters.map(function renderCh(ch, cIdx) {
                var globalNum = 0;
                for (var pi = 0; pi < pIdx; pi++) globalNum += book.parts[pi].chapters.length;
                globalNum += cIdx + 1;

                return (
                  <div
                    key={ch.id}
                    onClick={function click() { handleFileClick(ch.file || ch.id); }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      padding: "5px 8px 5px " + (book.parts.length > 1 ? 28 : 12) + "px",
                      cursor: "pointer",
                      borderRadius: 3,
                      margin: "0 4px",
                      transition: "background 100ms",
                    }}
                    onMouseEnter={function enter(e) { e.currentTarget.style.backgroundColor = "var(--color-surface-hover)"; }}
                    onMouseLeave={function leave(e) { e.currentTarget.style.backgroundColor = "transparent"; }}
                  >
                    <span style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 18,
                      height: 18,
                      borderRadius: 3,
                      backgroundColor: "color-mix(in srgb, var(--color-accent) 10%, transparent)",
                      color: "var(--color-text-muted)",
                      fontSize: 9,
                      fontWeight: 600,
                      flexShrink: 0,
                    }}>
                      {globalNum}
                    </span>
                    <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--color-text)" }}>
                      {ch.label}
                    </span>
                    <StatusDot status="draft" />
                  </div>
                );
              })}

              {isExpanded && adding && addingToPartIndex === pIdx && (
                <div style={{ padding: "4px 8px 4px " + (book.parts.length > 1 ? 28 : 12) + "px", display: "flex", gap: 4, alignItems: "center" }}>
                  <input
                    ref={inputRef}
                    type="text"
                    value={newTitle}
                    onChange={function change(e) { setNewTitle(e.target.value); }}
                    onKeyDown={function key(e) {
                      if (e.key === "Enter") handleAddChapter();
                      if (e.key === "Escape") cancelAdd();
                    }}
                    placeholder="Chapter title..."
                    style={{
                      flex: 1,
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
                  <button
                    onClick={handleAddChapter}
                    disabled={saving || !newTitle.trim()}
                    style={{
                      fontSize: 10,
                      padding: "3px 8px",
                      border: "none",
                      borderRadius: 4,
                      backgroundColor: "var(--color-accent)",
                      color: "#fff",
                      cursor: saving ? "default" : "pointer",
                      fontFamily: "inherit",
                      opacity: saving || !newTitle.trim() ? 0.5 : 1,
                    }}
                  >
                    {saving ? "..." : "Add"}
                  </button>
                </div>
              )}

              {isExpanded && (
                <button
                  onClick={function add() { startAddChapter(pIdx); }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "4px 8px 4px " + (book.parts.length > 1 ? 28 : 12) + "px",
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    fontSize: 11,
                    color: "var(--color-text-muted)",
                    fontFamily: "inherit",
                    width: "100%",
                    textAlign: "left",
                    transition: "color 150ms",
                  }}
                  onMouseEnter={function enter(e) { e.currentTarget.style.color = "var(--color-accent)"; }}
                  onMouseLeave={function leave(e) { e.currentTarget.style.color = "var(--color-text-muted)"; }}
                >
                  <Plus size={11} />
                  Add Chapter
                </button>
              )}
            </div>
          );
        })}

        {backMatter.length > 0 && (
          <div>
            <button
              onClick={function toggle() { setExpandBack(!expandBack); }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                width: "100%",
                padding: "5px 8px 5px 12px",
                border: "none",
                background: "transparent",
                cursor: "pointer",
                fontSize: 11,
                fontWeight: 600,
                color: "var(--color-text-muted)",
                fontFamily: "inherit",
                textAlign: "left",
              }}
            >
              <ChevronRight
                size={10}
                style={{
                  transform: expandBack ? "rotate(90deg)" : "rotate(0deg)",
                  transition: "transform 150ms ease",
                }}
              />
              Back Matter
            </button>
            {expandBack && backMatter.map(function renderBM(m, i) {
              return (
                <div
                  key={"bm-" + i}
                  onClick={function click() { if (m.file) handleFileClick(m.file); }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "4px 8px 4px 28px",
                    cursor: m.file ? "pointer" : "default",
                    color: "var(--color-text-muted)",
                    fontSize: 11,
                    borderRadius: 3,
                    margin: "0 4px",
                    transition: "background 100ms",
                  }}
                  onMouseEnter={function enter(e) { if (m.file) e.currentTarget.style.backgroundColor = "var(--color-surface-hover)"; }}
                  onMouseLeave={function leave(e) { e.currentTarget.style.backgroundColor = "transparent"; }}
                >
                  <FileText size={11} strokeWidth={1.5} />
                  {m.title}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ padding: "6px 8px", borderTop: "1px solid var(--color-border)" }}>
        <button
          onClick={handleAddPart}
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
          Add Part
        </button>
      </div>
    </div>
  );
}
