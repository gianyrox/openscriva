"use client";

import { useState, useEffect, useCallback } from "react";
import { BookOpen, FolderOpen, ListTree, FileText, Mic, Search, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store";
import type { PanelState, OutlineNode } from "@/types";
import BookPanel from "@/components/sidebar/BookPanel";
import FileExplorer from "@/components/sidebar/FileExplorer";
import OutlinePanel from "@/components/sidebar/OutlinePanel";
import ContextPanel from "@/components/sidebar/ContextPanel";
import VoicePanel from "@/components/sidebar/VoicePanel";
import FindPanel from "@/components/sidebar/FindPanel";
import { getItem, setItem } from "@/lib/storage";

const tabs: { key: PanelState["leftTab"]; label: string; icon: typeof BookOpen }[] = [
  { key: "book", label: "Book", icon: BookOpen },
  { key: "explorer", label: "Explorer", icon: FolderOpen },
  { key: "outline", label: "Outline", icon: ListTree },
  { key: "context", label: "Context", icon: FileText },
  { key: "voice", label: "Voice", icon: Mic },
  { key: "find", label: "Find", icon: Search },
];

export default function LeftSidebar() {
  const router = useRouter();
  const leftTab = useAppStore(function selectLeftTab(s) {
    return s.panels.leftTab;
  });
  const setLeftTab = useAppStore(function selectSetLeftTab(s) {
    return s.setLeftTab;
  });
  const currentBook = useAppStore(function selectBook(s) {
    return s.editor.currentBook;
  });

  const storageKey = currentBook
    ? "scriva-outline-" + currentBook
    : "scriva-outline-local";

  const [outline, setOutline] = useState<OutlineNode | null>(null);
  const [backHovered, setBackHovered] = useState(false);

  useEffect(function loadOutline() {
    const saved = getItem<OutlineNode | null>(storageKey, null);
    setOutline(saved);
  }, [storageKey]);

  const handleOutlineChange = useCallback(function handleChange(node: OutlineNode) {
    setOutline(node);
    setItem(storageKey, node);
  }, [storageKey]);

  const handleChapterSelect = useCallback(function handleSelect(chapterId: string) {
    router.push("/book/" + chapterId);
  }, [router]);

  function renderContent() {
    switch (leftTab) {
      case "book":
        return <BookPanel />;
      case "explorer":
        return <FileExplorer />;
      case "outline":
        return (
          <OutlinePanel
            outline={outline}
            onOutlineChange={handleOutlineChange}
            onChapterSelect={handleChapterSelect}
          />
        );
      case "context":
        return <ContextPanel />;
      case "voice":
        return <VoicePanel />;
      case "find":
        return <FindPanel />;
      default:
        return <FileExplorer />;
    }
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        fontFamily: "var(--font-inter), system-ui, sans-serif",
        fontSize: 13,
      }}
    >
      <div
        style={{
          padding: "12px 16px 8px",
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <button
          onClick={function onBackClick() {
            router.push("/shelf");
          }}
          onMouseEnter={function onEnter() {
            setBackHovered(true);
          }}
          onMouseLeave={function onLeave() {
            setBackHovered(false);
          }}
          title="Back to Shelf"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "none",
            background: "transparent",
            color: backHovered ? "var(--color-accent)" : "var(--color-text-muted)",
            cursor: "pointer",
            padding: 2,
            borderRadius: 4,
            transition: "color 150ms ease",
          }}
        >
          <ArrowLeft size={16} strokeWidth={1.5} />
        </button>
        <span
          style={{
            fontFamily: "var(--font-literata), Georgia, serif",
            fontStyle: "italic",
            fontSize: 14,
            color: "var(--color-accent)",
          }}
        >
          scriva
        </span>
      </div>

      <div
        style={{
          display: "flex",
          gap: 0,
          borderBottom: "1px solid var(--color-border)",
          padding: "0 4px",
          overflowX: "auto",
        }}
      >
        {tabs.map(function renderTab(tab) {
          const Icon = tab.icon;
          const active = leftTab === tab.key;

          return (
            <button
              key={tab.key}
              onClick={function onTabClick() {
                setLeftTab(tab.key);
              }}
              title={tab.label}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "8px 6px",
                border: "none",
                background: "transparent",
                color: active ? "var(--color-accent)" : "var(--color-text-muted)",
                fontSize: 11,
                fontFamily: "inherit",
                cursor: "pointer",
                borderBottom: active ? "2px solid var(--color-accent)" : "2px solid transparent",
                marginBottom: -1,
                transition: "color 150ms ease, border-color 150ms ease",
                flexShrink: 0,
              }}
              onMouseEnter={function onEnter(e) {
                if (!active) {
                  e.currentTarget.style.color = "var(--color-text)";
                }
              }}
              onMouseLeave={function onLeave(e) {
                if (!active) {
                  e.currentTarget.style.color = "var(--color-text-muted)";
                }
              }}
            >
              <Icon size={15} strokeWidth={1.5} />
            </button>
          );
        })}
      </div>

      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {renderContent()}
      </div>
    </div>
  );
}
