"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { Editor, Transforms, Node, Range, Text, Path, Point } from "slate";
import { ReactEditor } from "slate-react";
import { useAppStore } from "@/store";
import { getLocalDraft, setLocalDraft, clearLocalDraft } from "@/lib/storage";
import { getRepoInfo } from "@/lib/bookConfig";
import { ensureDraftBranch } from "@/lib/draftBranch";
import PlateEditor from "@/components/editor/PlateEditor";
import EditorToolbar from "@/components/editor/EditorToolbar";
import FocusMode from "@/components/editor/FocusMode";
import PolishView from "@/components/editor/PolishView";
import ContinueWriting from "@/components/editor/ContinueWriting";
import SelectionToolbar from "@/components/editor/SelectionToolbar";
import MergeConflictEditor from "@/components/editor/MergeConflictEditor";
import MergeConflictView from "@/components/editor/MergeConflictView";
import type { MergeConflict } from "@/types";
import type { SuggestionData } from "@/components/editor/extensions/inlineSuggestion";
import { Loader2 } from "lucide-react";

var pendingNoteQuote: string | null = null;

function isImageFile(path: string): boolean {
  var ext = path.split(".").pop()?.toLowerCase() ?? "";
  return ["png", "jpg", "jpeg", "gif", "svg", "webp"].includes(ext);
}

function isMarkdownFile(path: string): boolean {
  return path.endsWith(".md");
}

function isTextFile(path: string): boolean {
  var ext = path.split(".").pop()?.toLowerCase() ?? "";
  return ["json", "txt", "py", "js", "ts", "tsx", "jsx", "csv", "yaml", "yml", "toml", "html", "css", "xml", "sh", "bash", "gitignore", "gitkeep"].includes(ext);
}

function getFileName(path: string): string {
  return path.split("/").pop() ?? path;
}

function extractAllText(nodes: any[]): string {
  var result = "";
  for (var node of nodes) {
    if (node.text !== undefined) {
      result += node.text;
    }
    if (node.children) {
      result += extractAllText(node.children);
    }
  }
  return result;
}

function findTextInSlateEditor(editor: any, quote: string): Range | null {
  var allTexts: { text: string; path: number[] }[] = [];
  var textEntries = Array.from(Node.texts(editor));
  for (var i = 0; i < textEntries.length; i++) {
    var entry = textEntries[i];
    allTexts.push({ text: entry[0].text, path: [...entry[1]] });
  }

  var fullText = allTexts.map(function getText(t) { return t.text; }).join("");
  var idx = fullText.indexOf(quote);
  if (idx === -1) {
    var shorter = quote.substring(0, 80);
    idx = fullText.indexOf(shorter);
    if (idx === -1) return null;
    quote = shorter;
  }

  var anchorPoint: { path: number[]; offset: number } | null = null;
  var focusPoint: { path: number[]; offset: number } | null = null;
  var pos = 0;

  for (var t of allTexts) {
    var end = pos + t.text.length;
    if (!anchorPoint && idx < end) {
      anchorPoint = { path: t.path, offset: idx - pos };
    }
    if (!focusPoint && idx + quote.length <= end) {
      focusPoint = { path: t.path, offset: idx + quote.length - pos };
      break;
    }
    pos = end;
  }

  if (!anchorPoint || !focusPoint) return null;
  return { anchor: anchorPoint, focus: focusPoint } as Range;
}

function scrollToQuoteInEditor(editor: any, quote: string) {
  var range = findTextInSlateEditor(editor, quote);
  if (!range) return;

  try {
    Transforms.select(editor, range.anchor);
    var domRange = ReactEditor.toDOMRange(editor, range);
    var rect = domRange.getBoundingClientRect();
    var scrollContainer = document.querySelector("[data-scriva-scroll]");
    if (scrollContainer) {
      var containerRect = scrollContainer.getBoundingClientRect();
      var scrollTop = rect.top - containerRect.top + scrollContainer.scrollTop - containerRect.height / 2;
      scrollContainer.scrollTo({ top: scrollTop, behavior: "smooth" });
    }
  } catch {}
}

function setEditorMarkdownContent(editor: any, markdown: string) {
  try {
    var value = editor.api.markdown.deserialize(markdown);
    if (value && value.length > 0) {
      editor.children = value;
      editor.onChange();
    }
  } catch {}
}

export default function FilePage() {
  var params = useParams();
  var router = useRouter();
  var pathSegments = params.path as string[];
  var filePath = pathSegments.join("/");
  var fileName = getFileName(filePath);

  var isMarkdownView = useAppStore(function selectMdView(s) {
    return s.editor.isMarkdownView;
  });
  var isFocusMode = useAppStore(function selectFocus(s) {
    return s.editor.isFocusMode;
  });
  var setChapter = useAppStore(function selectSetChapter(s) {
    return s.setChapter;
  });
  var setSaveStatus = useAppStore(function selectSetSave(s) {
    return s.setSaveStatus;
  });
  var keysStored = useAppStore(function selectKeys(s) {
    return s.preferences.keysStored;
  });
  var currentBook = useAppStore(function selectBook(s) {
    return s.editor.currentBook;
  });
  var storeDraftBranch = useAppStore(function selectDraftBranch(s) {
    return s.editor.draftBranch;
  });
  var setStoreDraftBranch = useAppStore(function selectSetDraftBranch(s) {
    return s.setDraftBranch;
  });
  var mergeConflicts = useAppStore(function selectMergeConflicts(s) {
    return s.mergeConflicts;
  });
  var setMergeConflicts = useAppStore(function selectSetMergeConflicts(s) {
    return s.setMergeConflicts;
  });

  var [splitConflict, setSplitConflict] = useState<MergeConflict | null>(null);
  var [mouseDown, setMouseDown] = useState(false);
  var [showSelectionToolbar, setShowSelectionToolbar] = useState(false);

  var [initialContent, setInitialContent] = useState<string | null>(null);
  var [markdownText, setMarkdownText] = useState("");
  var [plainText, setPlainText] = useState("");
  var [fileSha, setFileSha] = useState<string | undefined>(undefined);
  var shaRef = useRef<string | undefined>(undefined);
  var [editor, setEditor] = useState<any | null>(null);
  var [imageUrl, setImageUrl] = useState<string | null>(null);
  var [fileType, setFileType] = useState<"markdown" | "text" | "image" | "binary">("binary");
  var [loading, setLoading] = useState(true);
  var debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  var saveDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  var scrollContainerRef = useRef<HTMLDivElement>(null);
  var scrollSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  var cursorRestoredRef = useRef(false);

  var [isPolishing, setIsPolishing] = useState(false);
  var [polishContent, setPolishContent] = useState("");
  var [isContinuing, setIsContinuing] = useState(false);
  var [continueText, setContinueText] = useState("");
  var [continueResult, setContinueResult] = useState<string | null>(null);
  var [suggestion, setSuggestion] = useState<SuggestionData | null>(null);

  var [repoInfo, setRepoInfo] = useState<{ owner: string; repo: string; branch: string } | null>(null);
  var [draftBranch, setDraftBranch] = useState<string | undefined>(storeDraftBranch);

  var cursorStorageKey = "scriva:cursor:" + filePath;
  var scrollStorageKey = "scriva:scroll:" + filePath;

  function saveCursorPosition() {
    if (!editor || !editor.selection) return;
    try {
      sessionStorage.setItem(cursorStorageKey, JSON.stringify(editor.selection));
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

  useEffect(function restoreCursorAndScroll() {
    if (loading || !editor || cursorRestoredRef.current) return;
    cursorRestoredRef.current = true;

    try {
      var savedCursor = sessionStorage.getItem(cursorStorageKey);
      var savedScroll = sessionStorage.getItem(scrollStorageKey);

      if (savedCursor !== null) {
        try {
          var sel = JSON.parse(savedCursor);
          if (sel && sel.anchor && sel.focus) {
            Transforms.select(editor, sel);
          }
        } catch {}
      }

      requestAnimationFrame(function restoreScroll() {
        var container = scrollContainerRef.current;
        if (container && savedScroll !== null) {
          container.scrollTop = Number(savedScroll);
        }
      });
    } catch {}
  }, [loading, editor, filePath]);

  useEffect(function resetRestoredFlag() {
    cursorRestoredRef.current = false;
  }, [filePath]);

  useEffect(function loadRepoInfo() {
    var info = getRepoInfo();
    if (info) {
      setRepoInfo(info);
      if (info.draftBranch) {
        setDraftBranch(info.draftBranch);
      }
      return;
    }
    var raw = localStorage.getItem("scriva-current-book");
    if (!raw) return;
    try {
      var parsed = JSON.parse(raw);
      var [owner, repo] = parsed.full_name.split("/");
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
    function onDown(e: MouseEvent) {
      if ((e.target as HTMLElement)?.closest?.("[data-selection-toolbar]")) return;
      setMouseDown(true);
      setShowSelectionToolbar(false);
    }
    function onUp() {
      setMouseDown(false);
      setTimeout(function checkSelection() {
        if (editor && editor.selection && !Range.isCollapsed(editor.selection)) {
          try {
            var text = Editor.string(editor, editor.selection);
            if (text.trim().length >= 10) {
              setShowSelectionToolbar(true);
            }
          } catch {}
        }
      }, 100);
    }
    window.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);
    return function cleanup() {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
    };
  }, [editor]);

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

      if (editor) {
        scrollToQuoteInEditor(editor, quote);
      }
    }

    window.addEventListener("scriva:scroll-to-quote", onScrollToQuote);
    return function cleanup() {
      window.removeEventListener("scriva:scroll-to-quote", onScrollToQuote);
    };
  }, [filePath, editor, router]);

  useEffect(function handlePendingQuote() {
    if (!pendingNoteQuote || !editor) return;
    var quote = pendingNoteQuote;
    pendingNoteQuote = null;
    setTimeout(function delayedScroll() {
      if (editor) {
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
      var url = "https://raw.githubusercontent.com/" + repoInfo.owner + "/" + repoInfo.repo + "/" + loadBranch + "/" + filePath;
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

  var handleContentChange = useCallback(
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
    var text = e.target.value;
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

  var handleMarkdownTextarea = useCallback(
    function handleTextarea(e: React.ChangeEvent<HTMLTextAreaElement>) {
      var md = e.target.value;
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

  var handleEditorReady = useCallback(function onEditor(ed: any) {
    setEditor(ed);
  }, []);

  var handlePolishComplete = useCallback(function polishDone(newContent: string) {
    setMarkdownText(newContent);
    if (repoInfo) {
      var saveBranch = draftBranch ?? repoInfo.branch;
      setLocalDraft(repoInfo.owner + "/" + repoInfo.repo, filePath, newContent, saveBranch);
    }
    setSaveStatus("saved");

    if (editor) {
      setEditorMarkdownContent(editor, newContent);
    }

    setIsPolishing(false);
    setPolishContent("");
    setInitialContent(newContent);
  }, [repoInfo, filePath, setSaveStatus, editor, draftBranch]);

  var handlePolishCancel = useCallback(function polishCancel() {
    setIsPolishing(false);
    setPolishContent("");
  }, []);

  var handleContinueAccept = useCallback(function continueAccept(newText: string) {
    var updated = markdownText + "\n\n" + newText;
    setMarkdownText(updated);
    if (repoInfo) {
      var saveBranch = draftBranch ?? repoInfo.branch;
      setLocalDraft(repoInfo.owner + "/" + repoInfo.repo, filePath, updated, saveBranch);
    }
    setSaveStatus("saved");

    if (editor) {
      setEditorMarkdownContent(editor, updated);
    }

    setIsContinuing(false);
    setContinueText("");
    setContinueResult(null);
    setInitialContent(updated);
  }, [markdownText, repoInfo, filePath, setSaveStatus, editor, draftBranch]);

  var handleContinueReject = useCallback(function continueReject() {
    setIsContinuing(false);
    setContinueText("");
    setContinueResult(null);
  }, []);

  var handleToolbarClose = useCallback(function toolbarClose() {
    setShowSelectionToolbar(false);
  }, []);

  var handleSuggestion = useCallback(function onSuggestion(data: SuggestionData) {
    if (!editor) return;
    setShowSelectionToolbar(false);
    try {
      var range = { anchor: data.anchor, focus: data.focus } as Range;
      var newNodes = editor.api.markdown.deserialize(data.suggested);
      if (!newNodes || newNodes.length === 0) return;
      for (var k = 0; k < newNodes.length; k++) {
        (newNodes[k] as any)._suggestion = true;
      }
      var originalBlocks = Array.from(
        Editor.nodes(editor, {
          at: range,
          match: function matchBlock(n: any) {
            return Editor.isBlock(editor, n);
          },
          mode: "highest",
        })
      );
      if (originalBlocks.length === 0) return;
      Editor.withoutNormalizing(editor, function batch() {
        for (var i = 0; i < originalBlocks.length; i++) {
          Transforms.setNodes(editor, { _suggestionOriginal: true } as any, { at: originalBlocks[i][1] });
        }
        var lastPath = originalBlocks[originalBlocks.length - 1][1];
        Transforms.insertNodes(editor, newNodes, { at: Path.next(lastPath) });
      });
      setSuggestion(data);
    } catch {}
  }, [editor]);

  var handleSuggestionAccept = useCallback(function acceptSuggestion() {
    if (!editor) return;
    try {
      var originals = Array.from(
        Editor.nodes(editor, {
          at: [],
          match: function matchOriginal(n: any) {
            return Editor.isBlock(editor, n) && (n as any)._suggestionOriginal === true;
          },
          mode: "highest",
        })
      );
      for (var i = originals.length - 1; i >= 0; i--) {
        Transforms.removeNodes(editor, { at: originals[i][1] });
      }
      var newBlocks = Array.from(
        Editor.nodes(editor, {
          at: [],
          match: function matchNew(n: any) {
            return Editor.isBlock(editor, n) && (n as any)._suggestion === true;
          },
          mode: "highest",
        })
      );
      for (var j = 0; j < newBlocks.length; j++) {
        Transforms.unsetNodes(editor, "_suggestion", { at: newBlocks[j][1] });
      }
    } catch {}
    setSuggestion(null);
  }, [editor]);

  var handleSuggestionReject = useCallback(function rejectSuggestion() {
    if (!editor) return;
    try {
      var newBlocks = Array.from(
        Editor.nodes(editor, {
          at: [],
          match: function matchNew(n: any) {
            return Editor.isBlock(editor, n) && (n as any)._suggestion === true;
          },
          mode: "highest",
        })
      );
      for (var i = newBlocks.length - 1; i >= 0; i--) {
        Transforms.removeNodes(editor, { at: newBlocks[i][1] });
      }
      var originals = Array.from(
        Editor.nodes(editor, {
          at: [],
          match: function matchOriginal(n: any) {
            return Editor.isBlock(editor, n) && (n as any)._suggestionOriginal === true;
          },
          mode: "highest",
        })
      );
      for (var j = 0; j < originals.length; j++) {
        Transforms.unsetNodes(editor, "_suggestionOriginal", { at: originals[j][1] });
      }
    } catch {}
    setSuggestion(null);
  }, [editor]);

  var handleAddNote = useCallback(function addNote(quote: string) {
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
    setShowSelectionToolbar(false);
  }, [filePath, fileName, currentBook]);


  useEffect(function registerShortcuts() {
    if (fileType !== "markdown") return;

    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "K") {
        e.preventDefault();
        if (isPolishing || isContinuing) return;

        var content = markdownText;
        if (!content.trim()) return;

        setPolishContent(content);
        setIsPolishing(true);
      }

      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "Enter") {
        e.preventDefault();
        if (isPolishing || isContinuing) return;

        var textBefore = markdownText;

        if (editor && editor.selection) {
          try {
            var md = editor.api.markdown.serialize();
            var allText = extractAllText(editor.children);
            var anchorOffset = 0;
            var found = false;
            var textEntries2 = Array.from(Node.texts(editor));
            for (var j = 0; j < textEntries2.length; j++) {
              var te = textEntries2[j];
              if (Path.equals(te[1], editor.selection.anchor.path)) {
                anchorOffset += editor.selection.anchor.offset;
                found = true;
                break;
              }
              anchorOffset += te[0].text.length;
            }
            if (found && anchorOffset > 0) {
              var beforeText = allText.substring(0, anchorOffset);
              if (beforeText.trim()) {
                textBefore = beforeText;
              } else {
                textBefore = md;
              }
            }
          } catch {
            textBefore = markdownText;
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
    var lines = plainText.split("\n");
    var lineCount = lines.length;
    var gutterWidth = Math.max(String(lineCount).length * 9 + 16, 40);

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

  var fileTitle = fileName.replace(/\.md$/, "").replace(/[-_]/g, " ").replace(/\b\w/g, function capitalize(c) {
    return c.toUpperCase();
  });

  var editorContent = isMarkdownView ? (
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
    <PlateEditor
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

      <div ref={scrollContainerRef} data-scriva-scroll style={{ flex: 1, overflowY: "auto", position: "relative" }}>
        {!isPolishing && !isContinuing && (showSelectionToolbar || suggestion) && editor && scrollContainerRef.current && (
          <SelectionToolbar
            editor={editor}
            scrollContainer={scrollContainerRef.current}
            onClose={handleToolbarClose}
            onAddNote={handleAddNote}
            onSuggestion={handleSuggestion}
            suggestion={suggestion}
            onAcceptSuggestion={handleSuggestionAccept}
            onRejectSuggestion={handleSuggestionReject}
          />
        )}
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
