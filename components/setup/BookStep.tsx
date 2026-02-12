"use client";

import { useState, useEffect } from "react";
import {
  Check,
  AlertCircle,
  Loader2,
  ChevronRight,
  ChevronUp,
  BookOpen,
  FolderOpen,
  FileText,
  Plus,
} from "lucide-react";
import type { BookConfig } from "@/types";
import { parseBookStructure } from "@/lib/book";

interface Repo {
  name: string;
  full_name: string;
  description: string | null;
  private: boolean;
  default_branch: string;
}

interface BookStepProps {
  githubToken: string;
  onBookSelected: (config: BookConfig) => void;
}

export default function BookStep({
  githubToken,
  onBookSelected,
}: BookStepProps) {
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const [existingExpanded, setExistingExpanded] = useState(false);
  const [repos, setRepos] = useState<Repo[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [repoError, setRepoError] = useState("");

  const [selectedRepo, setSelectedRepo] = useState<Repo | null>(null);
  const [selectedBranch, setSelectedBranch] = useState("");

  const [detecting, setDetecting] = useState(false);
  const [detectedInfo, setDetectedInfo] = useState("");
  const [detectedConfig, setDetectedConfig] = useState<BookConfig | null>(null);

  function fetchRepos() {
    setLoadingRepos(true);
    setRepoError("");

    fetch("/api/github/repos", {
      headers: { "x-github-token": githubToken },
    })
      .then(function handleResponse(res) {
        return res.json();
      })
      .then(function handleData(data) {
        if (data.repos) {
          setRepos(data.repos);
        } else {
          setRepoError(data.error || "Failed to load repositories");
        }
      })
      .catch(function handleError() {
        setRepoError("Failed to load repositories");
      })
      .finally(function done() {
        setLoadingRepos(false);
      });
  }

  function handleExpandExisting() {
    const next = !existingExpanded;
    setExistingExpanded(next);
    if (next && repos.length === 0) {
      fetchRepos();
    }
  }

  function handleCreateNew() {
    if (!newTitle.trim() || creating) return;
    setCreating(true);
    setCreateError("");

    const repoName = newTitle
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-");

    fetch("/api/github/repos", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-github-token": githubToken,
      },
      body: JSON.stringify({
        name: repoName,
        title: newTitle.trim(),
        description: newDescription.trim() || undefined,
        private: true,
      }),
    })
      .then(function handleResponse(res) {
        if (!res.ok) throw new Error("Failed to create repository");
        return res.json();
      })
      .then(function handleCreated(repo) {
        setCreating(false);

        const existing = JSON.parse(localStorage.getItem("scriva-books") || "[]");
        existing.push({
          full_name: repo.full_name,
          name: repo.name,
          description: repo.description,
          private: repo.private,
          default_branch: repo.default_branch,
          added_at: new Date().toISOString(),
        });
        localStorage.setItem("scriva-books", JSON.stringify(existing));

        const config: BookConfig = {
          repo: repo.name,
          owner: repo.full_name.split("/")[0],
          branch: repo.default_branch,
          private: true,
          book: {
            title: newTitle.trim(),
            author: "",
            bookDir: "book",
            contextDir: "context",
            parts: [],
          },
        };
        onBookSelected(config);
      })
      .catch(function handleError() {
        setCreateError("Failed to create repository. Please try again.");
        setCreating(false);
      });
  }

  useEffect(
    function fetchBranches() {
      if (!selectedRepo) {
        setSelectedBranch("");
        return;
      }

      const [owner, repo] = selectedRepo.full_name.split("/");

      fetch(
        `/api/github/branches?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}`,
        { headers: { "x-github-token": githubToken } },
      )
        .then(function handleResponse(res) {
          return res.json();
        })
        .then(function handleData(data) {
          if (data.branches) {
            setSelectedBranch(selectedRepo.default_branch);
          }
        })
        .catch(function handleError() {})
        .finally(function done() {});
    },
    [selectedRepo, githubToken],
  );

  useEffect(
    function detectStructure() {
      if (!selectedRepo || !selectedBranch) {
        setDetectedInfo("");
        setDetectedConfig(null);
        return;
      }

      setDetecting(true);
      setDetectedInfo("");
      setDetectedConfig(null);

      const [owner, repo] = selectedRepo.full_name.split("/");

      fetch(
        `https://api.github.com/repos/${owner}/${repo}/git/trees/${selectedBranch}?recursive=1`,
        {
          headers: {
            Authorization: `Bearer ${githubToken}`,
            Accept: "application/vnd.github.v3+json",
          },
        },
      )
        .then(function handleResponse(res) {
          return res.json();
        })
        .then(function handleData(data) {
          if (!data.tree) {
            setDetectedInfo("Empty repository");
            return;
          }

          const files = data.tree
            .filter(function isBlob(item: { type: string }) {
              return item.type === "blob";
            })
            .map(function getPath(item: { path: string }) {
              return item.path;
            });

          const book = parseBookStructure(files);

          const chapterCount = book.parts.reduce(function countChapters(
            sum: number,
            part,
          ) {
            return sum + part.chapters.length;
          }, 0);

          const contextFiles = files.filter(function isContext(f: string) {
            return f.startsWith(book.contextDir + "/");
          });

          const hasBookJson = files.includes("book.json");

          const parts: string[] = [];
          if (chapterCount > 0) {
            parts.push(
              `Found ${chapterCount} chapter${chapterCount === 1 ? "" : "s"} in ${book.bookDir}/`,
            );
          }
          if (contextFiles.length > 0) {
            parts.push(
              `${contextFiles.length} research file${contextFiles.length === 1 ? "" : "s"} in ${book.contextDir}/`,
            );
          }
          if (hasBookJson) {
            parts.push("book.json detected");
          }
          if (parts.length === 0) {
            parts.push("No book structure detected. Scriva will set one up for you.");
          }

          setDetectedInfo(parts.join(", "));

        const config: BookConfig = {
          repo: repo,
          owner: owner,
          branch: selectedBranch,
          private: selectedRepo.private,
          book,
        };

          setDetectedConfig(config);
          onBookSelected(config);
        })
        .catch(function handleError() {
          setDetectedInfo("Could not scan repository contents");
        })
        .finally(function done() {
          setDetecting(false);
        });
    },
    [selectedRepo, selectedBranch, githubToken, onBookSelected],
  );

  function handleSelectRepo(repo: Repo) {
    setSelectedRepo(repo);
    setSelectedBranch("");
    setDetectedConfig(null);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
      <div>
        <h2
          style={{
            fontFamily: "var(--font-inter), system-ui, sans-serif",
            fontSize: "20px",
            fontWeight: 600,
            color: "var(--color-text)",
            marginBottom: "8px",
          }}
        >
          Your Book
        </h2>
        <p
          style={{
            fontFamily: "var(--font-inter), system-ui, sans-serif",
            fontSize: "14px",
            lineHeight: "1.6",
            color: "var(--color-text-muted)",
          }}
        >
          Create a brand new book or connect an existing repository.
        </p>
      </div>

      <div
        style={{
          backgroundColor: "var(--color-surface)",
          borderRadius: 12,
          border: "1px solid var(--color-border)",
          padding: 24,
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Plus size={18} style={{ color: "var(--color-accent)" }} />
          <h3
            style={{
              fontFamily: "var(--font-inter), system-ui, sans-serif",
              fontSize: 16,
              fontWeight: 600,
              color: "var(--color-text)",
              margin: 0,
            }}
          >
            Create a New Book
          </h3>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label
            style={{
              fontFamily: "var(--font-inter), system-ui, sans-serif",
              fontSize: 13,
              fontWeight: 500,
              color: "var(--color-text-muted)",
            }}
          >
            Title
          </label>
          <input
            type="text"
            value={newTitle}
            onChange={function onTitleChange(e) {
              setNewTitle(e.target.value);
            }}
            onKeyDown={function onKeyDown(e) {
              if (e.key === "Enter") handleCreateNew();
            }}
            placeholder="My Great Novel"
            style={{
              fontSize: 14,
              padding: "10px 14px",
              borderRadius: 8,
              border: "1px solid var(--color-border)",
              backgroundColor: "var(--color-bg)",
              color: "var(--color-text)",
              outline: "none",
              fontFamily: "var(--font-inter), system-ui, sans-serif",
              transition: "border-color 0.15s",
            }}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label
            style={{
              fontFamily: "var(--font-inter), system-ui, sans-serif",
              fontSize: 13,
              fontWeight: 500,
              color: "var(--color-text-muted)",
            }}
          >
            Description (optional)
          </label>
          <input
            type="text"
            value={newDescription}
            onChange={function onDescChange(e) {
              setNewDescription(e.target.value);
            }}
            onKeyDown={function onKeyDown(e) {
              if (e.key === "Enter") handleCreateNew();
            }}
            placeholder="A brief description of your book..."
            style={{
              fontSize: 14,
              padding: "10px 14px",
              borderRadius: 8,
              border: "1px solid var(--color-border)",
              backgroundColor: "var(--color-bg)",
              color: "var(--color-text)",
              outline: "none",
              fontFamily: "var(--font-inter), system-ui, sans-serif",
              transition: "border-color 0.15s",
            }}
          />
        </div>

        {createError && (
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontFamily: "var(--font-inter), system-ui, sans-serif",
              fontSize: 13,
              color: "var(--color-error)",
            }}
          >
            <AlertCircle size={14} />
            {createError}
          </span>
        )}

        <button
          onClick={handleCreateNew}
          disabled={!newTitle.trim() || creating}
          style={{
            fontFamily: "var(--font-inter), system-ui, sans-serif",
            fontSize: 14,
            fontWeight: 500,
            padding: "10px 24px",
            borderRadius: 8,
            border: "none",
            backgroundColor: !newTitle.trim() ? "var(--color-border)" : "var(--color-accent)",
            color: "#ffffff",
            cursor: !newTitle.trim() ? "default" : "pointer",
            opacity: creating ? 0.7 : 1,
            transition: "background 150ms ease",
            alignSelf: "flex-start",
          }}
        >
          {creating ? "Creating..." : "Create Book"}
        </button>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ flex: 1, height: 1, backgroundColor: "var(--color-border)" }} />
        <span
          style={{
            fontFamily: "var(--font-inter), system-ui, sans-serif",
            fontSize: 13,
            color: "var(--color-text-muted)",
            flexShrink: 0,
          }}
        >
          or
        </span>
        <div style={{ flex: 1, height: 1, backgroundColor: "var(--color-border)" }} />
      </div>

      <div>
        <button
          type="button"
          onClick={handleExpandExisting}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontFamily: "var(--font-inter), system-ui, sans-serif",
            fontSize: 15,
            fontWeight: 500,
            color: "var(--color-text)",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            padding: "4px 0",
            width: "100%",
            textAlign: "left",
          }}
        >
          {existingExpanded ? <ChevronUp size={18} /> : <ChevronRight size={18} />}
          <BookOpen size={16} style={{ color: "var(--color-text-muted)" }} />
          Use an existing repository
        </button>

        {existingExpanded && (
          <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 12, paddingLeft: 4 }}>
            {loadingRepos ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "16px 0", fontFamily: "var(--font-inter), system-ui, sans-serif", fontSize: 14, color: "var(--color-text-muted)" }}>
                <Loader2 size={16} className="animate-spin" />
                Loading repositories...
              </div>
            ) : repos.length === 0 ? (
              <div style={{ padding: "16px 0", fontFamily: "var(--font-inter), system-ui, sans-serif", fontSize: 14, color: "var(--color-text-muted)" }}>
                No repositories found
              </div>
            ) : (
              <div style={{
                border: "1px solid var(--color-border)",
                borderRadius: 8,
                maxHeight: 280,
                overflowY: "auto",
              }}>
                {repos.map(function renderRepo(repo) {
                  var isSelected = selectedRepo?.full_name === repo.full_name;
                  return (
                    <div
                      key={repo.full_name}
                      onClick={function selectRepo() {
                        handleSelectRepo(repo);
                      }}
                      style={{
                        padding: "10px 16px",
                        fontFamily: "var(--font-inter), system-ui, sans-serif",
                        fontSize: 14,
                        color: "var(--color-text)",
                        cursor: "pointer",
                        borderBottom: "1px solid var(--color-border)",
                        backgroundColor: isSelected ? "var(--color-surface)" : "transparent",
                        transition: "background-color 0.1s",
                      }}
                      onMouseEnter={function hoverOn(e) {
                        if (!isSelected) e.currentTarget.style.backgroundColor = "var(--color-surface)";
                      }}
                      onMouseLeave={function hoverOff(e) {
                        if (!isSelected) e.currentTarget.style.backgroundColor = "transparent";
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: repo.description ? 2 : 0 }}>
                        {isSelected ? (
                          <Check size={14} style={{ color: "var(--color-accent)", flexShrink: 0 }} />
                        ) : (
                          <BookOpen size={14} style={{ color: "var(--color-text-muted)", flexShrink: 0 }} />
                        )}
                        <span style={{ fontWeight: isSelected ? 600 : 500 }}>{repo.name}</span>
                        {repo.private && (
                          <span style={{ fontSize: 11, color: "var(--color-text-muted)", backgroundColor: "var(--color-surface)", padding: "1px 6px", borderRadius: 4 }}>
                            private
                          </span>
                        )}
                      </div>
                      {repo.description && (
                        <div style={{ fontSize: 12, color: "var(--color-text-muted)", paddingLeft: 22 }}>
                          {repo.description}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {repoError && (
              <span style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: "var(--font-inter), system-ui, sans-serif", fontSize: 13, color: "var(--color-error)" }}>
                <AlertCircle size={14} />
                {repoError}
              </span>
            )}

            {detecting && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  fontFamily: "var(--font-inter), system-ui, sans-serif",
                  fontSize: "14px",
                  color: "var(--color-text-muted)",
                }}
              >
                <Loader2 size={16} className="animate-spin" />
                Scanning repository structure...
              </div>
            )}

            {detectedInfo && !detecting && (
              <div
                style={{
                  backgroundColor: "var(--color-surface)",
                  borderRadius: "12px",
                  padding: "16px 20px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    fontFamily: "var(--font-inter), system-ui, sans-serif",
                    fontSize: "13px",
                    fontWeight: 500,
                    color: detectedConfig ? "var(--color-success)" : "var(--color-text-muted)",
                  }}
                >
                  {detectedConfig ? <Check size={16} /> : <FolderOpen size={16} />}
                  Structure detected
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    fontFamily: "var(--font-inter), system-ui, sans-serif",
                    fontSize: "13px",
                    color: "var(--color-text-muted)",
                  }}
                >
                  <FileText size={14} />
                  {detectedInfo}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
