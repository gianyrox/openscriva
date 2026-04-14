"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import posthog from "posthog-js";
import { useAppStore } from "@/store";
import { FileText, BookOpen, Loader2 } from "lucide-react";
import { fetchAndSaveBookConfig, saveBookConfig } from "@/lib/bookConfig";
import type { BookConfig, RoomProject } from "@/types";

interface RoomResponse {
  owner: string;
  repo: string;
  default_branch: string;
  projects: RoomProject[];
}

type PageState = "loading" | "ready" | "error";

function synthesizePageConfig(
  owner: string,
  repo: string,
  branch: string,
  project: RoomProject,
): BookConfig {
  const filename = project.path.split("/").pop() ?? project.id + ".md";
  return {
    owner,
    repo,
    branch,
    private: true,
    projectPath: project.path,
    book: {
      title: project.title,
      author: owner,
      bookDir: "pages",
      contextDir: "context",
      parts: [
        {
          title: "Page",
          chapters: [
            {
              id: project.id,
              file: filename,
              label: project.title,
            },
          ],
        },
      ],
    },
  };
}

export default function ShelfPage() {
  const router = useRouter();
  const keysStored = useAppStore(function selectKeys(s) {
    return s.preferences.keysStored;
  });
  const setBook = useAppStore(function selectSetBook(s) {
    return s.setBook;
  });
  const setDraftBranch = useAppStore(function selectSetDraftBranch(s) {
    return s.setDraftBranch;
  });

  const [pageState, setPageState] = useState<PageState>("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [room, setRoom] = useState<RoomResponse | null>(null);
  const [showNewBookDialog, setShowNewBookDialog] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [creatingBook, setCreatingBook] = useState(false);
  const [creatingPage, setCreatingPage] = useState(false);

  // A6: hydrate keysStored from the server-side cookie so a fresh
  // Zustand store doesn't bounce authed users back to /.
  const authChecked = useRef(false);
  useEffect(function checkAuth() {
    if (keysStored) {
      authChecked.current = true;
      return;
    }
    if (authChecked.current) {
      router.replace("/");
      return;
    }
    var cancelled = false;
    fetch("/api/keys/check")
      .then(function handleRes(res) {
        return res.json();
      })
      .then(function handleData(data) {
        if (cancelled) return;
        authChecked.current = true;
        if (data.hasKeys) {
          useAppStore.getState().updatePreferences({ keysStored: true });
        } else {
          router.replace("/");
        }
      })
      .catch(function handleErr() {
        if (!cancelled) router.replace("/");
      });
    return function cleanup() {
      cancelled = true;
    };
  }, [keysStored, router]);

  const loadRoom = useCallback(function loadRoom() {
    setPageState("loading");
    setErrorMessage("");

    fetch("/api/github/room")
      .then(function handleRes(res) {
        if (res.ok) return res.json();
        if (res.status === 404) {
          // No room yet — create one.
          return fetch("/api/github/room", { method: "POST" }).then(function handlePost(r) {
            if (!r.ok) {
              return r.json().then(function handleErr(err) {
                throw new Error(err.error || "Failed to create writing room");
              });
            }
            return r.json();
          });
        }
        if (res.status === 401) {
          throw new Error("Not authenticated. Please connect to GitHub.");
        }
        return res.json().then(function handleErr(err) {
          throw new Error(err.error || "Failed to load writing room");
        });
      })
      .then(function handleData(data: RoomResponse) {
        setRoom(data);
        setPageState("ready");
      })
      .catch(function handleError(err: unknown) {
        setErrorMessage(err instanceof Error ? err.message : "Failed to load writing room");
        setPageState("error");
      });
  }, []);

  useEffect(function initRoom() {
    if (keysStored) loadRoom();
  }, [keysStored, loadRoom]);

  function openBookProject(project: RoomProject) {
    if (!room) return;
    posthog.capture("book_opened", {
      book_name: project.title,
      book_full_name: room.owner + "/" + room.repo,
      project_path: project.path,
      is_private: true,
    });

    const fullName = room.owner + "/" + room.repo;
    const bookData = {
      name: project.title,
      full_name: fullName,
      description: null,
      private: true,
      default_branch: room.default_branch,
      updated_at: project.updatedAt ?? project.createdAt,
    };
    localStorage.setItem("scriva-current-book", JSON.stringify(bookData));
    setBook(fullName);
    setDraftBranch(undefined);

    // Read book.json from books/<slug>/book.json, which will have its own bookDir/contextDir.
    fetch(
      "/api/github/files?owner=" + room.owner + "&repo=" + room.repo +
      "&path=" + encodeURIComponent(project.path + "/book.json") +
      "&branch=" + room.default_branch,
    )
      .then(function handleRes(res) {
        if (!res.ok) throw new Error("missing book.json");
        return res.json();
      })
      .then(function handleData(data) {
        if (!data.content) throw new Error("empty book.json");
        const book = JSON.parse(data.content);
        const config: BookConfig = {
          owner: room.owner,
          repo: room.repo,
          branch: room.default_branch,
          private: true,
          projectPath: project.path,
          book: book,
        };
        saveBookConfig(config);
        router.push("/book");
      })
      .catch(function fallback() {
        // Fall back to the generic fetcher (will try to auto-detect).
        fetchAndSaveBookConfig(room.owner, room.repo, room.default_branch, true)
          .finally(function done() {
            router.push("/book");
          });
      });
  }

  function openPageProject(project: RoomProject) {
    if (!room) return;
    posthog.capture("page_opened", {
      title: project.title,
      project_path: project.path,
    });

    const fullName = room.owner + "/" + room.repo;
    const bookData = {
      name: project.title,
      full_name: fullName,
      description: null,
      private: true,
      default_branch: room.default_branch,
      updated_at: project.updatedAt ?? project.createdAt,
    };
    localStorage.setItem("scriva-current-book", JSON.stringify(bookData));
    setBook(fullName);
    setDraftBranch(undefined);

    const config = synthesizePageConfig(room.owner, room.repo, room.default_branch, project);
    saveBookConfig(config);
    router.push("/book");
  }

  function handleCreatePage() {
    if (creatingPage) return;
    setCreatingPage(true);

    fetch("/api/github/room/pages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    })
      .then(function handleRes(res) {
        if (!res.ok) {
          return res.json().then(function handleErr(err) {
            throw new Error(err.error || "Failed to create page");
          });
        }
        return res.json();
      })
      .then(function handleData(data) {
        posthog.capture("page_created", { title: data.title, slug: data.slug });

        const filename = data.projectPath.split("/").pop() ?? data.slug + ".md";
        const project: RoomProject = {
          id: data.slug,
          container: "pages",
          path: data.projectPath,
          form: "page",
          title: data.title,
          createdAt: new Date().toISOString(),
        };

        const fullName = data.owner + "/" + data.repo;
        const bookData = {
          name: data.title,
          full_name: fullName,
          description: null,
          private: true,
          default_branch: data.branch,
          updated_at: project.createdAt,
        };
        localStorage.setItem("scriva-current-book", JSON.stringify(bookData));
        setBook(fullName);
        setDraftBranch(undefined);

        const config = synthesizePageConfig(data.owner, data.repo, data.branch, project);
        saveBookConfig(config);
        void filename;
        router.push("/book");
      })
      .catch(function handleErr(err: unknown) {
        setCreatingPage(false);
        setErrorMessage(err instanceof Error ? err.message : "Failed to create page");
      });
  }

  function handleCreateBook() {
    if (!newTitle.trim() || creatingBook) return;
    setCreatingBook(true);

    fetch("/api/github/room/books", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: newTitle.trim(),
        description: newDescription.trim() || undefined,
      }),
    })
      .then(function handleRes(res) {
        if (!res.ok) {
          return res.json().then(function handleErr(err) {
            throw new Error(err.error || "Failed to create book");
          });
        }
        return res.json();
      })
      .then(function handleData(data) {
        posthog.capture("book_created", {
          book_name: data.title,
          book_full_name: data.full_name,
          is_private: true,
          has_description: Boolean(data.description),
        });

        setShowNewBookDialog(false);
        setNewTitle("");
        setNewDescription("");
        setCreatingBook(false);

        const fullName = data.full_name;
        const bookData = {
          name: data.title,
          full_name: fullName,
          description: data.description,
          private: true,
          default_branch: data.default_branch,
          updated_at: data.updated_at,
        };
        localStorage.setItem("scriva-current-book", JSON.stringify(bookData));
        setBook(fullName);
        setDraftBranch(undefined);

        // Build the BookConfig directly so we know the projectPath without re-fetching.
        const [owner, repoName] = fullName.split("/");
        const config: BookConfig = {
          owner,
          repo: repoName,
          branch: data.default_branch,
          private: true,
          projectPath: data.projectPath,
          book: {
            title: data.title,
            author: owner,
            bookDir: data.projectPath + "/book",
            contextDir: data.projectPath + "/context",
            parts: [
              {
                title: "Part One",
                chapters: [
                  { id: "ch-01", file: "ch-01.md", label: "Chapter 1" },
                ],
              },
            ],
          },
        };
        saveBookConfig(config);
        router.push("/book");
      })
      .catch(function handleErr(err: unknown) {
        setCreatingBook(false);
        setErrorMessage(err instanceof Error ? err.message : "Failed to create book");
      });
  }

  const projects = room?.projects ?? [];
  const bookProjects = projects.filter(function isBook(p) {
    return p.form === "book";
  });
  const pageProjects = projects.filter(function isPage(p) {
    return p.form === "page";
  });

  if (!keysStored) return null;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        backgroundColor: "var(--color-bg)",
        padding: "48px 24px",
        fontFamily: "var(--font-inter), system-ui, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: 720,
          width: "100%",
          margin: "0 auto",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 24,
          }}
        >
          <h1
            style={{
              fontFamily: "var(--font-literata), Georgia, serif",
              fontSize: 28,
              fontWeight: 600,
              color: "var(--color-text)",
              margin: 0,
            }}
          >
            Your Writing Room
          </h1>
        </div>

        {pageState === "loading" && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              padding: 64,
              color: "var(--color-text-muted)",
              fontSize: 14,
            }}
          >
            <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
            Opening your writing room...
          </div>
        )}

        {pageState === "error" && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: 64,
              gap: 12,
            }}
          >
            <p style={{ fontSize: 14, color: "var(--color-error)", textAlign: "center", margin: 0 }}>
              {errorMessage || "Couldn't load your writing room."}
            </p>
            <button
              onClick={loadRoom}
              style={{
                fontSize: 13,
                fontWeight: 500,
                padding: "6px 16px",
                borderRadius: 6,
                border: "1px solid var(--color-border)",
                backgroundColor: "transparent",
                color: "var(--color-text-muted)",
                cursor: "pointer",
                fontFamily: "var(--font-inter), system-ui, sans-serif",
              }}
            >
              Retry
            </button>
          </div>
        )}

        {pageState === "ready" && (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
                marginBottom: 32,
              }}
            >
              <button
                type="button"
                onClick={handleCreatePage}
                disabled={creatingPage}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  gap: 8,
                  padding: "20px 24px",
                  borderRadius: 12,
                  border: "1px solid var(--color-border)",
                  backgroundColor: "var(--color-surface)",
                  color: "var(--color-text)",
                  cursor: creatingPage ? "default" : "pointer",
                  opacity: creatingPage ? 0.7 : 1,
                  textAlign: "left",
                  fontFamily: "var(--font-inter), system-ui, sans-serif",
                  transition: "border-color 150ms ease, background 150ms ease",
                }}
                onMouseEnter={function onEnter(e) {
                  if (!creatingPage) {
                    e.currentTarget.style.borderColor = "var(--color-accent)";
                    e.currentTarget.style.backgroundColor = "var(--color-surface-hover)";
                  }
                }}
                onMouseLeave={function onLeave(e) {
                  e.currentTarget.style.borderColor = "var(--color-border)";
                  e.currentTarget.style.backgroundColor = "var(--color-surface)";
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {creatingPage ? (
                    <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
                  ) : (
                    <FileText size={18} strokeWidth={1.75} />
                  )}
                  <span style={{ fontSize: 15, fontWeight: 600 }}>Blank Page</span>
                </div>
                <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
                  Start writing instantly
                </span>
              </button>

              <button
                type="button"
                onClick={function onNewBook() {
                  setShowNewBookDialog(true);
                }}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  gap: 8,
                  padding: "20px 24px",
                  borderRadius: 12,
                  border: "1px solid var(--color-border)",
                  backgroundColor: "var(--color-surface)",
                  color: "var(--color-text)",
                  cursor: "pointer",
                  textAlign: "left",
                  fontFamily: "var(--font-inter), system-ui, sans-serif",
                  transition: "border-color 150ms ease, background 150ms ease",
                }}
                onMouseEnter={function onEnter(e) {
                  e.currentTarget.style.borderColor = "var(--color-accent)";
                  e.currentTarget.style.backgroundColor = "var(--color-surface-hover)";
                }}
                onMouseLeave={function onLeave(e) {
                  e.currentTarget.style.borderColor = "var(--color-border)";
                  e.currentTarget.style.backgroundColor = "var(--color-surface)";
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <BookOpen size={18} strokeWidth={1.75} />
                  <span style={{ fontSize: 15, fontWeight: 600 }}>New Book</span>
                </div>
                <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
                  Structured, multi-chapter project
                </span>
              </button>
            </div>

            {projects.length === 0 && (
              <div
                style={{
                  padding: 32,
                  textAlign: "center",
                  color: "var(--color-text-muted)",
                  fontSize: 14,
                  border: "1px dashed var(--color-border)",
                  borderRadius: 12,
                }}
              >
                Your writing room is empty. Create a blank page or a new book above.
              </div>
            )}

            {bookProjects.length > 0 && (
              <div style={{ marginBottom: 32 }}>
                <h2
                  style={{
                    fontFamily: "var(--font-inter), system-ui, sans-serif",
                    fontSize: 13,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    color: "var(--color-text-muted)",
                    margin: "0 0 12px 0",
                  }}
                >
                  Books
                </h2>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                    gap: 12,
                  }}
                >
                  {bookProjects.map(function renderBook(project) {
                    return (
                      <button
                        key={project.id}
                        type="button"
                        onClick={function onOpen() {
                          openBookProject(project);
                        }}
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "flex-start",
                          gap: 6,
                          padding: 16,
                          borderRadius: 10,
                          border: "1px solid var(--color-border)",
                          backgroundColor: "var(--color-surface)",
                          color: "var(--color-text)",
                          cursor: "pointer",
                          textAlign: "left",
                          fontFamily: "inherit",
                          transition: "border-color 150ms ease, background 150ms ease",
                        }}
                        onMouseEnter={function onEnter(e) {
                          e.currentTarget.style.borderColor = "var(--color-accent)";
                          e.currentTarget.style.backgroundColor = "var(--color-surface-hover)";
                        }}
                        onMouseLeave={function onLeave(e) {
                          e.currentTarget.style.borderColor = "var(--color-border)";
                          e.currentTarget.style.backgroundColor = "var(--color-surface)";
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <BookOpen size={16} strokeWidth={1.75} style={{ color: "var(--color-accent)" }} />
                          <span style={{ fontSize: 15, fontWeight: 600 }}>{project.title}</span>
                        </div>
                        <span style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
                          {project.path}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {pageProjects.length > 0 && (
              <div>
                <h2
                  style={{
                    fontFamily: "var(--font-inter), system-ui, sans-serif",
                    fontSize: 13,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    color: "var(--color-text-muted)",
                    margin: "0 0 12px 0",
                  }}
                >
                  Pages
                </h2>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {pageProjects.map(function renderPage(project) {
                    return (
                      <button
                        key={project.id}
                        type="button"
                        onClick={function onOpen() {
                          openPageProject(project);
                        }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          padding: "10px 14px",
                          borderRadius: 8,
                          border: "1px solid var(--color-border)",
                          backgroundColor: "var(--color-surface)",
                          color: "var(--color-text)",
                          cursor: "pointer",
                          textAlign: "left",
                          fontFamily: "inherit",
                          transition: "border-color 150ms ease, background 150ms ease",
                        }}
                        onMouseEnter={function onEnter(e) {
                          e.currentTarget.style.borderColor = "var(--color-accent)";
                          e.currentTarget.style.backgroundColor = "var(--color-surface-hover)";
                        }}
                        onMouseLeave={function onLeave(e) {
                          e.currentTarget.style.borderColor = "var(--color-border)";
                          e.currentTarget.style.backgroundColor = "var(--color-surface)";
                        }}
                      >
                        <FileText size={14} strokeWidth={1.75} style={{ color: "var(--color-text-muted)", flexShrink: 0 }} />
                        <span style={{ fontSize: 14, fontWeight: 500, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {project.title}
                        </span>
                        <span style={{ fontSize: 11, color: "var(--color-text-muted)", flexShrink: 0 }}>
                          {new Date(project.createdAt).toLocaleDateString()}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {showNewBookDialog && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(0, 0, 0, 0.4)",
            zIndex: 1000,
          }}
          onClick={function onBackdrop(e) {
            if (e.target === e.currentTarget) {
              setShowNewBookDialog(false);
            }
          }}
        >
          <div
            style={{
              backgroundColor: "var(--color-surface)",
              borderRadius: 12,
              border: "1px solid var(--color-border)",
              padding: 24,
              width: "100%",
              maxWidth: 420,
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <h2
              style={{
                fontFamily: "var(--font-literata), Georgia, serif",
                fontSize: 20,
                fontWeight: 600,
                color: "var(--color-text)",
                margin: 0,
              }}
            >
              New Book
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label
                style={{
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
                  if (e.key === "Enter") handleCreateBook();
                }}
                placeholder="My Great Novel"
                autoFocus
                style={{
                  fontSize: 14,
                  padding: "8px 12px",
                  borderRadius: 6,
                  border: "1px solid var(--color-border)",
                  backgroundColor: "var(--color-bg)",
                  color: "var(--color-text)",
                  outline: "none",
                  fontFamily: "var(--font-inter), system-ui, sans-serif",
                }}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label
                style={{
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
                  if (e.key === "Enter") handleCreateBook();
                }}
                placeholder="A brief description..."
                style={{
                  fontSize: 14,
                  padding: "8px 12px",
                  borderRadius: 6,
                  border: "1px solid var(--color-border)",
                  backgroundColor: "var(--color-bg)",
                  color: "var(--color-text)",
                  outline: "none",
                  fontFamily: "var(--font-inter), system-ui, sans-serif",
                }}
              />
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 8,
                marginTop: 8,
              }}
            >
              <button
                onClick={function onCancel() {
                  setShowNewBookDialog(false);
                  setNewTitle("");
                  setNewDescription("");
                }}
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  padding: "8px 16px",
                  borderRadius: 6,
                  border: "1px solid var(--color-border)",
                  backgroundColor: "transparent",
                  color: "var(--color-text-muted)",
                  cursor: "pointer",
                  fontFamily: "var(--font-inter), system-ui, sans-serif",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateBook}
                disabled={!newTitle.trim() || creatingBook}
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  padding: "8px 20px",
                  borderRadius: 6,
                  border: "none",
                  backgroundColor: !newTitle.trim()
                    ? "var(--color-border)"
                    : "var(--color-accent)",
                  color: "#ffffff",
                  cursor: !newTitle.trim() ? "default" : "pointer",
                  opacity: creatingBook ? 0.7 : 1,
                  fontFamily: "var(--font-inter), system-ui, sans-serif",
                  transition: "background 150ms ease",
                }}
              >
                {creatingBook ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
