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
  GitBranch,
  ArrowUpToLine,
  RefreshCw,
} from "lucide-react";
import { useAppStore } from "@/store";
import PublishPanel from "@/components/editor/PublishPanel";
import { getBookConfig } from "@/lib/bookConfig";
import { findOpenDraftPR, createDraftPR, syncDraftFromMain, compareBranches } from "@/lib/draftBranch";
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
  const [behindCount, setBehindCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [syncFailed, setSyncFailed] = useState(false);
  const [creatingNewDraft, setCreatingNewDraft] = useState(false);
  const [showNewDraftInput, setShowNewDraftInput] = useState(false);
  const [newDraftName, setNewDraftName] = useState("");
  const [newDraftError, setNewDraftError] = useState("");
  const [publishing, setPublishing] = useState(false);
  const syncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentBook = useAppStore(function selectCurrentBook(s) {
    return s.editor.currentBook;
  });
  const bookConfig = getBookConfig(currentBook);

  const draftBranch = useAppStore(function selectDraftBranch(s) {
    return s.editor.draftBranch;
  });
  const setDraftBranch = useAppStore(function selectSetDraftBranch(s) {
    return s.setDraftBranch;
  });
  const setMergeConflicts = useAppStore(function selectSetMergeConflicts(s) {
    return s.setMergeConflicts;
  });
  const setReviewPR = useAppStore(function selectSetReviewPR(s) {
    return s.setReviewPR;
  });
  const pendingAIEdits = useAppStore(function selectPendingAIEdits(s) {
    return s.pendingAIEdits;
  });
  const setShowAIEditReview = useAppStore(function selectSetShowAIEditReview(s) {
    return s.setShowAIEditReview;
  });

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
  const keysStored = useAppStore(function selectKeysStored(s) {
    return s.preferences.keysStored;
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

  useEffect(function checkBehindMain() {
    if (!bookConfig || !draftBranch || !keysStored) return;

    function check() {
      compareBranches(
        bookConfig!.owner,
        bookConfig!.repo,
        bookConfig!.branch,
        draftBranch!,
      )
        .then(function handleResult(data) {
          setBehindCount(data.behind_by);
        })
        .catch(function noop() {});
    }

    check();

    syncIntervalRef.current = setInterval(check, 60000);

    return function cleanup() {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [bookConfig, draftBranch, keysStored]);

  function handleSyncFromMain() {
    if (!bookConfig || !draftBranch || syncing) return;
    setSyncing(true);
    setSyncFailed(false);

    syncDraftFromMain(
      bookConfig.owner,
      bookConfig.repo,
      bookConfig.branch,
      draftBranch,
    )
      .then(function handleResult(result) {
        if (result.conflicts) {
          setSyncFailed(true);
          compareBranches(
            bookConfig!.owner,
            bookConfig!.repo,
            bookConfig!.branch,
            draftBranch!,
          )
            .then(function handleDiffs(data) {
              var conflicts = data.files
                .filter(function hasChanges(f) { return f.patch; })
                .map(function toConflict(f) {
                  return {
                    file: f.filename,
                    sections: [{
                      id: f.filename + "-0",
                      yours: "",
                      theirs: "",
                      context: f.patch ?? "",
                    }],
                  };
                });
              setMergeConflicts(conflicts);
            })
            .catch(function noop() {});
        } else {
          setBehindCount(0);
          setSyncFailed(false);
        }
      })
      .catch(function onErr() {
        setSyncFailed(true);
      })
      .finally(function done() {
        setSyncing(false);
      });
  }

  function handleNewDraft() {
    if (!bookConfig || creatingNewDraft) return;
    setShowNewDraftInput(true);
    setNewDraftError("");
    setNewDraftName("");
  }

  function handleCreateNewDraft() {
    if (!bookConfig || creatingNewDraft) return;

    var trimmed = newDraftName.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
    if (!trimmed) {
      setNewDraftError("Enter a name");
      return;
    }

    var branchName = "scriva/draft-" + trimmed;
    setCreatingNewDraft(true);
    setNewDraftError("");

    fetch("/api/github/branches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        owner: bookConfig.owner,
        repo: bookConfig.repo,
        name: branchName,
        from: bookConfig.branch,
      }),
    }).then(function handleRes(res) { return res.json(); }).then(function handleData(data) {
      if (data.error) {
        setNewDraftError(data.error);
      } else {
        setDraftBranch(branchName);
        setShowNewDraftInput(false);
        setNewDraftName("");
        setBehindCount(0);
        setSyncFailed(false);
        window.location.reload();
      }
    }).catch(function handleErr() {
      setNewDraftError("Failed to create branch");
    }).finally(function done() {
      setCreatingNewDraft(false);
    });
  }

  function handlePublishToMain() {
    if (!bookConfig || !draftBranch || publishing) return;
    setPublishing(true);

    findOpenDraftPR(bookConfig.owner, bookConfig.repo, draftBranch)
      .then(function handlePR(existingPR) {
        if (existingPR) {
          setReviewPR({
            number: existingPR.number,
            title: existingPR.title,
            body: existingPR.body,
            state: existingPR.state,
            user: existingPR.user,
            head: existingPR.head,
            base: existingPR.base,
            created_at: existingPR.created_at,
            changed_files: existingPR.changed_files,
          });
          setPublishing(false);
          return;
        }

        var title = bookConfig!.book?.title
          ? "Publish: " + bookConfig!.book.title
          : "Publish draft changes";

        createDraftPR(
          bookConfig!.owner,
          bookConfig!.repo,
          draftBranch!,
          bookConfig!.branch,
          title,
        )
          .then(function openPR(pr) {
            setReviewPR({
              number: pr.number,
              title: title,
              body: "Auto-created by Scriva. Merges draft changes into " + bookConfig!.branch + ".",
              state: "open",
              user: { login: "you" },
              head: { ref: draftBranch! },
              base: { ref: bookConfig!.branch },
              created_at: new Date().toISOString(),
              changed_files: 0,
            });
          })
          .catch(function noop() {})
          .finally(function done() {
            setPublishing(false);
          });
      })
      .catch(function noop() {
        setPublishing(false);
      });
  }

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
        {draftBranch ? (
          <span
            style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
            title={"Saving to branch: " + draftBranch}
          >
            <GitBranch size={12} strokeWidth={1.5} />
            {draftBranch}
          </span>
        ) : (
          <span>Draft</span>
        )}
        <SaveIndicator status={saveStatus} />
        {draftBranch && bookConfig && behindCount > 0 && !syncFailed && (
          <button
            onClick={handleSyncFromMain}
            disabled={syncing}
            title={"Main has " + behindCount + " new commit" + (behindCount === 1 ? "" : "s") + " — click to sync"}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "2px 8px",
              borderRadius: 4,
              border: "1px solid var(--color-accent)",
              background: "transparent",
              color: "var(--color-accent)",
              cursor: syncing ? "wait" : "pointer",
              fontSize: 11,
              fontFamily: "inherit",
              opacity: syncing ? 0.6 : 1,
              transition: "background 150ms ease",
            }}
            onMouseEnter={function onEnter(e) {
              if (!syncing) e.currentTarget.style.background = "color-mix(in srgb, var(--color-accent) 10%, transparent)";
            }}
            onMouseLeave={function onLeave(e) {
              e.currentTarget.style.background = "transparent";
            }}
          >
            {syncing ? (
              <Loader2 size={11} strokeWidth={1.5} style={{ animation: "spin 1s linear infinite" }} />
            ) : (
              <RefreshCw size={11} strokeWidth={1.5} />
            )}
            {syncing ? "Syncing..." : "Sync (" + behindCount + ")"}
          </button>
        )}
        {bookConfig && !showNewDraftInput && (
          <button
            onClick={handleNewDraft}
            title="Create a new draft branch from main"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "2px 8px",
              borderRadius: 4,
              border: syncFailed ? "1px solid var(--color-warning, #f59e0b)" : "1px solid var(--color-border)",
              background: "transparent",
              color: syncFailed ? "var(--color-warning, #f59e0b)" : "var(--color-text-muted)",
              cursor: "pointer",
              fontSize: 11,
              fontFamily: "inherit",
              transition: "background 150ms ease",
            }}
            onMouseEnter={function onEnter(e) {
              e.currentTarget.style.background = "var(--color-surface-hover)";
            }}
            onMouseLeave={function onLeave(e) {
              e.currentTarget.style.background = "transparent";
            }}
          >
            <GitBranch size={11} strokeWidth={1.5} />
            New Draft
          </button>
        )}
        {showNewDraftInput && (
          <div style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <span style={{ fontSize: 11, color: "var(--color-text-muted)", flexShrink: 0 }}>scriva/draft-</span>
            <input
              type="text"
              value={newDraftName}
              onChange={function onChange(e) { setNewDraftName(e.target.value); setNewDraftError(""); }}
              onKeyDown={function onKey(e) {
                if (e.key === "Enter") handleCreateNewDraft();
                if (e.key === "Escape") { setShowNewDraftInput(false); setNewDraftError(""); }
              }}
              placeholder="my-revision"
              autoFocus
              style={{
                fontSize: 11,
                padding: "1px 6px",
                borderRadius: 3,
                border: newDraftError ? "1px solid var(--color-error)" : "1px solid var(--color-border)",
                backgroundColor: "var(--color-bg)",
                color: "var(--color-text)",
                outline: "none",
                fontFamily: "inherit",
                width: 110,
              }}
            />
            <button
              onClick={handleCreateNewDraft}
              disabled={creatingNewDraft}
              style={{
                fontSize: 11,
                fontWeight: 500,
                padding: "1px 8px",
                borderRadius: 3,
                border: "none",
                backgroundColor: "var(--color-accent)",
                color: "#fff",
                cursor: creatingNewDraft ? "wait" : "pointer",
                opacity: creatingNewDraft ? 0.6 : 1,
                fontFamily: "inherit",
                flexShrink: 0,
              }}
            >
              {creatingNewDraft ? "..." : "Create"}
            </button>
            <button
              onClick={function onCancel() { setShowNewDraftInput(false); setNewDraftError(""); }}
              style={{
                fontSize: 11,
                padding: "1px 6px",
                borderRadius: 3,
                border: "1px solid var(--color-border)",
                background: "transparent",
                color: "var(--color-text-muted)",
                cursor: "pointer",
                fontFamily: "inherit",
                flexShrink: 0,
              }}
            >
              Cancel
            </button>
            {newDraftError && (
              <span style={{ fontSize: 10, color: "var(--color-error)", flexShrink: 0 }}>{newDraftError}</span>
            )}
          </div>
        )}
        {pendingAIEdits.filter(function f(e) { return e.status === "pending"; }).length > 0 && (
          <button
            onClick={function openAIReview() { setShowAIEditReview(true); }}
            title="Review pending AI edit suggestions"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "2px 8px",
              borderRadius: 4,
              border: "none",
              background: "var(--color-accent)",
              color: "#fff",
              cursor: "pointer",
              fontSize: 11,
              fontFamily: "inherit",
              transition: "opacity 150ms ease",
            }}
          >
            <Check size={11} strokeWidth={1.5} />
            Review AI Edits ({pendingAIEdits.filter(function f(e) { return e.status === "pending"; }).length})
          </button>
        )}
        {pendingAIEdits.filter(function f(e) { return e.status === "pending"; }).length === 0 && draftBranch && bookConfig && (
          <button
            onClick={handlePublishToMain}
            disabled={publishing}
            title="Review changes and merge draft into main"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "2px 8px",
              borderRadius: 4,
              border: "none",
              background: "var(--color-accent)",
              color: "#fff",
              cursor: publishing ? "wait" : "pointer",
              fontSize: 11,
              fontFamily: "inherit",
              opacity: publishing ? 0.6 : 1,
              transition: "opacity 150ms ease",
            }}
          >
            {publishing ? (
              <Loader2 size={11} strokeWidth={1.5} style={{ animation: "spin 1s linear infinite" }} />
            ) : (
              <ArrowUpToLine size={11} strokeWidth={1.5} />
            )}
            {publishing ? "Publishing..." : "Review & Publish"}
          </button>
        )}
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
