"use client";

import { useState, useCallback, type ReactNode } from "react";
import ShellLayout from "@/components/shell/ShellLayout";
import LeftSidebar from "@/components/sidebar/LeftSidebar";
import StatusBar from "@/components/shell/StatusBar";
import RightPanel from "@/components/rightpanel/RightPanel";
import KeyboardShortcuts from "@/components/shell/KeyboardShortcuts";
import PRReviewView from "@/components/collab/PRReviewView";
import { useAppStore } from "@/store";
import { getBookConfig } from "@/lib/bookConfig";

export default function BookLayout({ children }: { children: ReactNode }) {
  var [shortcutsOpen, setShortcutsOpen] = useState(false);

  var reviewPR = useAppStore(function selectReviewPR(s) {
    return s.reviewPR;
  });
  var setReviewPR = useAppStore(function selectSetReviewPR(s) {
    return s.setReviewPR;
  });
  var currentBook = useAppStore(function selectBook(s) {
    return s.editor.currentBook;
  });

  var bookConfig = getBookConfig(currentBook);

  var handleToggleShortcuts = useCallback(function handleToggleShortcuts() {
    setShortcutsOpen(function toggle(prev) {
      return !prev;
    });
  }, []);

  var handleCloseShortcuts = useCallback(function handleCloseShortcuts() {
    setShortcutsOpen(false);
  }, []);

  function handleClosePR() {
    setReviewPR(null);
  }

  function handlePRAction() {
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <ShellLayout
        leftContent={<LeftSidebar />}
        rightContent={<RightPanel />}
        onToggleShortcuts={handleToggleShortcuts}
      >
        {reviewPR && bookConfig ? (
          <PRReviewView
            pr={reviewPR}
            owner={bookConfig.owner}
            repo={bookConfig.repo}
            onAction={handlePRAction}
            onClose={handleClosePR}
          />
        ) : (
          children
        )}
      </ShellLayout>
      <div className="shell-status-bar">
        <StatusBar />
      </div>
      <KeyboardShortcuts open={shortcutsOpen} onClose={handleCloseShortcuts} />
    </div>
  );
}
