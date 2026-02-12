"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store";
import { X, Loader2, BookOpen } from "lucide-react";
import BookCard from "@/components/shelf/BookCard";
import { fetchAndSaveBookConfig } from "@/lib/bookConfig";

interface RepoEntry {
  name: string;
  full_name: string;
  description: string | null;
  private: boolean;
  default_branch: string;
  updated_at: string | null;
}

interface ShelfBook {
  full_name: string;
  name: string;
  description: string | null;
  private: boolean;
  default_branch: string;
  added_at: string;
}

type PageState = "loading" | "loaded" | "error" | "empty";

function getShelfBooks(): ShelfBook[] {
  try {
    const raw = localStorage.getItem("scriva-books");
    if (!raw) return [];
    return JSON.parse(raw) as ShelfBook[];
  } catch {
    return [];
  }
}

function saveShelfBooks(books: ShelfBook[]): void {
  localStorage.setItem("scriva-books", JSON.stringify(books));
}

function addBookToShelf(repo: RepoEntry): void {
  const books = getShelfBooks();
  const exists = books.some(function match(b) {
    return b.full_name === repo.full_name;
  });
  if (exists) return;
  books.push({
    full_name: repo.full_name,
    name: repo.name,
    description: repo.description,
    private: repo.private,
    default_branch: repo.default_branch,
    added_at: new Date().toISOString(),
  });
  saveShelfBooks(books);
}

export default function ShelfPage() {
  const router = useRouter();
  const keysStored = useAppStore(function selectKeys(s) {
    return s.preferences.keysStored;
  });
  const setBook = useAppStore(function selectSetBook(s) {
    return s.setBook;
  });

  const [shelfBooks, setShelfBooks] = useState<ShelfBook[]>([]);
  const [pageState, setPageState] = useState<PageState>("loading");
  const [showNewBookDialog, setShowNewBookDialog] = useState(false);
  const [showAddExistingDialog, setShowAddExistingDialog] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [allRepos, setAllRepos] = useState<RepoEntry[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [repoSearch, setRepoSearch] = useState("");

  useEffect(function checkAuth() {
    if (!keysStored) {
      router.replace("/");
    }
  }, [keysStored, router]);

  const loadShelf = useCallback(function loadShelf() {
    const books = getShelfBooks();
    setShelfBooks(books);
    if (books.length === 0) {
      setPageState("empty");
    } else {
      setPageState("loaded");
    }
  }, []);

  useEffect(function initShelf() {
    loadShelf();
  }, [loadShelf]);

  function fetchAllRepos() {
    if (!keysStored) return;
    setLoadingRepos(true);

    fetch("/api/github/repos")
      .then(function handleResponse(res) {
        if (!res.ok) throw new Error("Failed to fetch repos");
        return res.json();
      })
      .then(function handleData(data) {
        setAllRepos(data.repos || []);
      })
      .catch(function handleError() {
        setAllRepos([]);
      })
      .finally(function done() {
        setLoadingRepos(false);
      });
  }

  function handleOpenAddExisting() {
    setShowAddExistingDialog(true);
    setRepoSearch("");
    fetchAllRepos();
  }

  function handleAddRepo(repo: RepoEntry) {
    addBookToShelf(repo);
    setShowAddExistingDialog(false);
    loadShelf();
  }

  function handleSelectRepo(repo: ShelfBook) {
    const bookData = {
      name: repo.name,
      full_name: repo.full_name,
      description: repo.description,
      private: repo.private,
      default_branch: repo.default_branch,
      updated_at: null,
    };
    localStorage.setItem("scriva-current-book", JSON.stringify(bookData));
    setBook(repo.full_name);

    const [owner, repoName] = repo.full_name.split("/");
    fetchAndSaveBookConfig(owner, repoName, repo.default_branch, repo.private).then(function done() {
      router.push("/book");
    }).catch(function fallback() {
      router.push("/book");
    });
  }

  function handleCreateBook() {
    if (!keysStored || !newTitle.trim() || creating) return;

    setCreating(true);

    const repoName = newTitle
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-");

    fetch("/api/github/repos", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: repoName,
        title: newTitle.trim(),
        description: newDescription.trim() || undefined,
        private: true,
      }),
    })
      .then(function handleResponse(res) {
        if (!res.ok) throw new Error("Failed to create repo");
        return res.json();
      })
      .then(function handleCreated(repo) {
        setShowNewBookDialog(false);
        setNewTitle("");
        setNewDescription("");
        setCreating(false);

        addBookToShelf(repo);

        const bookData = {
          name: repo.name,
          full_name: repo.full_name,
          description: repo.description,
          private: repo.private,
          default_branch: repo.default_branch,
          updated_at: repo.updated_at,
        };
        localStorage.setItem("scriva-current-book", JSON.stringify(bookData));
        setBook(repo.full_name);

        const [owner, repoName] = repo.full_name.split("/");
        fetchAndSaveBookConfig(owner, repoName, repo.default_branch, repo.private).then(function done() {
          router.push("/book");
        }).catch(function fallback() {
          router.push("/book");
        });
      })
      .catch(function handleError() {
        setCreating(false);
      });
  }

  const filteredRepos = allRepos.filter(function filterBySearch(repo) {
    const existing = shelfBooks.some(function match(b) {
      return b.full_name === repo.full_name;
    });
    if (existing) return false;
    if (!repoSearch.trim()) return true;
    const q = repoSearch.toLowerCase();
    return (
      repo.name.toLowerCase().includes(q) ||
      repo.full_name.toLowerCase().includes(q) ||
      (repo.description && repo.description.toLowerCase().includes(q))
    );
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
            marginBottom: 32,
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
            Your Shelf
          </h1>

          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={handleOpenAddExisting}
              style={{
                fontFamily: "var(--font-inter), system-ui, sans-serif",
                fontSize: 14,
                fontWeight: 500,
                padding: "8px 20px",
                borderRadius: 6,
                border: "1px solid var(--color-border)",
                backgroundColor: "transparent",
                color: "var(--color-text)",
                cursor: "pointer",
                transition: "background 150ms ease, border-color 150ms ease",
              }}
              onMouseEnter={function onEnter(e) {
                e.currentTarget.style.borderColor = "var(--color-text-muted)";
                e.currentTarget.style.backgroundColor = "var(--color-surface)";
              }}
              onMouseLeave={function onLeave(e) {
                e.currentTarget.style.borderColor = "var(--color-border)";
                e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              Add Existing
            </button>
            <button
              onClick={function onNewBook() {
                setShowNewBookDialog(true);
              }}
              style={{
                fontFamily: "var(--font-inter), system-ui, sans-serif",
                fontSize: 14,
                fontWeight: 500,
                padding: "8px 20px",
                borderRadius: 6,
                border: "none",
                backgroundColor: "var(--color-accent)",
                color: "#ffffff",
                cursor: "pointer",
                transition: "background 150ms ease",
              }}
              onMouseEnter={function onEnter(e) {
                e.currentTarget.style.backgroundColor = "var(--color-accent-hover)";
              }}
              onMouseLeave={function onLeave(e) {
                e.currentTarget.style.backgroundColor = "var(--color-accent)";
              }}
            >
              New Book
            </button>
          </div>
        </div>

        {pageState === "loading" && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 64,
            }}
          >
            <p
              style={{
                fontSize: 14,
                color: "var(--color-text-muted)",
              }}
            >
              Opening your shelf...
            </p>
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
            <p
              style={{
                fontSize: 14,
                color: "var(--color-error)",
                textAlign: "center",
              }}
            >
              {"Couldn't load your books. Check your GitHub token in Preferences."}
            </p>
            <button
              onClick={loadShelf}
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

        {pageState === "empty" && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 64,
            }}
          >
            <p
              style={{
                fontSize: 14,
                color: "var(--color-text-muted)",
              }}
            >
              Your shelf is empty. Start your first book.
            </p>
          </div>
        )}

        {pageState === "loaded" && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
              gap: 16,
            }}
          >
            {shelfBooks.map(function renderCard(book) {
              return (
                <BookCard
                  key={book.full_name}
                  repo={{
                    name: book.name,
                    full_name: book.full_name,
                    description: book.description,
                    private: book.private,
                    default_branch: book.default_branch,
                    updated_at: book.added_at,
                  }}
                  onSelect={function onSelect() {
                    handleSelectRepo(book);
                  }}
                />
              );
            })}
          </div>
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
                disabled={!newTitle.trim() || creating}
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
                  opacity: creating ? 0.7 : 1,
                  fontFamily: "var(--font-inter), system-ui, sans-serif",
                  transition: "background 150ms ease",
                }}
              >
                {creating ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddExistingDialog && (
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
              setShowAddExistingDialog(false);
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
              maxWidth: 480,
              display: "flex",
              flexDirection: "column",
              gap: 16,
              maxHeight: "70vh",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h2
                style={{
                  fontFamily: "var(--font-literata), Georgia, serif",
                  fontSize: 20,
                  fontWeight: 600,
                  color: "var(--color-text)",
                  margin: 0,
                }}
              >
                Add Existing Book
              </h2>
              <button
                onClick={function onClose() {
                  setShowAddExistingDialog(false);
                }}
                style={{
                  border: "none",
                  background: "transparent",
                  color: "var(--color-text-muted)",
                  cursor: "pointer",
                  padding: 4,
                }}
              >
                <X size={18} />
              </button>
            </div>

            <input
              type="text"
              value={repoSearch}
              onChange={function onSearchChange(e) {
                setRepoSearch(e.target.value);
              }}
              placeholder="Search repositories..."
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

            <div
              style={{
                flex: 1,
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: 2,
                minHeight: 0,
                maxHeight: 360,
              }}
            >
              {loadingRepos && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    padding: 32,
                    color: "var(--color-text-muted)",
                    fontSize: 14,
                  }}
                >
                  <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
                  Loading repositories...
                </div>
              )}

              {!loadingRepos && filteredRepos.length === 0 && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 32,
                    color: "var(--color-text-muted)",
                    fontSize: 14,
                  }}
                >
                  {repoSearch ? "No matching repositories found." : "No repositories available to add."}
                </div>
              )}

              {!loadingRepos &&
                filteredRepos.map(function renderRepo(repo) {
                  return (
                    <button
                      key={repo.full_name}
                      onClick={function onPick() {
                        handleAddRepo(repo);
                      }}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 10,
                        padding: "10px 12px",
                        borderRadius: 8,
                        border: "none",
                        background: "transparent",
                        cursor: "pointer",
                        textAlign: "left",
                        fontFamily: "var(--font-inter), system-ui, sans-serif",
                        width: "100%",
                        transition: "background 100ms ease",
                      }}
                      onMouseEnter={function onEnter(e) {
                        e.currentTarget.style.backgroundColor = "var(--color-surface-hover)";
                      }}
                      onMouseLeave={function onLeave(e) {
                        e.currentTarget.style.backgroundColor = "transparent";
                      }}
                    >
                      <BookOpen
                        size={16}
                        style={{ color: "var(--color-accent)", flexShrink: 0, marginTop: 2 }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 14,
                            fontWeight: 500,
                            color: "var(--color-text)",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {repo.full_name}
                        </div>
                        {repo.description && (
                          <div
                            style={{
                              fontSize: 12,
                              color: "var(--color-text-muted)",
                              marginTop: 2,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {repo.description}
                          </div>
                        )}
                      </div>
                      {repo.private && (
                        <span
                          style={{
                            fontSize: 11,
                            color: "var(--color-text-muted)",
                            backgroundColor: "var(--color-bg)",
                            padding: "1px 6px",
                            borderRadius: 4,
                            flexShrink: 0,
                          }}
                        >
                          private
                        </span>
                      )}
                    </button>
                  );
                })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
