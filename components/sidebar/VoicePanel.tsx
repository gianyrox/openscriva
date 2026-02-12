"use client";

import { useState, useEffect, useCallback } from "react";
import { FileText, Pencil, Save, Sparkles, Plus, Loader2 } from "lucide-react";
import { useAppStore } from "@/store";
import { getBookConfig } from "@/lib/bookConfig";
import { estimateTokens, formatTokenCount } from "@/lib/tokens";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface VoiceFile {
  name: string;
  path: string;
  size?: number;
}

export default function VoicePanel() {
  const currentBook = useAppStore(function selectBook(s) {
    return s.editor.currentBook;
  });
  const keysStored = useAppStore(function selectKeys(s) {
    return s.preferences.keysStored;
  });

  const config = getBookConfig(currentBook);
  const owner = config?.owner;
  const repo = config?.repo;
  const branch = config?.branch || "main";

  const [voiceContent, setVoiceContent] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [voiceSha, setVoiceSha] = useState<string | null>(null);
  const [samples, setSamples] = useState<VoiceFile[]>([]);
  const [samplesLoading, setSamplesLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [showNewSample, setShowNewSample] = useState(false);
  const [newSampleName, setNewSampleName] = useState("");

  const fetchVoiceFile = useCallback(function fetchVoice() {
    if (!keysStored || !owner || !repo) return;

    setLoading(true);
    fetch("/api/github/files?owner=" + owner + "&repo=" + repo + "&path=voice.md&branch=" + branch)
      .then(function handleRes(res) {
        if (!res.ok) {
          if (res.status === 404) {
            setVoiceContent("");
            setVoiceSha(null);
            return null;
          }
          throw new Error("Failed to fetch");
        }
        return res.json();
      })
      .then(function handleData(data) {
        if (data) {
          setVoiceContent(data.content || "");
          setVoiceSha(data.sha || null);
        }
      })
      .catch(function handleErr() {
        setVoiceContent("");
        setVoiceSha(null);
      })
      .finally(function done() {
        setLoading(false);
      });
  }, [keysStored, owner, repo, branch]);

  const fetchSamples = useCallback(function fetchVoiceSamples() {
    if (!keysStored || !owner || !repo) return;

    setSamplesLoading(true);
    fetch("/api/github/tree?owner=" + owner + "&repo=" + repo + "&branch=" + branch)
      .then(function handleRes(res) {
        if (!res.ok) throw new Error("Failed to fetch");
        return res.json();
      })
      .then(function handleData(data) {
        const tree: string[] = data.tree ?? data;
        if (Array.isArray(tree)) {
          const voiceFiles = tree
            .filter(function isVoice(p) {
              return p.startsWith("voice/") && !p.endsWith(".gitkeep") && p !== "voice/";
            })
            .map(function toFile(p) {
              const name = p.split("/").pop() ?? p;
              return { name, path: p, size: 0 };
            });
          setSamples(voiceFiles);
        }
      })
      .catch(function handleErr() {
        setSamples([]);
      })
      .finally(function done() {
        setSamplesLoading(false);
      });
  }, [keysStored, owner, repo, branch]);

  useEffect(function loadVoice() {
    fetchVoiceFile();
    fetchSamples();
  }, [fetchVoiceFile, fetchSamples]);

  function handleEdit() {
    setEditing(true);
    setEditContent(voiceContent);
  }

  function handleCancelEdit() {
    setEditing(false);
    setEditContent("");
  }

  function handleSave() {
    if (!keysStored || !owner || !repo) return;

    setSaving(true);
    const body: Record<string, string> = {
      owner,
      repo,
      path: "voice.md",
      content: editContent,
      message: "Update voice guide",
    };
    if (voiceSha) {
      body.sha = voiceSha;
    }

    fetch("/api/github/files", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
      .then(function handleRes(res) {
        if (!res.ok) throw new Error("Failed to save");
        return res.json();
      })
      .then(function handleData(data) {
        setVoiceContent(editContent);
        setVoiceSha(data.sha || voiceSha);
        setEditing(false);
        setEditContent("");
      })
      .catch(function handleErr() {
        alert("Failed to save voice guide.");
      })
      .finally(function done() {
        setSaving(false);
      });
  }

  function handleAnalyzeVoice() {
    if (!keysStored) return;
    setAnalyzing(true);

    setTimeout(function simulateAnalysis() {
      setAnalyzing(false);
      alert("Analyze Voice is coming soon. This will analyze your writing samples and generate style metrics.");
    }, 1500);
  }

  function handleCreateSample() {
    if (!keysStored || !owner || !repo || !newSampleName.trim()) return;

    const path = "voice/" + newSampleName.trim();
    fetch("/api/github/files", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        owner,
        repo,
        path,
        content: "",
        message: "Add voice sample: " + newSampleName.trim(),
      }),
    })
      .then(function handleRes() {
        fetchSamples();
        setShowNewSample(false);
        setNewSampleName("");
      })
      .catch(function handleErr() {
        alert("Failed to create sample file.");
      });
  }

  if (!owner || !repo) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          gap: 12,
          color: "var(--color-text-muted)",
          padding: 24,
          textAlign: "center",
          fontFamily: "var(--font-inter), system-ui, sans-serif",
          fontSize: 13,
        }}
      >
        <Sparkles size={32} strokeWidth={1} style={{ opacity: 0.5 }} />
        <span>Open a book to view your voice guide</span>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        fontFamily: "var(--font-inter), system-ui, sans-serif",
        fontSize: 12,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 12px",
          borderBottom: "1px solid var(--color-border)",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: "var(--color-text-muted)",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
          }}
        >
          Voice Guide
        </span>
        <div style={{ display: "flex", gap: 4 }}>
          {!editing ? (
            <button
              onClick={handleEdit}
              title="Edit"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
                padding: "3px 8px",
                border: "none",
                background: "none",
                color: "var(--color-text-muted)",
                cursor: "pointer",
                borderRadius: 4,
                fontSize: 11,
                fontFamily: "inherit",
              }}
              onMouseEnter={function handleEnter(e) {
                e.currentTarget.style.backgroundColor = "var(--color-surface-hover)";
              }}
              onMouseLeave={function handleLeave(e) {
                e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              <Pencil size={12} />
              Edit
            </button>
          ) : (
            <>
              <button
                onClick={handleCancelEdit}
                style={{
                  fontSize: 11,
                  padding: "3px 8px",
                  border: "1px solid var(--color-border)",
                  borderRadius: 4,
                  background: "none",
                  color: "var(--color-text-muted)",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  fontSize: 11,
                  padding: "3px 8px",
                  border: "none",
                  borderRadius: 4,
                  backgroundColor: "var(--color-accent)",
                  color: "#fff",
                  cursor: saving ? "default" : "pointer",
                  opacity: saving ? 0.6 : 1,
                  fontFamily: "inherit",
                }}
              >
                <Save size={12} />
                {saving ? "Saving..." : "Save"}
              </button>
            </>
          )}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto" }}>
        {loading ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 24,
              color: "var(--color-text-muted)",
            }}
          >
            <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : editing ? (
          <div style={{ padding: 8 }}>
            <textarea
              value={editContent}
              onChange={function handleChange(e) {
                setEditContent(e.target.value);
              }}
              style={{
                width: "100%",
                minHeight: 200,
                fontSize: 12,
                fontFamily: "var(--font-literata), serif",
                padding: "10px 12px",
                border: "1px solid var(--color-border)",
                borderRadius: 6,
                backgroundColor: "var(--color-bg)",
                color: "var(--color-text)",
                outline: "none",
                resize: "vertical",
                lineHeight: 1.6,
                boxSizing: "border-box",
              }}
            />
          </div>
        ) : (
          <div style={{ padding: "10px 14px" }}>
            {voiceContent ? (
              <div
                style={{
                  fontSize: 12,
                  lineHeight: 1.6,
                  color: "var(--color-text)",
                  fontFamily: "var(--font-literata), serif",
                }}
              >
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {voiceContent}
                </ReactMarkdown>
              </div>
            ) : (
              <div
                style={{
                  color: "var(--color-text-muted)",
                  fontSize: 12,
                  textAlign: "center",
                  padding: "16px 0",
                }}
              >
                No voice.md file found. Click Edit to create one.
              </div>
            )}
          </div>
        )}

        <div
          style={{
            borderTop: "1px solid var(--color-border)",
            padding: "10px 12px",
          }}
        >
          <button
            onClick={handleAnalyzeVoice}
            disabled={analyzing || !keysStored}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              width: "100%",
              padding: "7px 12px",
              fontSize: 12,
              fontFamily: "inherit",
              fontWeight: 500,
              border: "1px solid var(--color-accent)",
              borderRadius: 6,
              backgroundColor: "color-mix(in srgb, var(--color-accent) 8%, transparent)",
              color: "var(--color-accent)",
              cursor: analyzing || !keysStored ? "default" : "pointer",
              opacity: analyzing || !keysStored ? 0.5 : 1,
              transition: "background 150ms",
            }}
          >
            {analyzing ? (
              <>
                <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles size={13} />
                Analyze Voice
                <span
                  style={{
                    fontSize: 10,
                    opacity: 0.7,
                    marginLeft: 2,
                  }}
                >
                  (~$0.04)
                </span>
              </>
            )}
          </button>
        </div>

        <div
          style={{
            borderTop: "1px solid var(--color-border)",
            padding: "8px 12px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 6,
            }}
          >
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "var(--color-text-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              Writing Samples
            </span>
            <button
              onClick={function handleAddSample() {
                setShowNewSample(true);
              }}
              title="Add Sample"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 3,
                padding: "2px 6px",
                border: "none",
                background: "none",
                color: "var(--color-text-muted)",
                cursor: "pointer",
                borderRadius: 4,
                fontSize: 11,
                fontFamily: "inherit",
              }}
              onMouseEnter={function handleEnter(e) {
                e.currentTarget.style.backgroundColor = "var(--color-surface-hover)";
              }}
              onMouseLeave={function handleLeave(e) {
                e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              <Plus size={12} />
              Add Sample
            </button>
          </div>

          {showNewSample && (
            <div
              style={{
                display: "flex",
                gap: 4,
                marginBottom: 6,
              }}
            >
              <input
                type="text"
                value={newSampleName}
                onChange={function handleChange(e) {
                  setNewSampleName(e.target.value);
                }}
                onKeyDown={function handleKey(e) {
                  if (e.key === "Enter") handleCreateSample();
                  if (e.key === "Escape") {
                    setShowNewSample(false);
                    setNewSampleName("");
                  }
                }}
                placeholder="sample.md"
                autoFocus
                style={{
                  flex: 1,
                  fontSize: 12,
                  padding: "4px 8px",
                  border: "1px solid var(--color-border)",
                  borderRadius: 4,
                  backgroundColor: "var(--color-bg)",
                  color: "var(--color-text)",
                  outline: "none",
                  fontFamily: "inherit",
                }}
              />
              <button
                onClick={handleCreateSample}
                style={{
                  fontSize: 11,
                  padding: "3px 8px",
                  border: "none",
                  borderRadius: 4,
                  backgroundColor: "var(--color-accent)",
                  color: "#fff",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                Add
              </button>
            </div>
          )}

          {samplesLoading ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 12,
                color: "var(--color-text-muted)",
              }}
            >
              <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
            </div>
          ) : samples.length === 0 ? (
            <div
              style={{
                color: "var(--color-text-muted)",
                fontSize: 11,
                textAlign: "center",
                padding: "8px 0",
              }}
            >
              No writing samples yet.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {samples.map(function renderSample(sample) {
                return (
                  <div
                    key={sample.path}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "4px 6px",
                      borderRadius: 4,
                      cursor: "pointer",
                      transition: "background 100ms",
                    }}
                    onMouseEnter={function handleEnter(e) {
                      e.currentTarget.style.backgroundColor = "var(--color-surface-hover)";
                    }}
                    onMouseLeave={function handleLeave(e) {
                      e.currentTarget.style.backgroundColor = "transparent";
                    }}
                  >
                    <FileText
                      size={13}
                      style={{ flexShrink: 0, color: "var(--color-text-muted)", opacity: 0.7 }}
                    />
                    <span
                      style={{
                        flex: 1,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        color: "var(--color-text)",
                        fontSize: 12,
                      }}
                    >
                      {sample.name}
                    </span>
                    {sample.size != null && sample.size > 0 && (
                      <span
                        style={{
                          fontSize: 10,
                          color: "var(--color-text-muted)",
                          flexShrink: 0,
                        }}
                      >
                        {formatTokenCount(estimateTokens("x".repeat(sample.size)))}t
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div
          style={{
            borderTop: "1px solid var(--color-border)",
            padding: "10px 12px",
          }}
        >
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "var(--color-text-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              display: "block",
              marginBottom: 8,
            }}
          >
            Style Metrics
          </span>
          <div
            style={{
              padding: "12px 10px",
              borderRadius: 6,
              border: "1px dashed var(--color-border)",
              backgroundColor: "var(--color-bg)",
              color: "var(--color-text-muted)",
              fontSize: 11,
              textAlign: "center",
              lineHeight: 1.5,
            }}
          >
            Run Analyze Voice to see style metrics
          </div>
        </div>
      </div>
    </div>
  );
}
