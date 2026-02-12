"use client";

import { useState, useCallback } from "react";
import { X, BookOpen, FileText, Archive, Loader2, Download, ExternalLink } from "lucide-react";
import { useAppStore } from "@/store";
import { getItem } from "@/lib/storage";
import { getFileContent } from "@/lib/github";
import { getChapterPath } from "@/lib/book";
import type { BookConfig, Book } from "@/types";

interface PublishPanelProps {
  open: boolean;
  onClose: () => void;
}

type ExportFormat = "epub" | "pdf" | "markdown";
type ExportStatus = "idle" | "loading" | "done" | "error";

interface ExportState {
  epub: ExportStatus;
  pdf: ExportStatus;
  markdown: ExportStatus;
}

function flattenChapterIds(book: Book): { id: string; label: string; file: string }[] {
  const result: { id: string; label: string; file: string }[] = [];
  for (const part of book.parts) {
    for (const ch of part.chapters) {
      result.push({ id: ch.id, label: ch.label, file: ch.file });
    }
  }
  return result;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function StatusLabel({ status, format }: { status: ExportStatus; format: ExportFormat }) {
  const labels: Record<ExportFormat, string> = {
    epub: "Preparing your EPUB…",
    pdf: "Generating PDF…",
    markdown: "Bundling manuscript…",
  };

  if (status === "loading") {
    return (
      <span
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontSize: 12,
          color: "var(--color-accent)",
          fontFamily: "var(--font-inter), system-ui, sans-serif",
        }}
      >
        <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
        {labels[format]}
      </span>
    );
  }

  if (status === "done") {
    return (
      <span
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontSize: 12,
          color: "var(--color-success)",
          fontFamily: "var(--font-inter), system-ui, sans-serif",
        }}
      >
        <Download size={14} />
        Downloaded
      </span>
    );
  }

  if (status === "error") {
    return (
      <span
        style={{
          fontSize: 12,
          color: "var(--color-error)",
          fontFamily: "var(--font-inter), system-ui, sans-serif",
        }}
      >
        Export failed. Try again.
      </span>
    );
  }

  return null;
}

export default function PublishPanel({ open, onClose }: PublishPanelProps) {
  const preferences = useAppStore(function selectPrefs(s) {
    return s.preferences;
  });
  const currentBook = useAppStore(function selectBook(s) {
    return s.editor.currentBook;
  });

  const [exportState, setExportState] = useState<ExportState>({
    epub: "idle",
    pdf: "idle",
    markdown: "idle",
  });
  const [editingImprint, setEditingImprint] = useState(false);

  const repoKey = currentBook ?? "local";
  const config = getItem<BookConfig | null>("scriva:config:" + repoKey, null);
  const book = config?.book;

  const fetchAllChapters = useCallback(async function fetchAll() {
    if (!config || !book) throw new Error("No book configuration found");

    if (!preferences.keysStored) throw new Error("Keys not configured");

    const flat = flattenChapterIds(book);
    const chapters: { title: string; content: string; filename: string }[] = [];

    for (const ch of flat) {
      const path = getChapterPath(book, ch.id);
      if (!path) continue;

      try {
        const file = await getFileContent(
          config.owner,
          config.repo,
          path,
          config.branch,
        );
        chapters.push({
          title: ch.label,
          content: file.content,
          filename: ch.file,
        });
      } catch {
        chapters.push({
          title: ch.label,
          content: "",
          filename: ch.file,
        });
      }
    }

    return chapters;
  }, [config, book, preferences.keysStored]);

  async function handleExportEpub() {
    try {
      setExportState(function set(s) {
        return { ...s, epub: "loading" };
      });

      const chapters = await fetchAllChapters();

      const response = await fetch("/api/export/epub", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          book: {
            title: book!.title,
            author: book!.author,
            description: book!.description,
            coverImage: book!.coverImage,
            subtitle: book!.subtitle,
          },
          chapters: chapters.map(function mapCh(ch) {
            return { title: ch.title, content: ch.content };
          }),
        }),
      });

      if (!response.ok) {
        throw new Error("Export failed");
      }

      const blob = await response.blob();
      const safeName = (book!.title || "book").replace(/[^a-zA-Z0-9 ]/g, "");
      downloadBlob(blob, safeName + ".epub");

      setExportState(function set(s) {
        return { ...s, epub: "done" };
      });
    } catch {
      setExportState(function set(s) {
        return { ...s, epub: "error" };
      });
    }
  }

  async function handleExportPdf() {
    try {
      setExportState(function set(s) {
        return { ...s, pdf: "loading" };
      });

      const chapters = await fetchAllChapters();

      const htmlParts: string[] = [];

      if (book) {
        htmlParts.push('<div style="text-align:center;margin-bottom:4rem;">');
        htmlParts.push('<h1 style="font-size:36px;font-weight:800;">' + book.title + "</h1>");
        if (book.subtitle) {
          htmlParts.push(
            '<p style="font-size:20px;font-style:italic;color:#666;">' + book.subtitle + "</p>",
          );
        }
        htmlParts.push(
          '<p style="font-size:14px;color:#999;letter-spacing:0.05em;">by ' + book.author + "</p>",
        );
        htmlParts.push("</div>");
      }

      for (let i = 0; i < chapters.length; i++) {
        const ch = chapters[i];
        htmlParts.push('<div class="chapter">');
        htmlParts.push("<h2>" + ch.title + "</h2>");
        const lines = ch.content.split("\n");
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed === "") continue;
          if (trimmed.startsWith("# ")) {
            htmlParts.push("<h1>" + trimmed.slice(2) + "</h1>");
          } else if (trimmed.startsWith("## ")) {
            htmlParts.push("<h2>" + trimmed.slice(3) + "</h2>");
          } else if (trimmed.startsWith("### ")) {
            htmlParts.push("<h3>" + trimmed.slice(4) + "</h3>");
          } else if (trimmed.startsWith("> ")) {
            htmlParts.push("<blockquote><p>" + trimmed.slice(2) + "</p></blockquote>");
          } else if (trimmed === "---") {
            htmlParts.push("<hr />");
          } else {
            htmlParts.push("<p>" + trimmed + "</p>");
          }
        }
        htmlParts.push("</div>");
      }

      const response = await fetch("/api/export/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ html: htmlParts.join("\n") }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Export failed");
      }

      const blob = await response.blob();
      const safeName = (book?.title || "manuscript").replace(/[^a-zA-Z0-9 ]/g, "");
      downloadBlob(blob, safeName + ".pdf");

      setExportState(function set(s) {
        return { ...s, pdf: "done" };
      });
    } catch {
      setExportState(function set(s) {
        return { ...s, pdf: "error" };
      });
    }
  }

  async function handleExportMarkdown() {
    try {
      setExportState(function set(s) {
        return { ...s, markdown: "loading" };
      });

      const chapters = await fetchAllChapters();

      const response = await fetch("/api/export/markdown", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          book,
          chapters: chapters.map(function mapCh(ch) {
            return { filename: ch.filename, content: ch.content };
          }),
        }),
      });

      if (!response.ok) {
        throw new Error("Export failed");
      }

      const blob = await response.blob();
      const safeName = (book?.title || "manuscript")
        .replace(/[^a-zA-Z0-9 ]/g, "")
        .replace(/\s+/g, "-");
      downloadBlob(blob, safeName + "-manuscript.zip");

      setExportState(function set(s) {
        return { ...s, markdown: "done" };
      });
    } catch {
      setExportState(function set(s) {
        return { ...s, markdown: "error" };
      });
    }
  }

  if (!open) return null;

  const exportOptions: {
    format: ExportFormat;
    title: string;
    description: string;
    icon: typeof BookOpen;
    handler: () => void;
  }[] = [
    {
      format: "epub",
      title: "EPUB",
      description: "E-book for Kindle, Apple Books, and other readers",
      icon: BookOpen,
      handler: handleExportEpub,
    },
    {
      format: "pdf",
      title: "PDF",
      description: "Print-ready manuscript with professional typography",
      icon: FileText,
      handler: handleExportPdf,
    },
    {
      format: "markdown",
      title: "Manuscript Bundle",
      description: "Markdown files in a zip archive",
      icon: Archive,
      handler: handleExportMarkdown,
    },
  ];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        backdropFilter: "blur(4px)",
      }}
      onClick={function handleOverlayClick(e) {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        style={{
          width: 520,
          maxHeight: "80vh",
          overflowY: "auto",
          backgroundColor: "var(--color-bg)",
          borderRadius: 16,
          border: "1px solid var(--color-border)",
          boxShadow: "0 24px 64px rgba(0,0,0,0.3)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "20px 24px 16px",
            borderBottom: "1px solid var(--color-border)",
          }}
        >
          <h2
            style={{
              fontFamily: "var(--font-literata), Georgia, serif",
              fontSize: 20,
              fontWeight: 700,
              color: "var(--color-text)",
              margin: 0,
            }}
          >
            Publish
          </h2>
          <button
            onClick={onClose}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 28,
              height: 28,
              borderRadius: 6,
              border: "none",
              background: "transparent",
              color: "var(--color-text-muted)",
              cursor: "pointer",
            }}
            onMouseEnter={function onEnter(e) {
              e.currentTarget.style.background = "var(--color-surface)";
            }}
            onMouseLeave={function onLeave(e) {
              e.currentTarget.style.background = "transparent";
            }}
          >
            <X size={18} />
          </button>
        </div>

        {book && (
          <div
            style={{
              padding: "16px 24px",
              borderBottom: "1px solid var(--color-border)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
              <div>
                <h3
                  style={{
                    fontFamily: "var(--font-literata), Georgia, serif",
                    fontSize: 16,
                    fontWeight: 600,
                    color: "var(--color-text)",
                    margin: 0,
                    marginBottom: 4,
                  }}
                >
                  {book.title}
                </h3>
                <p
                  style={{
                    fontFamily: "var(--font-inter), system-ui, sans-serif",
                    fontSize: 13,
                    color: "var(--color-text-muted)",
                    margin: 0,
                  }}
                >
                  by {book.author}
                </p>
                {book.description && (
                  <p
                    style={{
                      fontFamily: "var(--font-inter), system-ui, sans-serif",
                      fontSize: 12,
                      color: "var(--color-text-muted)",
                      margin: "6px 0 0",
                      lineHeight: 1.5,
                    }}
                  >
                    {book.description}
                  </p>
                )}
              </div>
              <button
                onClick={function toggleImprint() {
                  setEditingImprint(function toggle(v) {
                    return !v;
                  });
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  fontSize: 12,
                  color: "var(--color-accent)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "var(--font-inter), system-ui, sans-serif",
                  whiteSpace: "nowrap",
                }}
              >
                <ExternalLink size={12} />
                Edit Imprint
              </button>
            </div>
            {editingImprint && (
              <p
                style={{
                  fontFamily: "var(--font-inter), system-ui, sans-serif",
                  fontSize: 12,
                  color: "var(--color-text-muted)",
                  marginTop: 8,
                  padding: "8px 12px",
                  backgroundColor: "var(--color-surface)",
                  borderRadius: 8,
                  lineHeight: 1.5,
                }}
              >
                Edit your book.json file to update the title, author, description, and cover
                image metadata used during export.
              </p>
            )}
          </div>
        )}

        <div style={{ padding: "16px 24px 24px", display: "flex", flexDirection: "column", gap: 12 }}>
          {exportOptions.map(function renderOption(opt) {
            const Icon = opt.icon;
            const status = exportState[opt.format];
            const isLoading = status === "loading";

            return (
              <button
                key={opt.format}
                onClick={isLoading ? undefined : opt.handler}
                disabled={isLoading}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  padding: 20,
                  backgroundColor: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 12,
                  cursor: isLoading ? "wait" : "pointer",
                  textAlign: "left",
                  fontFamily: "var(--font-inter), system-ui, sans-serif",
                  width: "100%",
                  transition: "background-color 150ms ease, border-color 150ms ease",
                }}
                onMouseEnter={
                  isLoading
                    ? undefined
                    : function onEnter(e) {
                        e.currentTarget.style.backgroundColor = "var(--color-surface-hover)";
                        e.currentTarget.style.borderColor = "var(--color-accent)";
                      }
                }
                onMouseLeave={
                  isLoading
                    ? undefined
                    : function onLeave(e) {
                        e.currentTarget.style.backgroundColor = "var(--color-surface)";
                        e.currentTarget.style.borderColor = "var(--color-border)";
                      }
                }
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    backgroundColor: "var(--color-bg)",
                    color: "var(--color-accent)",
                    flexShrink: 0,
                  }}
                >
                  <Icon size={20} strokeWidth={1.5} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: "var(--color-text)",
                      marginBottom: 2,
                    }}
                  >
                    {opt.title}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--color-text-muted)",
                      lineHeight: 1.4,
                    }}
                  >
                    {opt.description}
                  </div>
                  <StatusLabel status={status} format={opt.format} />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
