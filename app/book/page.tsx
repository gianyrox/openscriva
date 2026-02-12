"use client";

import { useState, useEffect } from "react";
import { useAppStore } from "@/store";
import { BookOpen, FolderPlus, FileText, Loader2, CheckCircle } from "lucide-react";

interface TreeItem {
  path: string;
  type: string;
}

type OnboardState = "loading" | "has-structure" | "empty-repo" | "has-markdown" | "setting-up" | "done";

export default function BookPage() {
  const keysStored = useAppStore(function selectKeys(s) {
    return s.preferences.keysStored;
  });

  const [onboardState, setOnboardState] = useState<OnboardState>("loading");
  const [mdFiles, setMdFiles] = useState<string[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [bookData, setBookData] = useState<{ full_name: string; default_branch: string } | null>(null);

  useEffect(function loadRepoTree() {
    const raw = localStorage.getItem("scriva-current-book");
    if (!raw || !keysStored) {
      setOnboardState("has-structure");
      return;
    }

    let parsed: { full_name: string; default_branch: string };
    try {
      parsed = JSON.parse(raw);
    } catch {
      setOnboardState("has-structure");
      return;
    }

    setBookData(parsed);
    const [owner, repo] = parsed.full_name.split("/");

    fetch(
      "/api/github/tree?owner=" + owner + "&repo=" + repo + "&branch=" + parsed.default_branch,
    )
      .then(function handleRes(res) {
        return res.json();
      })
      .then(function handleData(data) {
        if (!data.tree || data.tree.length === 0) {
          setOnboardState("empty-repo");
          return;
        }

        const files = data.tree
          .filter(function isBlob(item: TreeItem) {
            return item.type === "blob";
          })
          .map(function getPath(item: TreeItem) {
            return item.path;
          });

        const hasBookDir = files.some(function inBook(f: string) {
          return f.startsWith("book/") && f.endsWith(".md");
        });

        if (hasBookDir) {
          setOnboardState("has-structure");
          return;
        }

        const markdownFiles = files.filter(function isMd(f: string) {
          return f.endsWith(".md") && f !== "README.md";
        });

        if (markdownFiles.length > 0) {
          setMdFiles(markdownFiles);
          setSelectedFiles(new Set(markdownFiles));
          setOnboardState("has-markdown");
        } else {
          setOnboardState("empty-repo");
        }
      })
      .catch(function handleErr() {
        setOnboardState("has-structure");
      });
  }, [keysStored]);

  function handleSetupStructure() {
    if (!bookData || !keysStored) return;

    setOnboardState("setting-up");
    const [owner, repo] = bookData.full_name.split("/");

    const filesToCreate = [
      { path: "book/prologue.md", content: "# Prologue\n\nBegin your story here.\n" },
      { path: "context/.gitkeep", content: "" },
      { path: "book.json", content: JSON.stringify({ title: repo, author: "", bookDir: "book", contextDir: "context" }, null, 2) + "\n" },
    ];

    let chain = Promise.resolve();

    for (const file of filesToCreate) {
      chain = chain.then(function createFile() {
        return fetch("/api/github/files", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            owner: owner,
            repo: repo,
            path: file.path,
            content: file.content,
            branch: bookData.default_branch,
            message: "Set up book structure: " + file.path,
          }),
        }).then(function ignore() {
          return;
        });
      });
    }

    chain
      .then(function onDone() {
        setOnboardState("done");
        setTimeout(function reload() {
          window.location.reload();
        }, 1200);
      })
      .catch(function onErr() {
        setOnboardState("empty-repo");
      });
  }

  function handleUseExistingFiles() {
    if (!bookData || !keysStored || selectedFiles.size === 0) return;

    setOnboardState("setting-up");
    const [owner, repo] = bookData.full_name.split("/");

    const chapters = Array.from(selectedFiles).map(function toChapter(f, i) {
      const name = f.split("/").pop()!.replace(/\.md$/, "");
      return { id: "ch-" + String(i + 1).padStart(2, "0"), file: f, label: name };
    });

    const bookJson = JSON.stringify({
      title: repo,
      author: "",
      bookDir: ".",
      contextDir: "context",
      parts: [{ title: "Main", chapters: chapters }],
    }, null, 2) + "\n";

    fetch("/api/github/files", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        owner: owner,
        repo: repo,
        path: "book.json",
        content: bookJson,
        branch: bookData.default_branch,
        message: "Add book.json with existing markdown files as chapters",
      }),
    })
      .then(function onDone() {
        setOnboardState("done");
        setTimeout(function reload() {
          window.location.reload();
        }, 1200);
      })
      .catch(function onErr() {
        setOnboardState("has-markdown");
      });
  }

  function toggleFileSelection(file: string) {
    setSelectedFiles(function update(prev) {
      const next = new Set(prev);
      if (next.has(file)) {
        next.delete(file);
      } else {
        next.add(file);
      }
      return next;
    });
  }

  if (onboardState === "has-structure") {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          padding: 48,
          backgroundColor: "var(--color-bg)",
        }}
      >
        <p
          style={{
            fontFamily: "var(--font-literata), Georgia, serif",
            fontSize: 16,
            color: "var(--color-text-muted)",
          }}
        >
          Select a chapter from the sidebar to begin writing.
        </p>
      </div>
    );
  }

  if (onboardState === "loading") {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          padding: 48,
          backgroundColor: "var(--color-bg)",
          gap: 10,
        }}
      >
        <Loader2 size={20} style={{ animation: "spin 1s linear infinite", color: "var(--color-text-muted)" }} />
        <p
          style={{
            fontFamily: "var(--font-inter), system-ui, sans-serif",
            fontSize: 14,
            color: "var(--color-text-muted)",
            margin: 0,
          }}
        >
          Checking repository structure...
        </p>
      </div>
    );
  }

  if (onboardState === "setting-up") {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          padding: 48,
          backgroundColor: "var(--color-bg)",
          gap: 10,
        }}
      >
        <Loader2 size={20} style={{ animation: "spin 1s linear infinite", color: "var(--color-accent)" }} />
        <p
          style={{
            fontFamily: "var(--font-inter), system-ui, sans-serif",
            fontSize: 14,
            color: "var(--color-text-muted)",
            margin: 0,
          }}
        >
          Setting up book structure...
        </p>
      </div>
    );
  }

  if (onboardState === "done") {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          padding: 48,
          backgroundColor: "var(--color-bg)",
          gap: 10,
        }}
      >
        <CheckCircle size={20} style={{ color: "var(--color-success)" }} />
        <p
          style={{
            fontFamily: "var(--font-inter), system-ui, sans-serif",
            fontSize: 14,
            color: "var(--color-text)",
            margin: 0,
          }}
        >
          Book structure created. Reloading...
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        padding: 48,
        backgroundColor: "var(--color-bg)",
      }}
    >
      <div
        style={{
          maxWidth: 520,
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 24,
          textAlign: "center",
        }}
      >
        <BookOpen size={40} strokeWidth={1} style={{ color: "var(--color-text-muted)", opacity: 0.5 }} />

        <div>
          <h2
            style={{
              fontFamily: "var(--font-literata), Georgia, serif",
              fontSize: 22,
              fontWeight: 600,
              color: "var(--color-text)",
              margin: "0 0 8px",
            }}
          >
            {"This repository doesn't have a book structure yet."}
          </h2>
          <p
            style={{
              fontFamily: "var(--font-inter), system-ui, sans-serif",
              fontSize: 14,
              color: "var(--color-text-muted)",
              margin: 0,
              lineHeight: 1.6,
            }}
          >
            {onboardState === "has-markdown"
              ? "We found some markdown files in the repository. You can use them as chapters or start fresh."
              : "Get started by setting up a book directory with your first chapter."}
          </p>
        </div>

        {onboardState === "has-markdown" && (
          <div
            style={{
              width: "100%",
              backgroundColor: "var(--color-surface)",
              borderRadius: 10,
              border: "1px solid var(--color-border)",
              padding: 16,
              textAlign: "left",
            }}
          >
            <p
              style={{
                fontFamily: "var(--font-inter), system-ui, sans-serif",
                fontSize: 13,
                fontWeight: 500,
                color: "var(--color-text)",
                margin: "0 0 10px",
              }}
            >
              Found {mdFiles.length} markdown {mdFiles.length === 1 ? "file" : "files"}:
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 180, overflowY: "auto" }}>
              {mdFiles.map(function renderFile(file) {
                const checked = selectedFiles.has(file);
                return (
                  <label
                    key={file}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "4px 8px",
                      borderRadius: 6,
                      cursor: "pointer",
                      fontSize: 13,
                      fontFamily: "var(--font-inter), system-ui, sans-serif",
                      color: checked ? "var(--color-text)" : "var(--color-text-muted)",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={function onToggle() {
                        toggleFileSelection(file);
                      }}
                      style={{ accentColor: "var(--color-accent)" }}
                    />
                    <FileText size={14} strokeWidth={1.5} style={{ flexShrink: 0 }} />
                    {file}
                  </label>
                );
              })}
            </div>

            <button
              onClick={handleUseExistingFiles}
              disabled={selectedFiles.size === 0}
              style={{
                marginTop: 12,
                width: "100%",
                fontFamily: "var(--font-inter), system-ui, sans-serif",
                fontSize: 14,
                fontWeight: 500,
                padding: "10px 20px",
                borderRadius: 8,
                border: "none",
                backgroundColor: selectedFiles.size > 0 ? "var(--color-accent)" : "var(--color-border)",
                color: "#ffffff",
                cursor: selectedFiles.size > 0 ? "pointer" : "default",
                transition: "background 150ms ease",
              }}
            >
              Use Selected Files as Chapters
            </button>
          </div>
        )}

        <div style={{ display: "flex", gap: 12, width: "100%" }}>
          <button
            onClick={handleSetupStructure}
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              fontFamily: "var(--font-inter), system-ui, sans-serif",
              fontSize: 14,
              fontWeight: 500,
              padding: "12px 20px",
              borderRadius: 8,
              border: onboardState === "has-markdown" ? "1px solid var(--color-border)" : "none",
              backgroundColor: onboardState === "has-markdown" ? "transparent" : "var(--color-accent)",
              color: onboardState === "has-markdown" ? "var(--color-text)" : "#ffffff",
              cursor: "pointer",
              transition: "background 150ms ease",
            }}
          >
            <FolderPlus size={16} />
            {onboardState === "has-markdown" ? "Start Fresh Instead" : "Set Up Book Structure"}
          </button>
        </div>
      </div>
    </div>
  );
}
