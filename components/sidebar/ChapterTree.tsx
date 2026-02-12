"use client";

import { FileText } from "lucide-react";
import type { Chapter } from "@/types";

interface ChapterTreeProps {
  chapters: Chapter[];
  currentChapter: string | undefined;
  onSelect: (chapterId: string) => void;
}

export default function ChapterTree({
  chapters,
  currentChapter,
  onSelect,
}: ChapterTreeProps) {
  if (chapters.length === 0) {
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
        Your shelf is empty. Start your first book.
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        padding: "4px 0",
        fontFamily: "var(--font-inter), system-ui, sans-serif",
        fontSize: 13,
      }}
    >
      {chapters.map(function renderChapter(chapter) {
        const active = currentChapter === chapter.id;

        return (
          <button
            key={chapter.id}
            onClick={function onChapterClick() {
              onSelect(chapter.id);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 16px",
              border: "none",
              background: active ? "var(--color-accent)" : "transparent",
              color: active ? "#ffffff" : "var(--color-text)",
              cursor: "pointer",
              textAlign: "left",
              fontFamily: "inherit",
              fontSize: "inherit",
              width: "100%",
              transition: "background 150ms ease",
              borderRadius: 0,
            }}
            onMouseEnter={function onEnter(e) {
              if (!active) {
                e.currentTarget.style.background = "var(--color-surface-hover)";
              }
            }}
            onMouseLeave={function onLeave(e) {
              if (!active) {
                e.currentTarget.style.background = "transparent";
              }
            }}
          >
            <FileText
              size={16}
              strokeWidth={1.5}
              style={{ flexShrink: 0, opacity: 0.7 }}
            />
            <span
              style={{
                flex: 1,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {chapter.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
