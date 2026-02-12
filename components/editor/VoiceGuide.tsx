"use client";

import { useState, useEffect, useCallback } from "react";
import { Mic, Save, RefreshCw, Loader2, X, Check } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useAppStore } from "@/store";
import { estimateTokens, formatTokenCount } from "@/lib/tokens";

interface VoiceGuideProps {
  onClose: () => void;
}

interface ChapterOption {
  id: string;
  label: string;
  file: string;
}

export default function VoiceGuide({ onClose }: VoiceGuideProps) {
  const preferences = useAppStore(function selectPrefs(s) {
    return s.preferences;
  });
  const currentBook = useAppStore(function selectBook(s) {
    return s.editor.currentBook;
  });

  const [existingContent, setExistingContent] = useState<string | null>(null);
  const [existingSha, setExistingSha] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chapters, setChapters] = useState<ChapterOption[]>([]);
  const [selectedChapters, setSelectedChapters] = useState<Set<string>>(new Set());
  const [showChapterSelect, setShowChapterSelect] = useState(false);
  const [generatedResult, setGeneratedResult] = useState<string | null>(null);

  function parseBookInfo(fullName: string | undefined): { owner: string; repo: string } | null {
    if (!fullName) return null;
    const parts = fullName.split("/");
    if (parts.length !== 2) return null;
    return { owner: parts[0], repo: parts[1] };
  }

  const bookInfo = parseBookInfo(currentBook);

  const fetchVoiceGuide = useCallback(function fetchVoiceGuide() {
    if (!preferences.keysStored || !bookInfo) {
      setLoading(false);
      return;
    }

    fetch("/api/github/files?path=voice.md", {
      headers: {
        "x-repo-owner": bookInfo.owner,
        "x-repo-name": bookInfo.repo,
      },
    })
      .then(function handleRes(res) {
        if (!res.ok) throw new Error("not-found");
        return res.json();
      })
      .then(function handleData(data) {
        if (data.content) {
          setExistingContent(data.content);
          setExistingSha(data.sha || null);
        }
        setLoading(false);
      })
      .catch(function handleErr() {
        setExistingContent(null);
        setLoading(false);
      });
  }, [preferences.keysStored, bookInfo?.owner, bookInfo?.repo]);

  const fetchChapters = useCallback(function fetchChapters() {
    if (!preferences.keysStored || !bookInfo) return;

    fetch("/api/github/files?path=book.json", {
      headers: {
        "x-repo-owner": bookInfo.owner,
        "x-repo-name": bookInfo.repo,
      },
    })
      .then(function handleRes(res) {
        if (!res.ok) throw new Error("No book config");
        return res.json();
      })
      .then(function handleData(data) {
        if (!data.content) return;
        try {
          const config = JSON.parse(data.content);
          const book = config.book || config;
          const chaps: ChapterOption[] = [];
          const parts = book.parts || [];
          for (const part of parts) {
            for (const ch of part.chapters || []) {
              chaps.push({
                id: ch.id,
                label: ch.label,
                file: (book.bookDir || "book") + "/" + ch.file,
              });
            }
          }
          setChapters(chaps);
          setSelectedChapters(new Set(chaps.map(function getId(c) { return c.id; })));
        } catch {
          setChapters([]);
        }
      })
      .catch(function handleErr() {
        setChapters([]);
      });
  }, [preferences.keysStored, bookInfo?.owner, bookInfo?.repo]);

  useEffect(function init() {
    fetchVoiceGuide();
    fetchChapters();
  }, [fetchVoiceGuide, fetchChapters]);

  function toggleChapter(id: string) {
    setSelectedChapters(function update(prev) {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function toggleAllChapters() {
    if (selectedChapters.size === chapters.length) {
      setSelectedChapters(new Set());
    } else {
      setSelectedChapters(new Set(chapters.map(function getId(c) { return c.id; })));
    }
  }

  async function fetchChapterTexts(): Promise<string> {
    if (!preferences.keysStored || !bookInfo) return "";

    const selected = chapters.filter(function isSelected(c) {
      return selectedChapters.has(c.id);
    });

    if (selected.length === 0) return "";

    const texts: string[] = [];

    for (const ch of selected) {
      try {
        const res = await fetch("/api/github/files?path=" + encodeURIComponent(ch.file), {
          headers: {
            "x-repo-owner": bookInfo.owner,
            "x-repo-name": bookInfo.repo,
          },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.content) {
            texts.push("--- " + ch.label + " ---\n\n" + data.content);
          }
        }
      } catch {
        continue;
      }
    }

    return texts.join("\n\n");
  }

  async function handleGenerate() {
    if (!preferences.keysStored) {
      setError("No API key configured");
      return;
    }

    if (selectedChapters.size === 0) {
      setError("Select at least one chapter to analyze");
      return;
    }

    setGenerating(true);
    setError(null);
    setGeneratedResult(null);

    try {
      const text = await fetchChapterTexts();
      if (!text) {
        setError("No chapter text found");
        setGenerating(false);
        return;
      }

      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mode: "voice-guide",
          text: text,
          model: preferences.defaultModel,
        }),
      });

      if (!res.ok) throw new Error("API error: " + res.status);

      const data = await res.json();
      setGeneratedResult(data.result || "");
      setEditContent(data.result || "");
      setIsEditing(true);
      setShowChapterSelect(false);
      setGenerating(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to generate");
      setGenerating(false);
    }
  }

  async function handleSave() {
    if (!preferences.keysStored || !bookInfo) return;

    const content = isEditing ? editContent : (generatedResult || existingContent || "");
    if (!content) return;

    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/github/files", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-repo-owner": bookInfo.owner,
          "x-repo-name": bookInfo.repo,
        },
        body: JSON.stringify({
          path: "voice.md",
          content: content,
          message: "Update voice guide",
          sha: existingSha || undefined,
        }),
      });

      if (!res.ok) throw new Error("Failed to save");

      const data = await res.json();
      setExistingContent(content);
      setExistingSha(data.sha || null);
      setGeneratedResult(null);
      setIsEditing(false);
      setSaving(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Save failed");
      setSaving(false);
    }
  }

  function handleEdit() {
    setEditContent(existingContent || "");
    setIsEditing(true);
  }

  function handleCancelEdit() {
    setIsEditing(false);
    setEditContent("");
    setGeneratedResult(null);
  }

  const displayContent = generatedResult || existingContent;
  const tokenCount = displayContent ? estimateTokens(displayContent) : 0;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(0, 0, 0, 0.4)",
        fontFamily: "var(--font-inter), system-ui, sans-serif",
      }}
      onClick={function handleBackdrop(e) {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: "min(680px, 90vw)",
          maxHeight: "85vh",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "var(--color-bg)",
          border: "1px solid var(--color-border)",
          borderRadius: 12,
          boxShadow: "0 16px 48px rgba(0, 0, 0, 0.2)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 20px",
            borderBottom: "1px solid var(--color-border)",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Mic size={18} style={{ color: "var(--color-accent)" }} />
            <span style={{ fontSize: 15, fontWeight: 600, color: "var(--color-text)" }}>
              Voice Guide
            </span>
            {tokenCount > 0 && (
              <span
                style={{
                  fontSize: 11,
                  color: "var(--color-text-muted)",
                  backgroundColor: "var(--color-surface)",
                  padding: "2px 8px",
                  borderRadius: 10,
                }}
              >
                {formatTokenCount(tokenCount)} tokens
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 28,
              height: 28,
              border: "none",
              background: "none",
              color: "var(--color-text-muted)",
              cursor: "pointer",
              borderRadius: 6,
            }}
          >
            <X size={16} />
          </button>
        </div>

        <div
          style={{
            padding: "12px 20px",
            borderBottom: "1px solid var(--color-border)",
            flexShrink: 0,
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 12,
              color: "var(--color-text-muted)",
              lineHeight: 1.5,
            }}
          >
            Your voice guide helps the AI match your writing style. It&apos;s automatically
            included when the AI generates prose.
          </p>
        </div>

        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: 20,
            minHeight: 0,
          }}
        >
          {loading && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 40,
                color: "var(--color-text-muted)",
                gap: 8,
              }}
            >
              <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
              <span style={{ fontSize: 13 }}>Loading voice guide...</span>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          )}

          {!loading && generating && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: 40,
                gap: 12,
                color: "var(--color-text-muted)",
              }}
            >
              <Loader2 size={20} style={{ animation: "spin 1s linear infinite", color: "var(--color-accent)" }} />
              <span style={{ fontSize: 13 }}>Analyzing your writing style...</span>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          )}

          {!loading && !generating && error && (
            <div
              style={{
                padding: "10px 14px",
                borderRadius: 8,
                backgroundColor: "color-mix(in srgb, var(--color-error) 10%, transparent)",
                border: "1px solid color-mix(in srgb, var(--color-error) 30%, transparent)",
                color: "var(--color-error)",
                fontSize: 12,
                marginBottom: 12,
              }}
            >
              {error}
            </div>
          )}

          {!loading && !generating && isEditing && (
            <textarea
              value={editContent}
              onChange={function handleChange(e) {
                setEditContent(e.target.value);
              }}
              style={{
                width: "100%",
                minHeight: 300,
                padding: "14px 16px",
                fontSize: 13,
                fontFamily: "var(--font-literata), serif",
                lineHeight: 1.7,
                border: "1px solid var(--color-border)",
                borderRadius: 8,
                backgroundColor: "var(--color-surface)",
                color: "var(--color-text)",
                outline: "none",
                resize: "vertical",
                boxSizing: "border-box",
              }}
            />
          )}

          {!loading && !generating && !isEditing && displayContent && (
            <div
              className="voice-guide-content"
              style={{
                fontSize: 13,
                lineHeight: 1.7,
                color: "var(--color-text)",
              }}
            >
              <style>{`
                .voice-guide-content h2 {
                  font-size: 14px;
                  font-weight: 600;
                  color: var(--color-text);
                  margin: 20px 0 8px 0;
                  padding-bottom: 4px;
                  border-bottom: 1px solid var(--color-border);
                }
                .voice-guide-content h2:first-child {
                  margin-top: 0;
                }
                .voice-guide-content h3 {
                  font-size: 13px;
                  font-weight: 600;
                  color: var(--color-text);
                  margin: 14px 0 6px 0;
                }
                .voice-guide-content p {
                  margin: 0 0 10px 0;
                }
                .voice-guide-content ul, .voice-guide-content ol {
                  margin: 0 0 10px 0;
                  padding-left: 20px;
                }
                .voice-guide-content li {
                  margin-bottom: 4px;
                }
                .voice-guide-content blockquote {
                  margin: 8px 0;
                  padding: 8px 14px;
                  border-left: 3px solid var(--color-accent);
                  background: var(--color-surface);
                  border-radius: 0 6px 6px 0;
                  font-family: var(--font-literata), serif;
                  font-style: italic;
                  color: var(--color-text-muted);
                }
                .voice-guide-content code {
                  font-size: 12px;
                  padding: 1px 5px;
                  background: var(--color-surface);
                  border-radius: 3px;
                }
              `}</style>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{displayContent}</ReactMarkdown>
            </div>
          )}

          {!loading && !generating && !displayContent && !isEditing && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 16,
                padding: "32px 20px",
                textAlign: "center",
              }}
            >
              <Mic size={32} style={{ color: "var(--color-text-muted)", opacity: 0.4 }} />
              <div>
                <p
                  style={{
                    margin: "0 0 6px",
                    fontSize: 14,
                    fontWeight: 500,
                    color: "var(--color-text)",
                  }}
                >
                  No voice guide yet
                </p>
                <p
                  style={{
                    margin: 0,
                    fontSize: 12,
                    color: "var(--color-text-muted)",
                    lineHeight: 1.5,
                  }}
                >
                  Generate one from your existing chapters to help the AI match your style.
                </p>
              </div>
            </div>
          )}

          {!loading && !generating && showChapterSelect && chapters.length > 0 && (
            <div
              style={{
                marginTop: 16,
                padding: 14,
                border: "1px solid var(--color-border)",
                borderRadius: 8,
                backgroundColor: "var(--color-surface)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 10,
                }}
              >
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text)" }}>
                  Select chapters to analyze
                </span>
                <button
                  onClick={toggleAllChapters}
                  style={{
                    fontSize: 11,
                    color: "var(--color-accent)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  {selectedChapters.size === chapters.length ? "Deselect All" : "Select All"}
                </button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {chapters.map(function renderChapter(ch) {
                  const isChecked = selectedChapters.has(ch.id);
                  return (
                    <label
                      key={ch.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "5px 8px",
                        borderRadius: 6,
                        cursor: "pointer",
                        fontSize: 12,
                        color: "var(--color-text)",
                        backgroundColor: isChecked
                          ? "color-mix(in srgb, var(--color-accent) 8%, transparent)"
                          : "transparent",
                        transition: "background 100ms",
                      }}
                    >
                      <div
                        style={{
                          width: 16,
                          height: 16,
                          borderRadius: 4,
                          border: isChecked
                            ? "none"
                            : "1.5px solid var(--color-border)",
                          backgroundColor: isChecked ? "var(--color-accent)" : "transparent",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                          transition: "all 150ms",
                        }}
                        onClick={function handleToggle() {
                          toggleChapter(ch.id);
                        }}
                      >
                        {isChecked && <Check size={11} style={{ color: "#fff" }} />}
                      </div>
                      <span>{ch.label}</span>
                    </label>
                  );
                })}
              </div>
              <button
                onClick={handleGenerate}
                disabled={selectedChapters.size === 0}
                style={{
                  marginTop: 12,
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  padding: "8px 14px",
                  fontSize: 12,
                  fontWeight: 500,
                  fontFamily: "inherit",
                  border: "none",
                  borderRadius: 6,
                  backgroundColor: "var(--color-accent)",
                  color: "#fff",
                  cursor: selectedChapters.size === 0 ? "default" : "pointer",
                  opacity: selectedChapters.size === 0 ? 0.5 : 1,
                }}
              >
                Analyze {selectedChapters.size} chapter{selectedChapters.size !== 1 ? "s" : ""}
              </button>
            </div>
          )}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 20px",
            borderTop: "1px solid var(--color-border)",
            flexShrink: 0,
            gap: 8,
          }}
        >
          <div style={{ display: "flex", gap: 6 }}>
            {!isEditing && !generating && (
              <button
                onClick={function handleShowGenerate() {
                  setShowChapterSelect(true);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "7px 14px",
                  fontSize: 12,
                  fontWeight: 500,
                  fontFamily: "inherit",
                  border: "1px solid var(--color-accent)",
                  borderRadius: 6,
                  backgroundColor: "color-mix(in srgb, var(--color-accent) 8%, transparent)",
                  color: "var(--color-accent)",
                  cursor: "pointer",
                }}
              >
                <RefreshCw size={13} />
                {existingContent ? "Regenerate" : "Generate Voice Guide"}
              </button>
            )}
            {!isEditing && existingContent && !generating && (
              <button
                onClick={handleEdit}
                style={{
                  padding: "7px 14px",
                  fontSize: 12,
                  fontWeight: 500,
                  fontFamily: "inherit",
                  border: "1px solid var(--color-border)",
                  borderRadius: 6,
                  backgroundColor: "transparent",
                  color: "var(--color-text)",
                  cursor: "pointer",
                }}
              >
                Edit
              </button>
            )}
          </div>

          <div style={{ display: "flex", gap: 6 }}>
            {isEditing && (
              <>
                <button
                  onClick={handleCancelEdit}
                  style={{
                    padding: "7px 14px",
                    fontSize: 12,
                    fontWeight: 500,
                    fontFamily: "inherit",
                    border: "1px solid var(--color-border)",
                    borderRadius: 6,
                    backgroundColor: "transparent",
                    color: "var(--color-text-muted)",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !editContent.trim()}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "7px 14px",
                    fontSize: 12,
                    fontWeight: 500,
                    fontFamily: "inherit",
                    border: "none",
                    borderRadius: 6,
                    backgroundColor: "var(--color-accent)",
                    color: "#fff",
                    cursor: saving || !editContent.trim() ? "default" : "pointer",
                    opacity: saving || !editContent.trim() ? 0.6 : 1,
                  }}
                >
                  <Save size={13} />
                  {saving ? "Saving..." : "Save"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
