"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import type { Editor } from "@tiptap/react";
import { useAppStore } from "@/store";
import { getLocalDraft, setLocalDraft } from "@/lib/storage";
import { getRepoInfo } from "@/lib/bookConfig";
import TiptapEditor from "@/components/editor/TiptapEditor";
import EditorToolbar from "@/components/editor/EditorToolbar";
import FocusMode from "@/components/editor/FocusMode";
import PolishView from "@/components/editor/PolishView";
import ContinueWriting from "@/components/editor/ContinueWriting";
import SelectionToolbar from "@/components/editor/SelectionToolbar";
import InlineDiff from "@/components/editor/InlineDiff";
import { Loader2, StickyNote } from "lucide-react";

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

export default function FilePage() {
  const params = useParams();
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

  const [isPolishing, setIsPolishing] = useState(false);
  const [polishContent, setPolishContent] = useState("");
  const [isContinuing, setIsContinuing] = useState(false);
  const [continueText, setContinueText] = useState("");
  const [continueResult, setContinueResult] = useState<string | null>(null);

  const [selectedText, setSelectedText] = useState("");
  const [toolbarPosition, setToolbarPosition] = useState<{ top: number; left: number } | null>(null);
  const [inlineDiff, setInlineDiff] = useState<{ oldText: string; newText: string } | null>(null);

  const editorContainerRef = useRef<HTMLDivElement>(null);
  const selectionDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedSelectionRef = useRef<{ from: number; to: number } | null>(null);

  const [repoInfo, setRepoInfo] = useState<{ owner: string; repo: string; branch: string } | null>(null);

  useEffect(function loadRepoInfo() {
    const info = getRepoInfo();
    if (info) {
      setRepoInfo(info);
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

  useEffect(function trackChapter() {
    setChapter(filePath);
    return function cleanup() {
      setChapter(undefined);
    };
  }, [filePath, setChapter]);

  useEffect(function loadFile() {
    if (!keysStored || !repoInfo) return;

    if (isImageFile(filePath)) {
      setFileType("image");
      const url = "https://raw.githubusercontent.com/" + repoInfo.owner + "/" + repoInfo.repo + "/" + repoInfo.branch + "/" + filePath;
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

    const draft = getLocalDraft(repoInfo.owner + "/" + repoInfo.repo, filePath);
    if (draft !== null) {
      setInitialContent(draft);
      setMarkdownText(draft);
      setPlainText(draft);
      setLoading(false);
    }

    fetch(
      "/api/github/files?owner=" + repoInfo.owner + "&repo=" + repoInfo.repo + "&path=" + encodeURIComponent(filePath) + "&branch=" + repoInfo.branch,
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
        const content = data.content ?? "";
        if (draft === null) {
          setInitialContent(content);
          setMarkdownText(content);
          setPlainText(content);
        }
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
  }, [keysStored, repoInfo, filePath]);

  function saveToGitHub(content: string, retryCount?: number) {
    if (!repoInfo || !keysStored) return;

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
          branch: repoInfo!.branch,
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
              "/api/github/files?owner=" + repoInfo!.owner + "&repo=" + repoInfo!.repo + "&path=" + encodeURIComponent(filePath) + "&branch=" + repoInfo!.branch,
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
          setLocalDraft(repoInfo.owner + "/" + repoInfo.repo, filePath, md);
        }
        saveToGitHub(md);
      }, 500);
    },
    [repoInfo, filePath, setSaveStatus],
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
        setLocalDraft(repoInfo.owner + "/" + repoInfo.repo, filePath, text);
      }
      saveToGitHub(text);
    }, 500);
  }

  function handlePlainTextKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === "s") {
      e.preventDefault();
      if (repoInfo) {
        setLocalDraft(repoInfo.owner + "/" + repoInfo.repo, filePath, plainText);
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
          setLocalDraft(repoInfo.owner + "/" + repoInfo.repo, filePath, md);
        }
        saveToGitHub(md);
      }, 500);
    },
    [repoInfo, filePath, setSaveStatus],
  );

  const handleEditorReady = useCallback(function onEditor(ed: Editor | null) {
    setEditor(ed);
  }, []);

  const handlePolishComplete = useCallback(function polishDone(newContent: string) {
    setMarkdownText(newContent);
    if (repoInfo) {
      setLocalDraft(repoInfo.owner + "/" + repoInfo.repo, filePath, newContent);
    }
    setSaveStatus("saved");

    if (editor && !editor.isDestroyed) {
      editor.commands.setContent(newContent);
    }

    setIsPolishing(false);
    setPolishContent("");
    setInitialContent(newContent);
  }, [repoInfo, filePath, setSaveStatus, editor]);

  const handlePolishCancel = useCallback(function polishCancel() {
    setIsPolishing(false);
    setPolishContent("");
  }, []);

  const handleContinueAccept = useCallback(function continueAccept(newText: string) {
    const updated = markdownText + "\n\n" + newText;
    setMarkdownText(updated);
    if (repoInfo) {
      setLocalDraft(repoInfo.owner + "/" + repoInfo.repo, filePath, updated);
    }
    setSaveStatus("saved");

    if (editor && !editor.isDestroyed) {
      editor.commands.setContent(updated);
    }

    setIsContinuing(false);
    setContinueText("");
    setContinueResult(null);
    setInitialContent(updated);
  }, [markdownText, repoInfo, filePath, setSaveStatus, editor]);

  const handleContinueReject = useCallback(function continueReject() {
    setIsContinuing(false);
    setContinueText("");
    setContinueResult(null);
  }, []);

  const handleToolbarResult = useCallback(function toolbarResult(oldText: string, newText: string) {
    if (savedSelectionRef.current && editor && !editor.isDestroyed) {
      editor.chain().focus().setTextSelection(savedSelectionRef.current).unsetHighlight().run();
      savedSelectionRef.current = null;
    }
    setToolbarPosition(null);
    setSelectedText("");
    setInlineDiff({ oldText, newText });
  }, [editor]);

  const handleToolbarClose = useCallback(function toolbarClose() {
    if (savedSelectionRef.current && editor && !editor.isDestroyed) {
      editor.chain().focus().setTextSelection(savedSelectionRef.current).unsetHighlight().run();
      savedSelectionRef.current = null;
    }
    setToolbarPosition(null);
    setSelectedText("");
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

    if (savedSelectionRef.current && editor && !editor.isDestroyed) {
      editor.chain().focus().setTextSelection(savedSelectionRef.current).unsetHighlight().run();
      savedSelectionRef.current = null;
    }
    setToolbarPosition(null);
    setSelectedText("");
  }, [filePath, fileName, editor, currentBook]);

  const handleInlineDiffAccept = useCallback(function inlineAccept() {
    if (!inlineDiff || !editor || editor.isDestroyed) {
      setInlineDiff(null);
      return;
    }

    const currentMd = markdownText;
    const updated = currentMd.replace(inlineDiff.oldText, inlineDiff.newText);
    setMarkdownText(updated);
    if (repoInfo) {
      setLocalDraft(repoInfo.owner + "/" + repoInfo.repo, filePath, updated);
    }
    setSaveStatus("saved");
    editor.commands.setContent(updated);
    setInlineDiff(null);
    setInitialContent(updated);
  }, [inlineDiff, editor, markdownText, repoInfo, filePath, setSaveStatus]);

  const handleInlineDiffReject = useCallback(function inlineReject() {
    setInlineDiff(null);
  }, []);

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

  useEffect(function trackSelection() {
    if (!editor || editor.isDestroyed) return;

    function handleSelectionUpdate() {
      if (!editor || editor.isDestroyed) return;

      if (selectionDebounceRef.current) {
        clearTimeout(selectionDebounceRef.current);
        selectionDebounceRef.current = null;
      }

      const { from, to } = editor.state.selection;
      if (from === to) {
        if (savedSelectionRef.current && editor && !editor.isDestroyed) {
          editor.chain().setTextSelection(savedSelectionRef.current).unsetHighlight().setTextSelection(from).run();
          savedSelectionRef.current = null;
        }
        setSelectedText("");
        setToolbarPosition(null);
        return;
      }

      const text = editor.state.doc.textBetween(from, to, " ");
      if (text.trim().length < 10) {
        setSelectedText("");
        setToolbarPosition(null);
        return;
      }

      selectionDebounceRef.current = setTimeout(function showToolbar() {
        if (!editor || editor.isDestroyed) return;

        const currentSel = editor.state.selection;
        if (currentSel.from === currentSel.to) return;

        const currentText = editor.state.doc.textBetween(currentSel.from, currentSel.to, " ");
        if (currentText.trim().length < 10) return;

        setSelectedText(currentText);

        savedSelectionRef.current = { from: currentSel.from, to: currentSel.to };
        editor.chain().setTextSelection({ from: currentSel.from, to: currentSel.to }).setHighlight({ color: "rgba(184, 134, 11, 0.2)" }).run();

        const coords = editor.view.coordsAtPos(currentSel.from);
        const container = editorContainerRef.current;
        if (container) {
          const rect = container.getBoundingClientRect();
          setToolbarPosition({
            top: coords.top - rect.top,
            left: coords.left - rect.left,
          });
        }
      }, 600);
    }

    editor.on("selectionUpdate", handleSelectionUpdate);
    return function cleanup() {
      editor.off("selectionUpdate", handleSelectionUpdate);
      if (selectionDebounceRef.current) {
        clearTimeout(selectionDebounceRef.current);
      }
    };
  }, [editor]);

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
        <div style={{ flex: 1, overflow: "auto", display: "flex" }}>
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

      <div ref={editorContainerRef} style={{ flex: 1, overflowY: "auto", position: "relative" }}>
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

        {inlineDiff && (
          <div
            style={{
              maxWidth: 680,
              margin: "0 auto",
              padding: "0.5rem 2rem",
            }}
          >
            <InlineDiff
              oldText={inlineDiff.oldText}
              newText={inlineDiff.newText}
              onAccept={handleInlineDiffAccept}
              onReject={handleInlineDiffReject}
            />
          </div>
        )}

        {toolbarPosition && selectedText && !isPolishing && !isContinuing && editor && (
          <SelectionToolbar
            editor={editor}
            selectedText={selectedText}
            position={toolbarPosition}
            onAIResult={handleToolbarResult}
            onClose={handleToolbarClose}
            onAddNote={handleAddNote}
          />
        )}
      </div>

      <FocusMode>{editorContent}</FocusMode>
    </div>
  );
}
