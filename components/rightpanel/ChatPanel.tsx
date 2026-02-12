"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Trash2, BookOpen, Search, Pencil, Star, MessageSquare, Bookmark, Save } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useAppStore } from "@/store";
import { getItem, setItem } from "@/lib/storage";
import { estimateTokens, formatTokenCount } from "@/lib/tokens";
import type { ChatMessage } from "@/types";
import DiffHunk from "@/components/shared/DiffHunk";
import { getBookConfig } from "@/lib/bookConfig";

type ChatMode = "writing" | "critique" | "research" | "revision";

interface RevisionNote {
  id: string;
  text: string;
  chapterId?: string;
  timestamp: number;
}

const MODE_META: { key: ChatMode; label: string; icon: typeof MessageSquare }[] = [
  { key: "writing", label: "Writing", icon: MessageSquare },
  { key: "critique", label: "Critique", icon: Star },
  { key: "research", label: "Research", icon: Search },
  { key: "revision", label: "Revision", icon: Pencil },
];

function StreamingDots() {
  return (
    <span style={{ display: "inline-flex", gap: 3, padding: "4px 0" }}>
      {[0, 1, 2].map(function renderDot(i) {
        return (
          <span
            key={i}
            style={{
              width: 5,
              height: 5,
              borderRadius: "50%",
              backgroundColor: "var(--color-accent)",
              animation: `dotPulse 1.2s ease-in-out ${i * 0.2}s infinite`,
            }}
          />
        );
      })}
      <style>{`
        @keyframes dotPulse {
          0%, 60%, 100% { opacity: 0.3; transform: scale(0.8); }
          30% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </span>
  );
}

interface EditBlock {
  oldText: string;
  newText: string;
  index: number;
}

function parseEditBlocks(content: string): { text: string; edits: EditBlock[] } {
  const edits: EditBlock[] = [];
  let idx = 0;
  const cleaned = content.replace(/```edit\n([\s\S]*?)```/g, function replaceEdit(_, inner) {
    edits.push({ oldText: "", newText: inner.trim(), index: idx++ });
    return `[[EDIT_BLOCK_${idx - 1}]]`;
  });
  return { text: cleaned, edits };
}

function chatStorageKey(repoKey: string, mode: ChatMode): string {
  return `scriva:chat:${repoKey}:${mode}`;
}

function revisionStorageKey(repoKey: string): string {
  return `scriva:revision-notes:${repoKey}`;
}

export default function ChatPanel() {
  const preferences = useAppStore(function selectPrefs(s) {
    return s.preferences;
  });
  const currentBook = useAppStore(function selectBook(s) {
    return s.editor.currentBook;
  });
  const currentChapter = useAppStore(function selectChapter(s) {
    return s.editor.currentChapter;
  });

  const repoKey = currentBook || "default";
  const [mode, setMode] = useState<ChatMode>("writing");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [revisionNotes, setRevisionNotes] = useState<RevisionNote[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState("");
  const [model, setModel] = useState<"haiku" | "sonnet">(preferences.defaultModel);
  const [acceptedEdits, setAcceptedEdits] = useState<Record<string, boolean>>({});
  const [savingPlan, setSavingPlan] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(function loadHistory() {
    setMessages(getItem<ChatMessage[]>(chatStorageKey(repoKey, mode), []));
    if (mode === "revision") {
      setRevisionNotes(getItem<RevisionNote[]>(revisionStorageKey(repoKey), []));
    }
  }, [repoKey, mode]);

  useEffect(function scrollToBottom() {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamText, revisionNotes]);

  const persistMessages = useCallback(function persistMessages(msgs: ChatMessage[]) {
    setMessages(msgs);
    setItem(chatStorageKey(repoKey, mode), msgs);
  }, [repoKey, mode]);

  function persistNotes(notes: RevisionNote[]) {
    setRevisionNotes(notes);
    setItem(revisionStorageKey(repoKey), notes);
  }

  function handleClearChat() {
    if (mode === "revision") {
      persistNotes([]);
    }
    persistMessages([]);
    setStreamText("");
    setAcceptedEdits({});
  }

  function handleModeChange(newMode: ChatMode) {
    if (newMode === mode) return;
    setMode(newMode);
    setInput("");
    setStreamText("");
  }

  function handleAddRevisionNote() {
    const text = input.trim();
    if (!text) return;

    const note: RevisionNote = {
      id: `note-${Date.now()}`,
      text,
      chapterId: currentChapter,
      timestamp: Date.now(),
    };

    persistNotes([...revisionNotes, note]);
    setInput("");
  }

  function buildCritiqueMessage(text: string): string {
    if (currentChapter) {
      return `[Current chapter: ${currentChapter}]\n\n${text}`;
    }
    return text;
  }

  function buildResearchFirstMessage(text: string): string {
    return (
      "You are a deep research assistant for a book project. " +
      "The user will describe a topic they need researched. " +
      "Provide a thorough, well-structured research brief with sources, key facts, " +
      "historical context, and connections relevant to their book. " +
      "Be comprehensive but organized.\n\n" +
      "Research request: " + text
    );
  }

  function buildRevisionPlanPrompt(notes: RevisionNote[]): string {
    const notesList = notes
      .map(function formatNote(n, i) {
        const chapter = n.chapterId ? ` (chapter: ${n.chapterId})` : "";
        return `${i + 1}. ${n.text}${chapter}`;
      })
      .join("\n");

    return (
      "You are a revision planning assistant. The author has collected the following revision notes " +
      "while reviewing their manuscript. Create a structured, actionable revision plan organized by priority " +
      "and chapter. Group related notes together and suggest an order of operations.\n\n" +
      "Revision notes:\n" + notesList
    );
  }

  function getRevisionPlanTokenEstimate(): number {
    const prompt = buildRevisionPlanPrompt(revisionNotes);
    return estimateTokens(prompt);
  }

  async function handleGenerateRevisionPlan() {
    if (revisionNotes.length === 0 || streaming) return;
    if (!preferences.keysStored) return;

    const prompt = buildRevisionPlanPrompt(revisionNotes);

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: "Generate revision plan from " + revisionNotes.length + " notes",
      timestamp: Date.now(),
    };

    const updatedMessages = [...messages, userMsg];
    persistMessages(updatedMessages);
    setStreaming(true);
    setStreamText("");

    const abortController = new AbortController();
    abortRef.current = abortController;

    try {
      const apiMessages = [{ role: "user" as const, content: prompt }];

      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: apiMessages,
          mode: "revision-plan",
          model,
        }),
        signal: abortController.signal,
      });

      if (!res.ok) {
        throw new Error(`API error: ${res.status}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let fullResponse = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          if (data === "[DONE]") continue;

          try {
            const parsed = JSON.parse(data);
            if (parsed.text) {
              fullResponse += parsed.text;
              setStreamText(fullResponse);
            }
            if (parsed.error) {
              throw new Error(parsed.error);
            }
          } catch (e) {
            if (e instanceof SyntaxError) continue;
            throw e;
          }
        }
      }

      const assistantMsg: ChatMessage = {
        id: `msg-${Date.now()}`,
        role: "assistant",
        content: fullResponse,
        timestamp: Date.now(),
      };

      persistMessages([...updatedMessages, assistantMsg]);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      const errorMsg: ChatMessage = {
        id: `msg-${Date.now()}`,
        role: "assistant",
        content: `Error: ${err instanceof Error ? err.message : "Unknown error"}`,
        timestamp: Date.now(),
      };
      persistMessages([...updatedMessages, errorMsg]);
    } finally {
      setStreaming(false);
      setStreamText("");
      abortRef.current = null;
    }
  }

  async function handleSaveRevisionPlan() {
    const lastAssistant = [...messages].reverse().find(function findAssistant(m) {
      return m.role === "assistant";
    });
    if (!lastAssistant) return;

    const config = getBookConfig(currentBook);
    if (!config) return;

    setSavingPlan(true);
    try {
      await fetch("/api/github/files", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner: config.owner,
          repo: config.repo,
          branch: config.branch,
          path: "revision-plan.md",
          content: lastAssistant.content,
          message: "Add revision plan",
        }),
      });
    } catch {
    } finally {
      setSavingPlan(false);
    }
  }

  async function handleSend() {
    if (mode === "revision") {
      handleAddRevisionNote();
      return;
    }

    const text = input.trim();
    if (!text || streaming) return;
    if (!preferences.keysStored) return;

    let messageContent = text;
    let apiMode = mode as string;

    if (mode === "critique") {
      messageContent = buildCritiqueMessage(text);
      apiMode = "critique";
    }

    if (mode === "research" && messages.length === 0) {
      messageContent = buildResearchFirstMessage(text);
      apiMode = "research";
    }

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: Date.now(),
    };

    const updatedMessages = [...messages, userMsg];
    persistMessages(updatedMessages);
    setInput("");
    setStreaming(true);
    setStreamText("");

    const abortController = new AbortController();
    abortRef.current = abortController;

    try {
      const apiMessages = updatedMessages.map(function toApiMsg(m, i) {
        if (i === updatedMessages.length - 1) {
          return { role: m.role, content: messageContent };
        }
        return { role: m.role, content: m.content };
      });

      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: apiMessages,
          mode: apiMode,
          model,
        }),
        signal: abortController.signal,
      });

      if (!res.ok) {
        throw new Error(`API error: ${res.status}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let fullResponse = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          if (data === "[DONE]") continue;

          try {
            const parsed = JSON.parse(data);
            if (parsed.text) {
              fullResponse += parsed.text;
              setStreamText(fullResponse);
            }
            if (parsed.error) {
              throw new Error(parsed.error);
            }
          } catch (e) {
            if (e instanceof SyntaxError) continue;
            throw e;
          }
        }
      }

      const assistantMsg: ChatMessage = {
        id: `msg-${Date.now()}`,
        role: "assistant",
        content: fullResponse,
        timestamp: Date.now(),
      };

      persistMessages([...updatedMessages, assistantMsg]);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      const errorMsg: ChatMessage = {
        id: `msg-${Date.now()}`,
        role: "assistant",
        content: `Error: ${err instanceof Error ? err.message : "Unknown error"}`,
        timestamp: Date.now(),
      };
      persistMessages([...updatedMessages, errorMsg]);
    } finally {
      setStreaming(false);
      setStreamText("");
      abortRef.current = null;
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleEditAccept(msgId: string, editIdx: number) {
    setAcceptedEdits(function update(prev) {
      return { ...prev, [`${msgId}-${editIdx}`]: true };
    });
  }

  function handleEditReject(msgId: string, editIdx: number) {
    setAcceptedEdits(function update(prev) {
      return { ...prev, [`${msgId}-${editIdx}`]: false };
    });
  }

  function renderMessageContent(msg: ChatMessage) {
    const { text, edits } = parseEditBlocks(msg.content);

    if (edits.length === 0) {
      return (
        <div style={{ fontSize: 13, lineHeight: 1.6 }}>
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              code: function renderCode({ children, className }) {
                const isInline = !className;
                if (isInline) {
                  return (
                    <code
                      style={{
                        fontFamily: "var(--font-jetbrains-mono), monospace",
                        fontSize: 12,
                        backgroundColor: "var(--color-surface-hover)",
                        padding: "1px 4px",
                        borderRadius: 3,
                      }}
                    >
                      {children}
                    </code>
                  );
                }
                return (
                  <pre
                    style={{
                      fontFamily: "var(--font-jetbrains-mono), monospace",
                      fontSize: 12,
                      backgroundColor: "var(--color-bg)",
                      padding: 12,
                      borderRadius: 6,
                      overflowX: "auto",
                      margin: "8px 0",
                    }}
                  >
                    <code>{children}</code>
                  </pre>
                );
              },
              p: function renderP({ children }) {
                return <p style={{ margin: "6px 0" }}>{children}</p>;
              },
            }}
          >
            {text}
          </ReactMarkdown>
        </div>
      );
    }

    const parts = text.split(/\[\[EDIT_BLOCK_(\d+)\]\]/);
    return (
      <div style={{ fontSize: 13, lineHeight: 1.6 }}>
        {parts.map(function renderPart(part, i) {
          if (i % 2 === 1) {
            const editIdx = parseInt(part, 10);
            const edit = edits[editIdx];
            if (!edit) return null;
            const key = `${msg.id}-${editIdx}`;
            const state = acceptedEdits[key];
            if (state === true) {
              return (
                <span
                  key={key}
                  style={{
                    color: "var(--color-success)",
                    fontStyle: "italic",
                    fontSize: 12,
                  }}
                >
                  Change applied
                </span>
              );
            }
            if (state === false) {
              return (
                <span
                  key={key}
                  style={{
                    color: "var(--color-text-muted)",
                    fontStyle: "italic",
                    fontSize: 12,
                  }}
                >
                  Change rejected
                </span>
              );
            }
            return (
              <DiffHunk
                key={key}
                oldText={edit.oldText}
                newText={edit.newText}
                onAccept={function accept() {
                  handleEditAccept(msg.id, editIdx);
                }}
                onReject={function reject() {
                  handleEditReject(msg.id, editIdx);
                }}
              />
            );
          }
          return (
            <ReactMarkdown key={i} remarkPlugins={[remarkGfm]}>
              {part}
            </ReactMarkdown>
          );
        })}
      </div>
    );
  }

  function getEmptyStateText(): string {
    switch (mode) {
      case "writing":
        return "Ask about your book, get writing help, or request edits.";
      case "critique":
        return "Get structural feedback on your chapters. Your current chapter is included automatically.";
      case "research":
        return "Describe a topic to research. The first message builds a deep research brief.";
      case "revision":
        return "Add revision notes as you review. Generate a plan when ready.";
    }
  }

  function getPlaceholderText(): string {
    if (!preferences.keysStored) return "Set API key in settings";
    switch (mode) {
      case "writing":
        return "Ask about your book...";
      case "critique":
        return "Ask for structural feedback...";
      case "research":
        return "Describe what to research...";
      case "revision":
        return "Add a revision note...";
    }
  }

  const tokenEstimate = estimateTokens(input);
  const hasRevisionPlan = mode === "revision" && messages.some(function findPlan(m) {
    return m.role === "assistant";
  });

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        minHeight: 0,
        fontFamily: "var(--font-inter), system-ui, sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "6px 12px",
          borderBottom: "1px solid var(--color-border)",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", gap: 2 }}>
          {MODE_META.map(function renderModeBtn(m) {
            const isActive = mode === m.key;
            const Icon = m.icon;
            return (
              <button
                key={m.key}
                onClick={function selectMode() {
                  handleModeChange(m.key);
                }}
                title={m.label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "4px 8px",
                  fontSize: 11,
                  fontFamily: "inherit",
                  fontWeight: isActive ? 600 : 400,
                  border: "1px solid",
                  borderColor: isActive ? "var(--color-accent)" : "transparent",
                  borderRadius: 12,
                  backgroundColor: isActive
                    ? "color-mix(in srgb, var(--color-accent) 10%, transparent)"
                    : "transparent",
                  color: isActive ? "var(--color-accent)" : "var(--color-text-muted)",
                  cursor: "pointer",
                  transition: "all 150ms",
                }}
              >
                <Icon size={12} />
                {m.label}
              </button>
            );
          })}
        </div>
        <button
          onClick={handleClearChat}
          title="Clear chat"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 28,
            height: 28,
            background: "none",
            border: "none",
            borderRadius: 4,
            color: "var(--color-text-muted)",
            cursor: "pointer",
          }}
        >
          <Trash2 size={14} />
        </button>
      </div>

      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "12px",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        {messages.length === 0 && revisionNotes.length === 0 && !streaming && (
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--color-text-muted)",
              fontSize: 13,
              textAlign: "center",
              padding: 24,
            }}
          >
            {getEmptyStateText()}
          </div>
        )}

        {mode === "revision" && revisionNotes.map(function renderNote(note) {
          return (
            <div
              key={note.id}
              style={{
                display: "flex",
                justifyContent: "flex-end",
              }}
            >
              <div
                style={{
                  maxWidth: "88%",
                  padding: "8px 12px",
                  borderRadius: 12,
                  backgroundColor: "color-mix(in srgb, var(--color-text-muted) 8%, transparent)",
                  color: "var(--color-text)",
                  fontSize: 13,
                  lineHeight: 1.6,
                  wordBreak: "break-word",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 8,
                }}
              >
                <Bookmark
                  size={14}
                  style={{
                    flexShrink: 0,
                    marginTop: 3,
                    color: "var(--color-text-muted)",
                  }}
                />
                <div>
                  <div style={{ fontSize: 10, color: "var(--color-text-muted)", marginBottom: 2 }}>
                    {note.chapterId ? note.chapterId : "General"}
                  </div>
                  {note.text}
                </div>
              </div>
            </div>
          );
        })}

        {messages.map(function renderMessage(msg) {
          const isUser = msg.role === "user";
          return (
            <div
              key={msg.id}
              style={{
                display: "flex",
                justifyContent: isUser ? "flex-end" : "flex-start",
              }}
            >
              <div
                style={{
                  maxWidth: "88%",
                  padding: "8px 12px",
                  borderRadius: 12,
                  backgroundColor: isUser
                    ? "color-mix(in srgb, var(--color-accent) 12%, transparent)"
                    : "var(--color-surface)",
                  color: "var(--color-text)",
                  fontSize: 13,
                  lineHeight: 1.6,
                  wordBreak: "break-word",
                }}
              >
                {isUser ? msg.content : renderMessageContent(msg)}
              </div>
            </div>
          );
        })}

        {streaming && (
          <div style={{ display: "flex", justifyContent: "flex-start" }}>
            <div
              style={{
                maxWidth: "88%",
                padding: "8px 12px",
                borderRadius: 12,
                backgroundColor: "var(--color-surface)",
                color: "var(--color-text)",
                fontSize: 13,
                lineHeight: 1.6,
              }}
            >
              {streamText ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{streamText}</ReactMarkdown>
              ) : (
                <StreamingDots />
              )}
            </div>
          </div>
        )}
      </div>

      {mode === "revision" && revisionNotes.length > 0 && !streaming && (
        <div
          style={{
            padding: "8px 12px",
            borderTop: "1px solid var(--color-border)",
            display: "flex",
            flexDirection: "column",
            gap: 6,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: 11,
              color: "var(--color-text-muted)",
            }}
          >
            <span>{revisionNotes.length} note{revisionNotes.length !== 1 ? "s" : ""}</span>
            <span>~{formatTokenCount(getRevisionPlanTokenEstimate())} tokens</span>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              onClick={handleGenerateRevisionPlan}
              disabled={!preferences.keysStored}
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                padding: "6px 12px",
                fontSize: 12,
                fontFamily: "inherit",
                fontWeight: 600,
                border: "none",
                borderRadius: 8,
                backgroundColor: "var(--color-accent)",
                color: "#fff",
                cursor: preferences.keysStored ? "pointer" : "default",
                opacity: preferences.keysStored ? 1 : 0.5,
                transition: "opacity 150ms",
              }}
            >
              <BookOpen size={14} />
              Generate Revision Plan
            </button>
            {hasRevisionPlan && (
              <button
                onClick={handleSaveRevisionPlan}
                disabled={savingPlan}
                title="Save to repo as revision-plan.md"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  border: "1px solid var(--color-border)",
                  backgroundColor: "transparent",
                  color: savingPlan ? "var(--color-text-muted)" : "var(--color-accent)",
                  cursor: savingPlan ? "default" : "pointer",
                  flexShrink: 0,
                  transition: "color 150ms",
                }}
              >
                <Save size={14} />
              </button>
            )}
          </div>
        </div>
      )}

      <div
        style={{
          borderTop: "1px solid var(--color-border)",
          padding: "8px 12px",
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          gap: 6,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: 11,
            color: "var(--color-text-muted)",
          }}
        >
          <div style={{ display: "flex", gap: 4 }}>
            <button
              onClick={function selectHaiku() {
                setModel("haiku");
              }}
              style={{
                padding: "2px 8px",
                fontSize: 11,
                fontFamily: "inherit",
                border: "1px solid",
                borderColor: model === "haiku" ? "var(--color-accent)" : "var(--color-border)",
                borderRadius: 4,
                backgroundColor: model === "haiku" ? "color-mix(in srgb, var(--color-accent) 10%, transparent)" : "transparent",
                color: model === "haiku" ? "var(--color-accent)" : "var(--color-text-muted)",
                cursor: "pointer",
              }}
            >
              Haiku
            </button>
            <button
              onClick={function selectSonnet() {
                setModel("sonnet");
              }}
              style={{
                padding: "2px 8px",
                fontSize: 11,
                fontFamily: "inherit",
                border: "1px solid",
                borderColor: model === "sonnet" ? "var(--color-accent)" : "var(--color-border)",
                borderRadius: 4,
                backgroundColor: model === "sonnet" ? "color-mix(in srgb, var(--color-accent) 10%, transparent)" : "transparent",
                color: model === "sonnet" ? "var(--color-accent)" : "var(--color-text-muted)",
                cursor: "pointer",
              }}
            >
              Sonnet
            </button>
          </div>
          {input.length > 0 && (
            <span>{formatTokenCount(tokenEstimate)} tokens</span>
          )}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            gap: 6,
          }}
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={function handleChange(e) {
              setInput(e.target.value);
            }}
            onKeyDown={handleKeyDown}
            placeholder={getPlaceholderText()}
            disabled={mode !== "revision" && (!preferences.keysStored || streaming)}
            rows={1}
            style={{
              flex: 1,
              resize: "none",
              padding: "8px 10px",
              fontSize: 13,
              fontFamily: "var(--font-inter), system-ui, sans-serif",
              lineHeight: 1.5,
              backgroundColor: "var(--color-bg)",
              color: "var(--color-text)",
              border: "1px solid var(--color-border)",
              borderRadius: 8,
              outline: "none",
              minHeight: 36,
              maxHeight: 120,
            }}
          />
          <button
            onClick={handleSend}
            disabled={
              mode === "revision"
                ? !input.trim()
                : !input.trim() || streaming || !preferences.keysStored
            }
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
              height: 36,
              paddingLeft: mode === "revision" ? 12 : 0,
              paddingRight: mode === "revision" ? 12 : 0,
              width: mode === "revision" ? "auto" : 36,
              borderRadius: 8,
              border: "none",
              fontSize: 12,
              fontFamily: "inherit",
              fontWeight: 500,
              backgroundColor:
                (mode === "revision" ? input.trim() : input.trim() && !streaming && preferences.keysStored)
                  ? "var(--color-accent)"
                  : "var(--color-surface-hover)",
              color:
                (mode === "revision" ? input.trim() : input.trim() && !streaming && preferences.keysStored)
                  ? "#fff"
                  : "var(--color-text-muted)",
              cursor:
                (mode === "revision" ? input.trim() : input.trim() && !streaming && preferences.keysStored)
                  ? "pointer"
                  : "default",
              flexShrink: 0,
              transition: "background-color 150ms, color 150ms",
            }}
          >
            {mode === "revision" ? (
              <>
                <Bookmark size={14} />
                Add Note
              </>
            ) : (
              <Send size={16} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
