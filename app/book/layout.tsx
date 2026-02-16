"use client";

import { useState, useCallback, type ReactNode } from "react";
import ShellLayout from "@/components/shell/ShellLayout";
import LeftSidebar from "@/components/sidebar/LeftSidebar";
import StatusBar from "@/components/shell/StatusBar";
import RightPanel from "@/components/rightpanel/RightPanel";
import KeyboardShortcuts from "@/components/shell/KeyboardShortcuts";
import PRReviewView from "@/components/collab/PRReviewView";
import AIEditReview from "@/components/editor/AIEditReview";
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
  var showAIEditReview = useAppStore(function selectShowAIEdit(s) {
    return s.showAIEditReview;
  });
  var setShowAIEditReview = useAppStore(function selectSetShowAIEdit(s) {
    return s.setShowAIEditReview;
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

  function handleCloseAIReview() {
    setShowAIEditReview(false);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <ShellLayout
        leftContent={<LeftSidebar />}
        rightContent={<RightPanel />}
        onToggleShortcuts={handleToggleShortcuts}
      >
        {showAIEditReview ? (
          <AIEditReview onClose={handleCloseAIReview} />
        ) : reviewPR && bookConfig ? (
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
