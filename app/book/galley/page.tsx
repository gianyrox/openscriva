"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronLeft, ChevronRight, BookOpen, FileText } from "lucide-react";
import { useAppStore } from "@/store";
import { getChapterPath } from "@/lib/book";
import { getBookConfig } from "@/lib/bookConfig";
import MarkdownRenderer from "@/components/shared/MarkdownRenderer";
import type { Book, Part, Chapter } from "@/types";

interface ChapterData {
  id: string;
  label: string;
  partTitle: string;
  content: string;
}

function flattenChapters(book: Book): { chapter: Chapter; partTitle: string }[] {
  const result: { chapter: Chapter; partTitle: string }[] = [];
  for (const part of book.parts) {
    for (const ch of part.chapters) {
      result.push({ chapter: ch, partTitle: part.title });
    }
  }
  return result;
}

function PartDivider({ title }: { title: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 24,
        margin: "4rem 0 3rem",
      }}
    >
      <div style={{ flex: 1, height: 1, backgroundColor: "var(--color-border)" }} />
      <span
        style={{
          fontFamily: "var(--font-literata), Georgia, serif",
          fontSize: 24,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          color: "var(--color-text-muted)",
          textAlign: "center",
          whiteSpace: "nowrap",
        }}
      >
        {title}
      </span>
      <div style={{ flex: 1, height: 1, backgroundColor: "var(--color-border)" }} />
    </div>
  );
}

export default function GalleyPage() {
  const router = useRouter();
  const preferences = useAppStore(function selectPrefs(s) {
    return s.preferences;
  });
  const currentBook = useAppStore(function selectBook(s) {
    return s.editor.currentBook;
  });

  const [book, setBook] = useState<Book | null>(null);
  const [chapters, setChapters] = useState<ChapterData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"full" | "single">("full");
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(function loadAllChapters() {
    async function fetchChapters() {
      try {
        setLoading(true);
        setError(null);

        const config = getBookConfig(currentBook);

        if (!config) {
          setError("No book configuration found. Open a book first.");
          setLoading(false);
          return;
        }

        const bookData = config.book;
        setBook(bookData);

        if (!preferences.keysStored) {
          setError("Keys not configured. Complete setup first.");
          setLoading(false);
          return;
        }

        const flat = flattenChapters(bookData);
        const loaded: ChapterData[] = [];

        for (const item of flat) {
          const path = getChapterPath(bookData, item.chapter.id);
          if (!path) continue;

          try {
            const res = await fetch(
              "/api/github/files?owner=" + config.owner + "&repo=" + config.repo + "&path=" + encodeURIComponent(path) + "&branch=" + config.branch,
            );
            const file = await res.json();
            loaded.push({
              id: item.chapter.id,
              label: item.chapter.label,
              partTitle: item.partTitle,
              content: file.content || "",
            });
          } catch {
            loaded.push({
              id: item.chapter.id,
              label: item.chapter.label,
              partTitle: item.partTitle,
              content: "*Could not load this chapter.*",
            });
          }
        }

        setChapters(loaded);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load chapters");
      } finally {
        setLoading(false);
      }
    }

    fetchChapters();
  }, [currentBook, preferences.keysStored]);

  function handleParagraphClick(chapterIndex: number) {
    const ch = viewMode === "single" ? chapters[currentIndex] : chapters[chapterIndex];
    if (ch) {
      router.push("/book/" + ch.id);
    }
  }

  function handleBack() {
    router.back();
  }

  function handlePrev() {
    setCurrentIndex(function prev(i) {
      return Math.max(0, i - 1);
    });
    window.scrollTo(0, 0);
  }

  function handleNext() {
    setCurrentIndex(function next(i) {
      return Math.min(chapters.length - 1, i + 1);
    });
    window.scrollTo(0, 0);
  }

  const handleChapterParagraphClick = useCallback(function handleClick(chapterIdx: number) {
    return function onParagraphClick() {
      const ch = chapters[chapterIdx];
      if (ch) {
        router.push("/book/" + ch.id);
      }
    };
  }, [chapters, router]);

  useEffect(function registerShortcuts() {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        router.back();
      }
      if (viewMode === "single") {
        if (e.key === "ArrowLeft") {
          handlePrev();
        }
        if (e.key === "ArrowRight") {
          handleNext();
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return function cleanup() {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [viewMode, chapters.length, router]);

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          backgroundColor: "var(--color-bg)",
          gap: 16,
        }}
      >
        <BookOpen
          size={40}
          strokeWidth={1}
          style={{
            color: "var(--color-accent)",
            animation: "spin 2s linear infinite",
          }}
        />
        <span
          style={{
            fontFamily: "var(--font-literata), Georgia, serif",
            fontSize: 16,
            color: "var(--color-text-muted)",
          }}
        >
          Preparing your reader…
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          backgroundColor: "var(--color-bg)",
          gap: 16,
          padding: "2rem",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-inter), system-ui, sans-serif",
            fontSize: 14,
            color: "var(--color-error)",
            textAlign: "center",
          }}
        >
          {error}
        </span>
        <button
          onClick={handleBack}
          style={{
            fontFamily: "var(--font-inter), system-ui, sans-serif",
            fontSize: 13,
            color: "var(--color-accent)",
            background: "none",
            border: "none",
            cursor: "pointer",
            textDecoration: "underline",
          }}
        >
          Go back
        </button>
      </div>
    );
  }

  function renderFullBook() {
    let lastPartTitle = "";
    return chapters.map(function renderChapter(ch, idx) {
      const showPartDivider = ch.partTitle !== lastPartTitle;
      lastPartTitle = ch.partTitle;

      return (
        <div key={ch.id}>
          {showPartDivider && <PartDivider title={ch.partTitle} />}
          <div style={{ marginBottom: "4rem" }}>
            <h2
              style={{
                fontFamily: "var(--font-literata), Georgia, serif",
                fontSize: 28,
                fontWeight: 700,
                marginBottom: "2rem",
                color: "var(--color-text)",
              }}
            >
              {ch.label}
            </h2>
            <MarkdownRenderer
              content={ch.content}
              onClick={handleChapterParagraphClick(idx)}
            />
          </div>
        </div>
      );
    });
  }

  function renderSingleChapter() {
    const ch = chapters[currentIndex];
    if (!ch) return null;

    return (
      <div>
        <PartDivider title={ch.partTitle} />
        <h2
          style={{
            fontFamily: "var(--font-literata), Georgia, serif",
            fontSize: 28,
            fontWeight: 700,
            marginBottom: "2rem",
            color: "var(--color-text)",
          }}
        >
          {ch.label}
        </h2>
        <MarkdownRenderer
          content={ch.content}
          onClick={function onParagraphClick() {
            router.push("/book/" + ch.id);
          }}
        />

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: "4rem",
            paddingTop: "2rem",
            borderTop: "1px solid var(--color-border)",
          }}
        >
          <button
            onClick={handlePrev}
            disabled={currentIndex === 0}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontFamily: "var(--font-inter), system-ui, sans-serif",
              fontSize: 14,
              color: currentIndex === 0 ? "var(--color-text-muted)" : "var(--color-accent)",
              background: "none",
              border: "none",
              cursor: currentIndex === 0 ? "default" : "pointer",
              opacity: currentIndex === 0 ? 0.5 : 1,
            }}
          >
            <ChevronLeft size={18} />
            Previous
          </button>
          <span
            style={{
              fontFamily: "var(--font-inter), system-ui, sans-serif",
              fontSize: 13,
              color: "var(--color-text-muted)",
            }}
          >
            {currentIndex + 1} of {chapters.length}
          </span>
          <button
            onClick={handleNext}
            disabled={currentIndex === chapters.length - 1}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontFamily: "var(--font-inter), system-ui, sans-serif",
              fontSize: 14,
              color:
                currentIndex === chapters.length - 1
                  ? "var(--color-text-muted)"
                  : "var(--color-accent)",
              background: "none",
              border: "none",
              cursor: currentIndex === chapters.length - 1 ? "default" : "pointer",
              opacity: currentIndex === chapters.length - 1 ? 0.5 : 1,
            }}
          >
            Next
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="galley-container"
      style={{
        minHeight: "100vh",
        backgroundColor: "var(--color-bg)",
      }}
    >
      <div
        className="galley-nav"
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          backgroundColor: "var(--color-bg)",
          borderBottom: "1px solid var(--color-border)",
          padding: "8px 2rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontFamily: "var(--font-inter), system-ui, sans-serif",
        }}
      >
        <button
          onClick={handleBack}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 13,
            color: "var(--color-text-muted)",
            background: "none",
            border: "none",
            cursor: "pointer",
            fontFamily: "inherit",
          }}
          onMouseEnter={function onEnter(e) {
            e.currentTarget.style.color = "var(--color-text)";
          }}
          onMouseLeave={function onLeave(e) {
            e.currentTarget.style.color = "var(--color-text-muted)";
          }}
        >
          <ArrowLeft size={16} />
          Back to editor
        </button>

        <span
          style={{
            fontFamily: "var(--font-literata), Georgia, serif",
            fontStyle: "italic",
            fontSize: 14,
            color: "var(--color-accent)",
          }}
        >
          reader
        </span>

        <div style={{ display: "flex", gap: 4 }}>
          <button
            onClick={function setFull() {
              setViewMode("full");
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: "4px 10px",
              borderRadius: 6,
              border: "1px solid var(--color-border)",
              fontSize: 12,
              fontFamily: "inherit",
              cursor: "pointer",
              backgroundColor: viewMode === "full" ? "var(--color-surface)" : "transparent",
              color: viewMode === "full" ? "var(--color-text)" : "var(--color-text-muted)",
            }}
          >
            <BookOpen size={14} />
            Full Book
          </button>
          <button
            onClick={function setSingle() {
              setViewMode("single");
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: "4px 10px",
              borderRadius: 6,
              border: "1px solid var(--color-border)",
              fontSize: 12,
              fontFamily: "inherit",
              cursor: "pointer",
              backgroundColor: viewMode === "single" ? "var(--color-surface)" : "transparent",
              color: viewMode === "single" ? "var(--color-text)" : "var(--color-text-muted)",
            }}
          >
            <FileText size={14} />
            Chapter
          </button>
        </div>
      </div>

      <div
        style={{
          maxWidth: 640,
          margin: "0 auto",
          padding: "4rem 2rem 8rem",
        }}
      >
        {book && (
          <div style={{ textAlign: "center", marginBottom: "3rem" }}>
            <h1
              style={{
                fontFamily: "var(--font-literata), Georgia, serif",
                fontSize: 36,
                fontWeight: 800,
                color: "var(--color-text)",
                marginBottom: "0.5rem",
              }}
            >
              {book.title}
            </h1>
            {book.subtitle && (
              <p
                style={{
                  fontFamily: "var(--font-literata), Georgia, serif",
                  fontSize: 20,
                  fontStyle: "italic",
                  color: "var(--color-text-muted)",
                  marginBottom: "0.5rem",
                }}
              >
                {book.subtitle}
              </p>
            )}
            <p
              style={{
                fontFamily: "var(--font-inter), system-ui, sans-serif",
                fontSize: 14,
                color: "var(--color-text-muted)",
                letterSpacing: "0.05em",
              }}
            >
              by {book.author}
            </p>
          </div>
        )}

        {viewMode === "full" ? renderFullBook() : renderSingleChapter()}
      </div>

      <style>{`
        @media print {
          .galley-nav {
            display: none !important;
          }
          .galley-container {
            background: white !important;
            color: black !important;
          }
        }
      `}</style>
    </div>
  );
}
