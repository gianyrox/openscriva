"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store";

interface ShellLayoutProps {
  children: ReactNode;
  leftContent: ReactNode;
  rightContent: ReactNode;
  onToggleShortcuts?: () => void;
  onToggleSplitView?: () => void;
}

export default function ShellLayout({
  children,
  leftContent,
  rightContent,
  onToggleShortcuts,
  onToggleSplitView,
}: ShellLayoutProps) {
  const router = useRouter();
  const leftOpen = useAppStore(function selectLeftOpen(s) {
    return s.panels.leftOpen;
  });
  const rightOpen = useAppStore(function selectRightOpen(s) {
    return s.panels.rightOpen;
  });
  const isFocusMode = useAppStore(function selectFocusMode(s) {
    return s.editor.isFocusMode;
  });
  const toggleLeftPanel = useAppStore(function selectToggleLeft(s) {
    return s.toggleLeftPanel;
  });
  const toggleRightPanel = useAppStore(function selectToggleRight(s) {
    return s.toggleRightPanel;
  });
  const toggleFocusMode = useAppStore(function selectToggleFocus(s) {
    return s.toggleFocusMode;
  });

  useEffect(function registerKeyboardShortcuts() {
    function handleKeyDown(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey;
      const target = e.target as HTMLElement;
      const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;

      if (mod && e.key === "b") {
        e.preventDefault();
        toggleLeftPanel();
      }

      if (mod && e.key === "j") {
        e.preventDefault();
        toggleRightPanel();
      }

      if (mod && e.shiftKey && (e.key === "r" || e.key === "R")) {
        e.preventDefault();
        router.push("/book/galley");
      }

      if (e.key === "F11") {
        e.preventDefault();
        toggleFocusMode();
      }

      if (e.key === "?" && !isInput && onToggleShortcuts) {
        e.preventDefault();
        onToggleShortcuts();
      }

      if (mod && e.key === "\\" && onToggleSplitView) {
        e.preventDefault();
        onToggleSplitView();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return function cleanup() {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [toggleLeftPanel, toggleRightPanel, toggleFocusMode, router, onToggleShortcuts, onToggleSplitView]);

  const showLeft = leftOpen && !isFocusMode;
  const showRight = rightOpen && !isFocusMode;

  return (
    <div
      style={{
        display: "flex",
        height: isFocusMode ? "100vh" : "calc(100vh - 32px)",
        overflow: "hidden",
        backgroundColor: "var(--color-bg)",
      }}
    >
      <aside
        className="shell-left-panel"
        style={{
          width: showLeft ? 280 : 0,
          minWidth: 0,
          overflow: "hidden",
          transition: "width 200ms ease-out",
          borderRight: showLeft ? "1px solid var(--color-border)" : "none",
          backgroundColor: "var(--color-surface)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ width: 280, height: "100%", overflow: "hidden" }}>
          {leftContent}
        </div>
      </aside>

      <main
        style={{
          flex: 1,
          minWidth: 0,
          overflow: "auto",
          backgroundColor: "var(--color-bg)",
        }}
      >
        {children}
      </main>

      <aside
        className="shell-right-panel"
        style={{
          width: showRight ? 360 : 0,
          minWidth: 0,
          overflow: "hidden",
          transition: "width 200ms ease-out",
          borderLeft: showRight ? "1px solid var(--color-border)" : "none",
          backgroundColor: "var(--color-surface)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ width: 360, height: "100%", overflow: "hidden" }}>
          {rightContent}
        </div>
      </aside>
    </div>
  );
}
