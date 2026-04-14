"use client";

import { useState, useCallback, useEffect, useRef, type ReactNode } from "react";
import ShellLayout from "@/components/shell/ShellLayout";
import LeftSidebar from "@/components/sidebar/LeftSidebar";
import StatusBar from "@/components/shell/StatusBar";
import RightPanel from "@/components/rightpanel/RightPanel";
import KeyboardShortcuts from "@/components/shell/KeyboardShortcuts";
import PRReviewView from "@/components/collab/PRReviewView";
import AIEditReview from "@/components/editor/AIEditReview";
import BookSetupModal from "@/components/shell/BookSetupModal";
import TutorialOverlay from "@/components/shell/TutorialOverlay";
import { useAppStore } from "@/store";
import { getBookConfig, getScrivaConfig } from "@/lib/bookConfig";

export default function BookLayout({ children }: { children: ReactNode }) {
  var [shortcutsOpen, setShortcutsOpen] = useState(false);
  var [showTutorial, setShowTutorial] = useState(false);
  var [showBookSetup, setShowBookSetup] = useState(false);
  var [setupOwner, setSetupOwner] = useState("");
  var [setupRepo, setSetupRepo] = useState("");
  var [setupBranch, setSetupBranch] = useState("main");
  var checkedRef = useRef("");

  var reviewPR = useAppStore(function selectReviewPR(s) { return s.reviewPR; });
  var setReviewPR = useAppStore(function selectSetReviewPR(s) { return s.setReviewPR; });
  var showAIEditReview = useAppStore(function selectShowAIEdit(s) { return s.showAIEditReview; });
  var setShowAIEditReview = useAppStore(function selectSetShowAIEdit(s) { return s.setShowAIEditReview; });
  var currentBook = useAppStore(function selectBook(s) { return s.editor.currentBook; });
  var keysStored = useAppStore(function selectKeys(s) { return s.preferences.keysStored; });

  var bookConfig = getBookConfig(currentBook);

  useEffect(function checkBookSetup() {
    if (!keysStored || !currentBook) return;

    var cfg = getBookConfig(currentBook);
    if (!cfg || !cfg.owner || !cfg.repo) return;

    var owner = cfg.owner;
    var repo = cfg.repo;
    var branch = cfg.branch || "main";
    var checkKey = owner + "/" + repo + "/" + branch;

    if (checkedRef.current === checkKey) return;
    checkedRef.current = checkKey;

    var scrivaCfg = getScrivaConfig(currentBook);
    if (scrivaCfg) return;

    window.fetch("/api/github/files?owner=" + owner + "&repo=" + repo + "&path=.scriva/config.json&branch=" + branch)
      .then(function handleRes(res) {
        if (!res.ok) {
          setSetupOwner(owner);
          setSetupRepo(repo);
          setSetupBranch(branch);
          setShowBookSetup(true);
        }
      })
      .catch(function handleErr() {
        setSetupOwner(owner);
        setSetupRepo(repo);
        setSetupBranch(branch);
        setShowBookSetup(true);
      });
  }, [keysStored, currentBook]);

  useEffect(function checkTutorial() {
    if (showBookSetup) return;
    var done = localStorage.getItem("scriva-tutorial-done");
    if (!done || done !== "true") {
      setShowTutorial(true);
    }
  }, [showBookSetup]);

  function handleBookSetupComplete() {
    setShowBookSetup(false);
    var done = localStorage.getItem("scriva-tutorial-done");
    if (!done || done !== "true") {
      setShowTutorial(true);
    }
  }

  var handleToggleShortcuts = useCallback(function handleToggleShortcuts() {
    setShortcutsOpen(function toggle(prev) { return !prev; });
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
      {showBookSetup && setupOwner && setupRepo && (
        <BookSetupModal
          owner={setupOwner}
          repo={setupRepo}
          branch={setupBranch}
          onComplete={handleBookSetupComplete}
        />
      )}
      {showTutorial && !showBookSetup && (
        <TutorialOverlay
          onComplete={function handleTutorialDone() {
            setShowTutorial(false);
          }}
        />
      )}
    </div>
  );
}
