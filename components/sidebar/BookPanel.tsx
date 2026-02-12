"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, GripVertical, Plus } from "lucide-react";
import { useAppStore } from "@/store";
import { getBookConfig } from "@/lib/bookConfig";
import type { BookConfig, Chapter } from "@/types";

interface FlatChapter {
  partIndex: number;
  chapterIndex: number;
  partTitle: string;
  chapter: Chapter;
  wordCount?: number;
  status: "idea" | "draft" | "revision" | "final";
}

const STATUS_COLORS: Record<string, string> = {
  idea: "var(--color-text-muted)",
  draft: "#5b9bd5",
  revision: "#d4a843",
  final: "#6ab04c",
};

const STATUS_LABELS: Record<string, string> = {
  idea: "Idea",
  draft: "Draft",
  revision: "Revision",
  final: "Final",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        fontSize: 10,
        fontWeight: 500,
        color: STATUS_COLORS[status] || "var(--color-text-muted)",
        padding: "1px 5px",
        borderRadius: 3,
        backgroundColor: `color-mix(in srgb, ${STATUS_COLORS[status] || "var(--color-text-muted)"} 12%, transparent)`,
        lineHeight: 1.4,
        flexShrink: 0,
      }}
    >
      {STATUS_LABELS[status] || status}
    </span>
  );
}

export default function BookPanel() {
  const router = useRouter();
  const currentBook = useAppStore(function selectBook(s) {
    return s.editor.currentBook;
  });

  const [config, setConfig] = useState<BookConfig | null>(null);
  const [chapters, setChapters] = useState<FlatChapter[]>([]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const dragRef = useRef<number | null>(null);

  useEffect(function loadConfig() {
    const cfg = getBookConfig(currentBook);
    setConfig(cfg);

    if (!cfg || !cfg.book || !cfg.book.parts) {
      setChapters([]);
      return;
    }

    const flat: FlatChapter[] = [];
    cfg.book.parts.forEach(function processPart(part, pIdx) {
      part.chapters.forEach(function processChapter(ch, cIdx) {
        flat.push({
          partIndex: pIdx,
          chapterIndex: cIdx,
          partTitle: part.title,
          chapter: ch,
          status: "draft",
        });
      });
    });
    setChapters(flat);
  }, [currentBook]);

  function handleChapterClick(chapter: Chapter) {
    router.push("/book/" + chapter.id);
  }

  function handleDragStart(e: React.DragEvent, index: number) {
    dragRef.current = index;
    setDragIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(index));
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverIndex(index);
  }

  function handleDragLeave() {
    setDragOverIndex(null);
  }

  function handleDrop(e: React.DragEvent, toIndex: number) {
    e.preventDefault();
    const fromIndex = dragRef.current;

    if (fromIndex === null || fromIndex === toIndex) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }

    setChapters(function reorder(prev) {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });

    setDragIndex(null);
    setDragOverIndex(null);
    dragRef.current = null;
  }

  function handleDragEnd() {
    setDragIndex(null);
    setDragOverIndex(null);
    dragRef.current = null;
  }

  function handleAddChapter() {
    alert("Add Chapter — coming soon.");
  }

  if (!currentBook || !config) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          gap: 12,
          color: "var(--color-text-muted)",
          padding: 24,
          textAlign: "center",
          fontFamily: "var(--font-inter), system-ui, sans-serif",
          fontSize: 13,
        }}
      >
        <BookOpen size={32} strokeWidth={1} style={{ opacity: 0.5 }} />
        <span>Select a book from your shelf to get started</span>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        fontFamily: "var(--font-inter), system-ui, sans-serif",
        fontSize: 12,
      }}
    >
      <div
        style={{
          padding: "12px 16px",
          borderBottom: "1px solid var(--color-border)",
          fontSize: 12,
          fontWeight: 600,
          color: "var(--color-text-muted)",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}
      >
        {config.book.title || "Chapters"}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "4px 0" }}>
        {chapters.length === 0 ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 24,
              color: "var(--color-text-muted)",
              fontSize: 12,
              textAlign: "center",
            }}
          >
            No chapters yet. Add one below.
          </div>
        ) : (
          chapters.map(function renderChapter(item, index) {
            const isDragging = dragIndex === index;
            const isDragOver = dragOverIndex === index;

            return (
              <div
                key={item.chapter.id + "-" + index}
                draggable
                onDragStart={function handleStart(e) {
                  handleDragStart(e, index);
                }}
                onDragOver={function handleOver(e) {
                  handleDragOver(e, index);
                }}
                onDragLeave={handleDragLeave}
                onDrop={function handleDropHere(e) {
                  handleDrop(e, index);
                }}
                onDragEnd={handleDragEnd}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "6px 8px 6px 8px",
                  margin: "0 4px",
                  borderRadius: 4,
                  cursor: "pointer",
                  userSelect: "none",
                  opacity: isDragging ? 0.4 : 1,
                  borderTop: isDragOver ? "2px solid var(--color-accent)" : "2px solid transparent",
                  transition: "background 100ms, opacity 100ms",
                }}
                onClick={function handleClick() {
                  handleChapterClick(item.chapter);
                }}
                onMouseEnter={function handleEnter(e) {
                  e.currentTarget.style.backgroundColor = "var(--color-surface-hover)";
                }}
                onMouseLeave={function handleLeave(e) {
                  e.currentTarget.style.backgroundColor = "transparent";
                }}
              >
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    cursor: "grab",
                    color: "var(--color-text-muted)",
                    flexShrink: 0,
                    padding: "2px 0",
                  }}
                  onMouseDown={function handleGrab(e) {
                    e.stopPropagation();
                  }}
                >
                  <GripVertical size={12} />
                </span>

                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 20,
                    height: 20,
                    borderRadius: 4,
                    backgroundColor: "color-mix(in srgb, var(--color-accent) 10%, transparent)",
                    color: "var(--color-text-muted)",
                    fontSize: 10,
                    fontWeight: 600,
                    flexShrink: 0,
                  }}
                >
                  {index + 1}
                </span>

                <span
                  style={{
                    flex: 1,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    color: "var(--color-text)",
                    paddingLeft: 2,
                  }}
                >
                  {item.chapter.label}
                </span>

                <StatusBadge status={item.status} />

                {item.wordCount != null && item.wordCount > 0 && (
                  <span
                    style={{
                      fontSize: 10,
                      color: "var(--color-text-muted)",
                      flexShrink: 0,
                      marginLeft: 4,
                    }}
                  >
                    {item.wordCount.toLocaleString()}w
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>

      <div
        style={{
          borderTop: "1px solid var(--color-border)",
          padding: 8,
          flexShrink: 0,
        }}
      >
        <button
          onClick={handleAddChapter}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            width: "100%",
            padding: "6px 0",
            border: "1px dashed var(--color-border)",
            borderRadius: 6,
            background: "none",
            color: "var(--color-text-muted)",
            fontSize: 12,
            fontFamily: "inherit",
            cursor: "pointer",
            transition: "color 150ms, border-color 150ms",
          }}
          onMouseEnter={function handleEnter(e) {
            e.currentTarget.style.color = "var(--color-accent)";
            e.currentTarget.style.borderColor = "var(--color-accent)";
          }}
          onMouseLeave={function handleLeave(e) {
            e.currentTarget.style.color = "var(--color-text-muted)";
            e.currentTarget.style.borderColor = "var(--color-border)";
          }}
        >
          <Plus size={14} />
          Add Chapter
        </button>
      </div>
    </div>
  );
}
