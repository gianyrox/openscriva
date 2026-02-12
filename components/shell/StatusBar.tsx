"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Check,
  CloudOff,
  AlertCircle,
  Maximize2,
  Sun,
  Moon,
  BookOpen,
  Upload,
  MessageSquare,
  Share2,
} from "lucide-react";
import { useAppStore } from "@/store";
import PublishPanel from "@/components/editor/PublishPanel";
import { getBookConfig } from "@/lib/bookConfig";
import type { SaveStatus } from "@/types";

function SaveIndicator({ status }: { status: SaveStatus }) {
  if (status === "idle") return null;

  if (status === "saving") {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
        <Loader2
          size={14}
          strokeWidth={1.5}
          style={{ animation: "spin 1s linear infinite" }}
        />
        Saving...
      </span>
    );
  }

  if (status === "saved") {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
        <Check size={14} strokeWidth={1.5} style={{ color: "var(--color-success)" }} />
        Saved
      </span>
    );
  }

  if (status === "offline") {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
        <CloudOff size={14} strokeWidth={1.5} />
        Offline (saved locally)
      </span>
    );
  }

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "var(--color-error)" }}>
      <AlertCircle size={14} strokeWidth={1.5} />
      Save failed
    </span>
  );
}

function formatWordCount(count: number | undefined): string {
  return (count ?? 0).toLocaleString() + " words";
}

export default function StatusBar() {
  const router = useRouter();
  const [publishOpen, setPublishOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  const currentBook = useAppStore(function selectCurrentBook(s) {
    return s.editor.currentBook;
  });
  const bookConfig = getBookConfig(currentBook);

  const wordCount = useAppStore(function selectWordCount(s) {
    return s.editor.wordCount;
  });
  const saveStatus = useAppStore(function selectSaveStatus(s) {
    return s.editor.saveStatus;
  });
  const currentChapter = useAppStore(function selectCurrentChapter(s) {
    return s.editor.currentChapter;
  });
  const isFocusMode = useAppStore(function selectFocusMode(s) {
    return s.editor.isFocusMode;
  });
  const toggleFocusMode = useAppStore(function selectToggleFocus(s) {
    return s.toggleFocusMode;
  });
  const theme = useAppStore(function selectTheme(s) {
    return s.preferences.theme;
  });
  const updatePreferences = useAppStore(function selectUpdatePrefs(s) {
    return s.updatePreferences;
  });
  const rightOpen = useAppStore(function selectRightOpen(s) {
    return s.panels.rightOpen;
  });
  const toggleRightPanel = useAppStore(function selectToggleRight(s) {
    return s.toggleRightPanel;
  });

  const dailyGoal = 1000;
  const todayKey = "scriva:wordcount:" + new Date().toISOString().slice(0, 10);
  const [dailyWords, setDailyWords] = useState(0);
  const prevWordCountRef = useRef(wordCount);

  useEffect(function loadDailyWords() {
    try {
      const stored = localStorage.getItem(todayKey);
      if (stored) setDailyWords(parseInt(stored, 10) || 0);
    } catch {}
  }, [todayKey]);

  useEffect(function trackWords() {
    const diff = wordCount - prevWordCountRef.current;
    prevWordCountRef.current = wordCount;
    if (diff > 0) {
      setDailyWords(function updateDaily(prev) {
        const next = prev + diff;
        try { localStorage.setItem(todayKey, String(next)); } catch {}
        return next;
      });
    }
  }, [wordCount, todayKey]);

  const goalProgress = Math.min(dailyWords / dailyGoal, 1);

  function handleThemeToggle() {
    const next = theme === "paper" ? "study" : "paper";
    document.documentElement.setAttribute("data-theme", next);
    updatePreferences({ theme: next });
  }

  function handleReader() {
    router.push("/book/galley");
  }

  function handlePublishOpen() {
    setPublishOpen(true);
  }

  function handlePublishClose() {
    setPublishOpen(false);
  }

  if (isFocusMode) return null;

  return (
    <div
      style={{
        height: 32,
        minHeight: 32,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        paddingLeft: 12,
        paddingRight: 12,
        backgroundColor: "var(--color-surface)",
        borderTop: "1px solid var(--color-border)",
        fontFamily: "var(--font-inter), system-ui, sans-serif",
        fontSize: 12,
        color: "var(--color-text-muted)",
        userSelect: "none",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <span>{formatWordCount(wordCount)}</span>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            color: goalProgress >= 1 ? "var(--color-success, #22c55e)" : "var(--color-text-muted)",
          }}
          title={dailyWords + " / " + dailyGoal + " daily goal"}
        >
          <span
            style={{
              width: 40,
              height: 4,
              borderRadius: 2,
              background: "var(--color-border)",
              overflow: "hidden",
              display: "inline-block",
            }}
          >
            <span
              style={{
                display: "block",
                width: (goalProgress * 100) + "%",
                height: "100%",
                borderRadius: 2,
                background: goalProgress >= 1 ? "var(--color-success, #22c55e)" : "var(--color-accent)",
                transition: "width 300ms ease",
              }}
            />
          </span>
          <span style={{ fontSize: 11 }}>{dailyWords}/{dailyGoal}</span>
        </span>
        {currentChapter && (
          <span
            style={{
              maxWidth: 200,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {currentChapter}
          </span>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span>Draft 1</span>
        <SaveIndicator status={saveStatus} />
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <button
          onClick={toggleRightPanel}
          title="Chat & AI panels (⌘J)"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 24,
            height: 24,
            borderRadius: 4,
            border: "none",
            background: rightOpen ? "var(--color-surface-hover)" : "transparent",
            color: "var(--color-text-muted)",
            cursor: "pointer",
            transition: "background 150ms ease",
          }}
          onMouseEnter={function onEnter(e) {
            e.currentTarget.style.background = "var(--color-surface-hover)";
          }}
          onMouseLeave={function onLeave(e) {
            e.currentTarget.style.background = rightOpen ? "var(--color-surface-hover)" : "transparent";
          }}
        >
          <MessageSquare size={16} strokeWidth={1.5} />
        </button>
        {bookConfig && (
          <button
            onClick={function onShareClick() {
              setShareOpen(!shareOpen);
            }}
            title="Share & Collaborate"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 24,
              height: 24,
              borderRadius: 4,
              border: "none",
              background: "transparent",
              color: "var(--color-text-muted)",
              cursor: "pointer",
              transition: "background 150ms ease",
            }}
            onMouseEnter={function onEnter(e) {
              e.currentTarget.style.background = "var(--color-surface-hover)";
            }}
            onMouseLeave={function onLeave(e) {
              e.currentTarget.style.background = "transparent";
            }}
          >
            <Share2 size={16} strokeWidth={1.5} />
          </button>
        )}
        <button
          onClick={handleReader}
          title="Reader preview (⌘⇧R)"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 24,
            height: 24,
            borderRadius: 4,
            border: "none",
            background: "transparent",
            color: "var(--color-text-muted)",
            cursor: "pointer",
            transition: "background 150ms ease",
          }}
          onMouseEnter={function onEnter(e) {
            e.currentTarget.style.background = "var(--color-surface-hover)";
          }}
          onMouseLeave={function onLeave(e) {
            e.currentTarget.style.background = "transparent";
          }}
        >
          <BookOpen size={16} strokeWidth={1.5} />
        </button>
        <button
          onClick={handlePublishOpen}
          title="Publish / Export"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 24,
            height: 24,
            borderRadius: 4,
            border: "none",
            background: "transparent",
            color: "var(--color-text-muted)",
            cursor: "pointer",
            transition: "background 150ms ease",
          }}
          onMouseEnter={function onEnter(e) {
            e.currentTarget.style.background = "var(--color-surface-hover)";
          }}
          onMouseLeave={function onLeave(e) {
            e.currentTarget.style.background = "transparent";
          }}
        >
          <Upload size={16} strokeWidth={1.5} />
        </button>
        <button
          onClick={toggleFocusMode}
          title="Focus mode (F11)"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 24,
            height: 24,
            borderRadius: 4,
            border: "none",
            background: "transparent",
            color: "var(--color-text-muted)",
            cursor: "pointer",
            transition: "background 150ms ease",
          }}
          onMouseEnter={function onEnter(e) {
            e.currentTarget.style.background = "var(--color-surface-hover)";
          }}
          onMouseLeave={function onLeave(e) {
            e.currentTarget.style.background = "transparent";
          }}
        >
          <Maximize2 size={16} strokeWidth={1.5} />
        </button>
        <button
          onClick={handleThemeToggle}
          title={theme === "paper" ? "Switch to dark theme" : "Switch to light theme"}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 24,
            height: 24,
            borderRadius: 4,
            border: "none",
            background: "transparent",
            color: "var(--color-text-muted)",
            cursor: "pointer",
            transition: "background 150ms ease",
          }}
          onMouseEnter={function onEnter(e) {
            e.currentTarget.style.background = "var(--color-surface-hover)";
          }}
          onMouseLeave={function onLeave(e) {
            e.currentTarget.style.background = "transparent";
          }}
        >
          {theme === "paper" ? (
            <Moon size={16} strokeWidth={1.5} />
          ) : (
            <Sun size={16} strokeWidth={1.5} />
          )}
        </button>
      </div>

      <PublishPanel open={publishOpen} onClose={handlePublishClose} />
    </div>
  );
}
