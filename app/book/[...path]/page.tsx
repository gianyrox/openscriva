"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { BubbleMenu, type Editor } from "@tiptap/react";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { useAppStore } from "@/store";
import { getLocalDraft, setLocalDraft, clearLocalDraft } from "@/lib/storage";
import { getRepoInfo } from "@/lib/bookConfig";
import { ensureDraftBranch } from "@/lib/draftBranch";
import TiptapEditor from "@/components/editor/TiptapEditor";
import EditorToolbar from "@/components/editor/EditorToolbar";
import FocusMode from "@/components/editor/FocusMode";
import PolishView from "@/components/editor/PolishView";
import ContinueWriting from "@/components/editor/ContinueWriting";
import SelectionToolbar from "@/components/editor/SelectionToolbar";
import MergeConflictEditor from "@/components/editor/MergeConflictEditor";
import MergeConflictView from "@/components/editor/MergeConflictView";
import type { MergeConflict } from "@/types";
import { Loader2 } from "lucide-react";

var noteHighlightKey = new PluginKey("noteHighlight");
var pendingNoteQuote: string | null = null;

function isImageFile(path: string): boolean {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  return ["png", "jpg", "jpeg", "gif", "svg", "webp"].includes(ext);
}

function isMarkdownFile(path: string): boolean {
  return path.endsWith(".md");
}

function isTextFile(path: string): boolean {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  return ["json", "txt", "py", "js", "ts", "tsx", "jsx", "csv", "yaml", "yml", "toml", "html", "css", "xml", "sh", "bash", "gitignore", "gitkeep"].includes(ext);
}

function getFileName(path: string): string {
  return path.split("/").pop() ?? path;
}

function findTextInDoc(doc: any, quote: string): { from: number; to: number } | null {
  var text = doc.textBetween(0, doc.content.size, "\n");
  var idx = text.indexOf(quote);
  if (idx === -1) {
    var shorter = quote.substring(0, 80);
    idx = text.indexOf(shorter);
    if (idx === -1) return null;
    return { from: idx + 1, to: idx + shorter.length + 1 };
  }
  return { from: idx + 1, to: idx + quote.length + 1 };
}

function scrollToQuoteInEditor(ed: Editor, quote: string) {
  var range = findTextInDoc(ed.state.doc, quote);
  if (!range) return;

  var plugin = noteHighlightKey.get(ed.state);
  if (!plugin) {
    var highlightPlugin = new Plugin({
      key: noteHighlightKey,
      state: {
        init: function init() { return DecorationSet.empty; },
        apply: function apply(tr, old) {
          var meta = tr.getMeta(noteHighlightKey);
          if (meta && meta.action === "show") {
            var deco = Decoration.inline(meta.from, meta.to, {
              class: "note-highlight",
            });
            return DecorationSet.create(tr.doc, [deco]);
          }
          if (meta && meta.action === "fade") {
            var set = old;
            var decos = set.find();
            if (decos.length > 0) {
              var fadeDeco = Decoration.inline(decos[0].from, decos[0].to, {
                class: "note-highlight-fade",
              });
              return DecorationSet.create(tr.doc, [fadeDeco]);
            }
            return DecorationSet.empty;
          }
          if (meta && meta.action === "hide") {
            return DecorationSet.empty;
          }
          return old.map(tr.mapping, tr.doc);
        },
      },
      props: {
        decorations: function decorations(state) {
          return noteHighlightKey.getState(state);
        },
      },
    });
    ed.registerPlugin(highlightPlugin);
  }

  ed.view.dispatch(
    ed.view.state.tr.setMeta(noteHighlightKey, { action: "show", from: range.from, to: range.to })
  );

  ed.commands.setTextSelection(range.from);

  setTimeout(function scrollIntoView() {
    var domAtPos = ed.view.domAtPos(range!.from);
    var node = domAtPos.node;
    if (node instanceof HTMLElement) {
      node.scrollIntoView({ behavior: "smooth", block: "center" });
    } else if (node.parentElement) {
      node.parentElement.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, 50);

  setTimeout(function fadeHighlight() {
    if (ed.isDestroyed) return;
    ed.view.dispatch(
      ed.view.state.tr.setMeta(noteHighlightKey, { action: "fade" })
    );
  }, 2000);

  setTimeout(function removeHighlight() {
    if (ed.isDestroyed) return;
    ed.view.dispatch(
      ed.view.state.tr.setMeta(noteHighlightKey, { action: "hide" })
    );
  }, 3000);
}

export default function FilePage() {
  const params = useParams();
  const router = useRouter();
  const pathSegments = params.path as string[];
  const filePath = pathSegments.join("/");
  const fileName = getFileName(filePath);

  const isMarkdownView = useAppStore(function selectMdView(s) {
    return s.editor.isMarkdownView;
  });
  const isFocusMode = useAppStore(function selectFocus(s) {
    return s.editor.isFocusMode;
  });
  const setChapter = useAppStore(function selectSetChapter(s) {
    return s.setChapter;
  });
  const setSaveStatus = useAppStore(function selectSetSave(s) {
    return s.setSaveStatus;
  });
  const keysStored = useAppStore(function selectKeys(s) {
    return s.preferences.keysStored;
  });
  const currentBook = useAppStore(function selectBook(s) {
    return s.editor.currentBook;
  });
  const storeDraftBranch = useAppStore(function selectDraftBranch(s) {
    return s.editor.draftBranch;
  });
  const setStoreDraftBranch = useAppStore(function selectSetDraftBranch(s) {
    return s.setDraftBranch;
  });
  const mergeConflicts = useAppStore(function selectMergeConflicts(s) {
    return s.mergeConflicts;
  });
  const setMergeConflicts = useAppStore(function selectSetMergeConflicts(s) {
    return s.setMergeConflicts;
  });

  const [splitConflict, setSplitConflict] = useState<MergeConflict | null>(null);
  const [mouseDown, setMouseDown] = useState(false);

  const [initialContent, setInitialContent] = useState<string | null>(null);
  const [markdownText, setMarkdownText] = useState("");
  const [plainText, setPlainText] = useState("");
  const [fileSha, setFileSha] = useState<string | undefined>(undefined);
  const shaRef = useRef<string | undefined>(undefined);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [fileType, setFileType] = useState<"markdown" | "text" | "image" | "binary">("binary");
  const [loading, setLoading] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cursorRestoredRef = useRef(false);

  const [isPolishing, setIsPolishing] = useState(false);
  const [polishContent, setPolishContent] = useState("");
  const [isContinuing, setIsContinuing] = useState(false);
  const [continueText, setContinueText] = useState("");
  const [continueResult, setContinueResult] = useState<string | null>(null);


  const [repoInfo, setRepoInfo] = useState<{ owner: string; repo: string; branch: string } | null>(null);
  const [draftBranch, setDraftBranch] = useState<string | undefined>(storeDraftBranch);

  var cursorStorageKey = "scriva:cursor:" + filePath;
  var scrollStorageKey = "scriva:scroll:" + filePath;

  function saveCursorPosition() {
    if (!editor || editor.isDestroyed) return;
    try {
      var pos = editor.state.selection.from;
      sessionStorage.setItem(cursorStorageKey, String(pos));
    } catch {}
  }

  function saveScrollPosition() {
    var container = scrollContainerRef.current;
    if (!container) return;
    try {
      sessionStorage.setItem(scrollStorageKey, String(container.scrollTop));
    } catch {}
  }

  function handleScroll() {
    if (scrollSaveRef.current) {
      clearTimeout(scrollSaveRef.current);
    }
    scrollSaveRef.current = setTimeout(function debouncedSave() {
      saveScrollPosition();
      saveCursorPosition();
    }, 300);
  }

  useEffect(function trackScrollAndCursor() {
    var container = scrollContainerRef.current;
    if (!container) return;
    container.addEventListener("scroll", handleScroll, { passive: true });
    return function cleanup() {
      container!.removeEventListener("scroll", handleScroll);
      if (scrollSaveRef.current) {
        clearTimeout(scrollSaveRef.current);
      }
      saveScrollPosition();
      saveCursorPosition();
    };
  });

  useEffect(function saveCursorOnSelectionChange() {
    if (!editor || editor.isDestroyed) return;
    function onSelectionUpdate() {
      try {
        var pos = editor!.state.selection.from;
        sessionStorage.setItem(cursorStorageKey, String(pos));
      } catch {}
    }
    editor.on("selectionUpdate", onSelectionUpdate);
    return function cleanup() {
      editor!.off("selectionUpdate", onSelectionUpdate);
    };
  }, [editor, cursorStorageKey]);

  useEffect(function restoreCursorAndScroll() {
    if (loading || !editor || editor.isDestroyed || cursorRestoredRef.current) return;
    cursorRestoredRef.current = true;

    try {
      var savedCursor = sessionStorage.getItem(cursorStorageKey);
      var savedScroll = sessionStorage.getItem(scrollStorageKey);

      if (savedCursor !== null) {
        var pos = Number(savedCursor);
        var docSize = editor.state.doc.content.size;
        if (pos >= 0 && pos <= docSize) {
          editor.commands.setTextSelection(pos);
        }
      }

      requestAnimationFrame(function restoreScroll() {
        var container = scrollContainerRef.current;
        if (container && savedScroll !== null) {
          container.scrollTop = Number(savedScroll);
        } else if (savedCursor !== null) {
          editor.commands.scrollIntoView();
        }
      });
    } catch {}
  }, [loading, editor, filePath]);

  useEffect(function resetRestoredFlag() {
    cursorRestoredRef.current = false;
  }, [filePath]);

  useEffect(function loadRepoInfo() {
    const info = getRepoInfo();
    if (info) {
      setRepoInfo(info);
      if (info.draftBranch) {
        setDraftBranch(info.draftBranch);
      }
      return;
    }
    const raw = localStorage.getItem("scriva-current-book");
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      const [owner, repo] = parsed.full_name.split("/");
      setRepoInfo({ owner, repo, branch: parsed.default_branch });
    } catch {}
  }, []);

  useEffect(function initDraftBranch() {
    if (!repoInfo || !keysStored) return;
    if (draftBranch) return;

    ensureDraftBranch(repoInfo.owner, repoInfo.repo, repoInfo.branch)
      .then(function onBranch(branchName) {
        setDraftBranch(branchName);
        setStoreDraftBranch(branchName);
      })
      .catch(function onErr() {});
  }, [repoInfo, keysStored, draftBranch, setStoreDraftBranch]);

  useEffect(function trackMouseDown() {
    function onDown() { setMouseDown(true); }
    function onUp() { setMouseDown(false); }
    window.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);
    return function cleanup() {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  useEffect(function trackChapter() {
    setChapter(filePath);
    return function cleanup() {
      setChapter(undefined);
    };
  }, [filePath, setChapter]);

  useEffect(function handleScrollToQuote() {
    function onScrollToQuote(e: Event) {
      var detail = (e as CustomEvent).detail;
      if (!detail) return;
      var noteFilePath = detail.filePath as string;
      var quote = detail.quote as string;
      if (!quote) return;

      if (noteFilePath && noteFilePath !== filePath) {
        pendingNoteQuote = quote;
        router.push("/book/" + noteFilePath);
        return;
      }

      if (editor && !editor.isDestroyed) {
        scrollToQuoteInEditor(editor, quote);
      }
    }

    window.addEventListener("scriva:scroll-to-quote", onScrollToQuote);
    return function cleanup() {
      window.removeEventListener("scriva:scroll-to-quote", onScrollToQuote);
    };
  }, [filePath, editor, router]);

  useEffect(function handlePendingQuote() {
    if (!pendingNoteQuote || !editor || editor.isDestroyed) return;
    var quote = pendingNoteQuote;
    pendingNoteQuote = null;
    setTimeout(function delayedScroll() {
      if (editor && !editor.isDestroyed) {
        scrollToQuoteInEditor(editor, quote);
      }
    }, 300);
  }, [editor, filePath]);

  useEffect(function loadFile() {
    if (!keysStored || !repoInfo) return;

    var loadBranch = draftBranch ?? repoInfo.branch;
    var repoKey = repoInfo.owner + "/" + repoInfo.repo;

    if (isImageFile(filePath)) {
      setFileType("image");
      const url = "https://raw.githubusercontent.com/" + repoInfo.owner + "/" + repoInfo.repo + "/" + loadBranch + "/" + filePath;
      setImageUrl(url);
      setLoading(false);
      return;
    }

    if (isMarkdownFile(filePath)) {
      setFileType("markdown");
    } else if (isTextFile(filePath)) {
      setFileType("text");
    } else {
      setFileType("binary");
    }

    var draft = getLocalDraft(repoKey, filePath, loadBranch);
    if (draft !== null) {
      setInitialContent(draft);
      setMarkdownText(draft);
      setPlainText(draft);
      setLoading(false);
    }

    fetch(
      "/api/github/files?owner=" + repoInfo.owner + "&repo=" + repoInfo.repo + "&path=" + encodeURIComponent(filePath) + "&branch=" + loadBranch,
    )
      .then(function handleRes(res) { return res.json(); })
      .then(function handleData(data) {
        if (data.error) {
          if (draft === null) {
            setInitialContent("");
            setMarkdownText("");
            setPlainText("");
          }
          return;
        }
        setFileSha(data.sha);
        shaRef.current = data.sha;
        var content = data.content ?? "";
        setInitialContent(content);
        setMarkdownText(content);
        setPlainText(content);
        clearLocalDraft(repoKey, filePath, loadBranch);
      })
      .catch(function handleErr() {
        if (draft === null) {
          setInitialContent("");
          setMarkdownText("");
          setPlainText("");
        }
      })
      .finally(function done() {
        setLoading(false);
      });
  }, [keysStored, repoInfo, filePath, draftBranch]);

  function saveToGitHub(content: string, retryCount?: number) {
    if (!repoInfo || !keysStored) return;

    var targetBranch = draftBranch ?? repoInfo.branch;

    if (saveDebounceRef.current) {
      clearTimeout(saveDebounceRef.current);
    }

    saveDebounceRef.current = setTimeout(function pushToGitHub() {
      fetch("/api/github/files", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          owner: repoInfo!.owner,
          repo: repoInfo!.repo,
          path: filePath,
          content: content,
          sha: shaRef.current,
          branch: targetBranch,
        }),
      })
        .then(function handleRes(res) { return res.json(); })
        .then(function handleData(data) {
          if (data.sha) {
            setFileSha(data.sha);
            shaRef.current = data.sha;
            setSaveStatus("saved");
          } else if (data.status === 409 && (!retryCount || retryCount < 2)) {
            fetch(
              "/api/github/files?owner=" + repoInfo!.owner + "&repo=" + repoInfo!.repo + "&path=" + encodeURIComponent(filePath) + "&branch=" + targetBranch,
            )
              .then(function refetchRes(res) { return res.json(); })
              .then(function refetchData(freshData) {
                if (freshData.sha) {
                  shaRef.current = freshData.sha;
                  setFileSha(freshData.sha);
                  saveToGitHub(content, (retryCount ?? 0) + 1);
                } else {
                  setSaveStatus("error");
                }
              })
              .catch(function refetchErr() {
                setSaveStatus("error");
              });
          } else {
            setSaveStatus("error");
          }
        })
        .catch(function handleErr() {
          setSaveStatus("error");
        });
    }, 5000);
  }

  const handleContentChange = useCallback(
    function handleChange(md: string) {
      setMarkdownText(md);
      setSaveStatus("saving");

      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      debounceRef.current = setTimeout(function saveAfterDelay() {
        if (repoInfo) {
          var saveBranch = draftBranch ?? repoInfo.branch;
          setLocalDraft(repoInfo.owner + "/" + repoInfo.repo, filePath, md, saveBranch);
        }
        saveToGitHub(md);
      }, 500);
    },
    [repoInfo, filePath, setSaveStatus, draftBranch],
  );

  function handlePlainTextChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const text = e.target.value;
    setPlainText(text);
    setSaveStatus("saving");

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(function saveAfterDelay() {
      if (repoInfo) {
        var saveBranch = draftBranch ?? repoInfo.branch;
        setLocalDraft(repoInfo.owner + "/" + repoInfo.repo, filePath, text, saveBranch);
      }
      saveToGitHub(text);
    }, 500);
  }

  function handlePlainTextKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === "s") {
      e.preventDefault();
      if (repoInfo) {
        var saveBranch = draftBranch ?? repoInfo.branch;
        setLocalDraft(repoInfo.owner + "/" + repoInfo.repo, filePath, plainText, saveBranch);
      }
      setSaveStatus("saving");
      saveToGitHub(plainText);
    }
  }

  const handleMarkdownTextarea = useCallback(
    function handleTextarea(e: React.ChangeEvent<HTMLTextAreaElement>) {
      const md = e.target.value;
      setMarkdownText(md);
      setSaveStatus("saving");

      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      debounceRef.current = setTimeout(function saveRawMd() {
        if (repoInfo) {
          var saveBranch = draftBranch ?? repoInfo.branch;
          setLocalDraft(repoInfo.owner + "/" + repoInfo.repo, filePath, md, saveBranch);
        }
        saveToGitHub(md);
      }, 500);
    },
    [repoInfo, filePath, setSaveStatus, draftBranch],
  );

  const handleEditorReady = useCallback(function onEditor(ed: Editor | null) {
    setEditor(ed);
  }, []);

  const handlePolishComplete = useCallback(function polishDone(newContent: string) {
    setMarkdownText(newContent);
    if (repoInfo) {
      var saveBranch = draftBranch ?? repoInfo.branch;
      setLocalDraft(repoInfo.owner + "/" + repoInfo.repo, filePath, newContent, saveBranch);
    }
    setSaveStatus("saved");

    if (editor && !editor.isDestroyed) {
      editor.commands.setContent(newContent);
    }

    setIsPolishing(false);
    setPolishContent("");
    setInitialContent(newContent);
  }, [repoInfo, filePath, setSaveStatus, editor, draftBranch]);

  const handlePolishCancel = useCallback(function polishCancel() {
    setIsPolishing(false);
    setPolishContent("");
  }, []);

  const handleContinueAccept = useCallback(function continueAccept(newText: string) {
    const updated = markdownText + "\n\n" + newText;
    setMarkdownText(updated);
    if (repoInfo) {
      var saveBranch = draftBranch ?? repoInfo.branch;
      setLocalDraft(repoInfo.owner + "/" + repoInfo.repo, filePath, updated, saveBranch);
    }
    setSaveStatus("saved");

    if (editor && !editor.isDestroyed) {
      editor.commands.setContent(updated);
    }

    setIsContinuing(false);
    setContinueText("");
    setContinueResult(null);
    setInitialContent(updated);
  }, [markdownText, repoInfo, filePath, setSaveStatus, editor, draftBranch]);

  const handleContinueReject = useCallback(function continueReject() {
    setIsContinuing(false);
    setContinueText("");
    setContinueResult(null);
  }, []);

  const handleToolbarClose = useCallback(function toolbarClose() {
    if (editor && !editor.isDestroyed) {
      editor.commands.setTextSelection(editor.state.selection.from);
    }
  }, [editor]);

  const handleAddNote = useCallback(function addNote(quote: string) {
    var repoKey = currentBook || "default";
    var key = "scriva:notes:" + repoKey;
    var existing = [];
    try {
      existing = JSON.parse(localStorage.getItem(key) || "[]");
    } catch {}

    var note = {
      id: "note-" + Date.now() + "-" + Math.random().toString(36).substr(2, 5),
      filePath: filePath,
      chapter: fileName,
      quote: quote.substring(0, 500),
      text: "",
      ts: Date.now(),
    };

    existing.push(note);
    localStorage.setItem(key, JSON.stringify(existing));
    window.dispatchEvent(new CustomEvent("scriva:notes-updated"));

    if (editor && !editor.isDestroyed) {
      editor.commands.setTextSelection(editor.state.selection.from);
    }
  }, [filePath, fileName, editor, currentBook]);


  useEffect(function registerShortcuts() {
    if (fileType !== "markdown") return;

    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "K") {
        e.preventDefault();
        if (isPolishing || isContinuing) return;

        const content = markdownText;
        if (!content.trim()) return;

        setPolishContent(content);
        setIsPolishing(true);
      }

      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "Enter") {
        e.preventDefault();
        if (isPolishing || isContinuing) return;

        let textBefore = markdownText;

        if (editor && !editor.isDestroyed) {
          const { from } = editor.state.selection;
          const docText = editor.storage.markdown.getMarkdown();
          const textContent = editor.state.doc.textBetween(0, from, "\n");
          if (textContent.trim()) {
            textBefore = textContent;
          } else {
            textBefore = docText;
          }
        }

        if (!textBefore.trim()) return;
        setContinueText(textBefore);
        setIsContinuing(true);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return function cleanup() {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [markdownText, editor, isPolishing, isContinuing, fileType]);

  function handleConflictsResolved(resolved: MergeConflict[]) {
    setMergeConflicts([]);
    setSplitConflict(null);

    if (!repoInfo || !draftBranch) return;

    resolved.forEach(function commitResolved(conflict) {
      var content = conflict.sections.map(function getContent(s) {
        return s.resolvedContent ?? s.context ?? "";
      }).join("\n");

      fetch("/api/github/files?owner=" + repoInfo!.owner + "&repo=" + repoInfo!.repo + "&path=" + encodeURIComponent(conflict.file) + "&branch=" + draftBranch, {})
        .then(function getRes(res) { return res.json(); })
        .then(function commitFile(data) {
          if (!data.sha) return;
          return fetch("/api/github/files", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              owner: repoInfo!.owner,
              repo: repoInfo!.repo,
              path: conflict.file,
              content: content,
              sha: data.sha,
              branch: draftBranch,
              message: "Resolve merge conflict in " + conflict.file,
            }),
          });
        })
        .catch(function noop() {});
    });
  }

  function handleConflictsCancel() {
    setMergeConflicts([]);
    setSplitConflict(null);
  }

  function handleOpenSplit(conflict: MergeConflict) {
    setSplitConflict(conflict);
  }

  function handleSplitResolved(resolved: MergeConflict) {
    setSplitConflict(null);
    var updated = mergeConflicts.map(function updateFile(c) {
      if (c.file === resolved.file) return resolved;
      return c;
    });
    setMergeConflicts(updated);
    var allDone = updated.every(function checkFile(c) {
      return c.sections.every(function checkSection(s) { return !!s.resolved; });
    });
    if (allDone) {
      handleConflictsResolved(updated);
    }
  }

  function handleSplitCancel() {
    setSplitConflict(null);
  }

  if (splitConflict) {
    return (
      <div style={{ height: "100%", backgroundColor: "var(--color-bg)" }}>
        <MergeConflictView
          conflict={splitConflict}
          onResolve={handleSplitResolved}
          onCancel={handleSplitCancel}
        />
      </div>
    );
  }

  if (mergeConflicts.length > 0) {
    return (
      <div style={{ height: "100%", backgroundColor: "var(--color-bg)" }}>
        <MergeConflictEditor
          conflicts={mergeConflicts}
          onResolve={handleConflictsResolved}
          onCancel={handleConflictsCancel}
          onOpenSplit={handleOpenSplit}
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          gap: 8,
          color: "var(--color-text-muted)",
          fontFamily: "var(--font-inter), system-ui, sans-serif",
          fontSize: 14,
        }}
      >
        <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
        Loading...
      </div>
    );
  }

  if (fileType === "image") {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
          backgroundColor: "var(--color-bg)",
        }}
      >
        <div
          style={{
            padding: "12px 24px",
            borderBottom: "1px solid var(--color-border)",
            fontFamily: "var(--font-inter), system-ui, sans-serif",
            fontSize: 13,
            color: "var(--color-text-muted)",
          }}
        >
          {filePath}
        </div>
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            overflow: "auto",
          }}
        >
          {imageUrl && (
            <img
              src={imageUrl}
              alt={fileName}
              style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
            />
          )}
        </div>
      </div>
    );
  }

  if (fileType === "binary") {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          backgroundColor: "var(--color-bg)",
          gap: 12,
          color: "var(--color-text-muted)",
          fontFamily: "var(--font-inter), system-ui, sans-serif",
          fontSize: 14,
        }}
      >
        <div
          style={{
            padding: "12px 24px",
            borderBottom: "1px solid var(--color-border)",
            width: "100%",
            fontSize: 13,
          }}
        >
          {filePath}
        </div>
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          This file type cannot be displayed.
        </div>
      </div>
    );
  }

  if (fileType === "text") {
    const lines = plainText.split("\n");
    const lineCount = lines.length;
    const gutterWidth = Math.max(String(lineCount).length * 9 + 16, 40);

    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
          backgroundColor: "var(--color-bg)",
        }}
      >
        <div
          style={{
            padding: "12px 24px",
            borderBottom: "1px solid var(--color-border)",
            fontFamily: "var(--font-inter), system-ui, sans-serif",
            fontSize: 13,
            color: "var(--color-text-muted)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span>{filePath}</span>
        </div>
        <div ref={scrollContainerRef} style={{ flex: 1, overflow: "auto", display: "flex" }}>
          <div
            style={{
              width: gutterWidth,
              flexShrink: 0,
              backgroundColor: "var(--color-surface)",
              borderRight: "1px solid var(--color-border)",
              padding: "16px 0",
              fontFamily: "var(--font-jetbrains-mono), monospace",
              fontSize: 15,
              lineHeight: "1.7",
              color: "var(--color-text-muted)",
              textAlign: "right",
              userSelect: "none",
            }}
          >
            {lines.map(function renderLineNum(_, i) {
              return (
                <div key={i} style={{ paddingRight: 8, height: "1.7em" }}>
                  {i + 1}
                </div>
              );
            })}
          </div>
          <textarea
            value={plainText}
            onChange={handlePlainTextChange}
            onKeyDown={handlePlainTextKeyDown}
            spellCheck={false}
            style={{
              flex: 1,
              backgroundColor: "transparent",
              color: "var(--color-text)",
              fontFamily: "var(--font-jetbrains-mono), monospace",
              fontSize: 15,
              lineHeight: "1.7",
              border: "none",
              outline: "none",
              resize: "none",
              padding: "16px 16px 16px 12px",
              margin: 0,
              whiteSpace: "pre",
              overflowWrap: "normal",
              overflowX: "auto",
            }}
          />
        </div>
      </div>
    );
  }

  if (initialContent === null) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          color: "var(--color-text-muted)",
          fontFamily: "var(--font-inter), system-ui, sans-serif",
          fontSize: 14,
        }}
      >
        Loading...
      </div>
    );
  }

  if (isPolishing) {
    return (
      <div style={{ height: "100%", backgroundColor: "var(--color-bg)" }}>
        <PolishView
          content={polishContent}
          onComplete={handlePolishComplete}
          onCancel={handlePolishCancel}
        />
      </div>
    );
  }

  const fileTitle = fileName.replace(/\.md$/, "").replace(/[-_]/g, " ").replace(/\b\w/g, function capitalize(c) {
    return c.toUpperCase();
  });

  const editorContent = isMarkdownView ? (
    <div
      style={{
        maxWidth: 680,
        margin: "0 auto",
        padding: "3rem 2rem 6rem",
      }}
    >
      <textarea
        value={markdownText}
        onChange={handleMarkdownTextarea}
        spellCheck={false}
        style={{
          width: "100%",
          minHeight: "calc(100vh - 200px)",
          backgroundColor: "transparent",
          color: "var(--color-text)",
          fontFamily: "var(--font-jetbrains-mono), monospace",
          fontSize: 15,
          lineHeight: 1.7,
          border: "none",
          outline: "none",
          resize: "none",
          padding: 0,
        }}
      />
    </div>
  ) : (
    <TiptapEditor
      initialContent={initialContent}
      onContentChange={handleContentChange}
      onEditor={handleEditorReady}
    />
  );

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        backgroundColor: "var(--color-bg)",
      }}
    >
      {!isFocusMode && <EditorToolbar editor={editor} />}

      {!isFocusMode && (
        <div
          style={{
            maxWidth: 680,
            margin: "0 auto",
            width: "100%",
            padding: "1.5rem 2rem 0",
          }}
        >
          <h1
            style={{
              fontFamily: "var(--font-literata), Georgia, serif",
              fontSize: 24,
              fontWeight: 700,
              color: "var(--color-text)",
              margin: 0,
              paddingBottom: "0.5rem",
              borderBottom: "1px solid var(--color-border)",
            }}
          >
            {fileTitle}
          </h1>
        </div>
      )}

      {!isPolishing && !isContinuing && editor && (
        <BubbleMenu
          editor={editor}
          updateDelay={200}
          shouldShow={function checkSelection({ state, from, to }) {
            if (mouseDown) return false;
            if (from === to) return false;
            var text = state.doc.textBetween(from, to, " ");
            return text.trim().length >= 10;
          }}
          tippyOptions={{
            placement: "top-start",
            duration: 0,
            maxWidth: "none",
            interactive: true,
          }}
        >
          <SelectionToolbar
            editor={editor}
            onClose={handleToolbarClose}
            onAddNote={handleAddNote}
          />
        </BubbleMenu>
      )}

      <div ref={scrollContainerRef} style={{ flex: 1, overflowY: "auto" }}>
        {editorContent}

        {isContinuing && (
          <div
            style={{
              maxWidth: 680,
              margin: "0 auto",
              padding: "0 2rem 2rem",
            }}
          >
            <ContinueWriting
              precedingText={continueText}
              onAccept={handleContinueAccept}
              onReject={handleContinueReject}
            />
          </div>
        )}

      </div>

      <FocusMode>{editorContent}</FocusMode>
    </div>
  );
}
