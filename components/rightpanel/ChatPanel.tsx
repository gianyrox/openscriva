"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Send, Trash2, BookOpen, Search, Pencil, MessageSquare, Bookmark, Save,
  ChevronUp, Plus, X, Check, FileText, Edit3,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import posthog from "posthog-js";
import { useAppStore } from "@/store";
import { getItem, setItem } from "@/lib/storage";
import { estimateTokens, formatTokenCount } from "@/lib/tokens";
import type { ChatMessage, ModelId } from "@/types";
import DiffHunk from "@/components/shared/DiffHunk";
import { getBookConfig } from "@/lib/bookConfig";

type ChatMode = "chat" | "write" | "research" | "revision";

interface RevisionNote {
  id: string;
  text: string;
  chapterId?: string;
  timestamp: number;
}

interface Conversation {
  id: string;
  name: string;
  createdAt: number;
  lastMessage: string;
}

var MODE_META: { key: ChatMode; label: string; desc: string; icon: typeof MessageSquare }[] = [
  { key: "chat", label: "Chat", desc: "Discuss your book", icon: MessageSquare },
  { key: "write", label: "Write", desc: "Write & edit with AI", icon: Edit3 },
  { key: "revision", label: "Revision", desc: "Plan & implement revisions", icon: Pencil },
  { key: "research", label: "Research", desc: "Deep research briefs", icon: Search },
];

var MODEL_OPTIONS: { key: ModelId; label: string }[] = [
  { key: "haiku", label: "Haiku" },
  { key: "sonnet", label: "Sonnet" },
  { key: "opus", label: "Opus" },
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
              animation: "dotPulse 1.2s ease-in-out " + i * 0.2 + "s infinite",
            }}
          />
        );
      })}
      <style>{"\n@keyframes dotPulse {\n  0%, 60%, 100% { opacity: 0.3; transform: scale(0.8); }\n  30% { opacity: 1; transform: scale(1); }\n}\n"}</style>
    </span>
  );
}

interface EditBlock {
  oldText: string;
  newText: string;
  index: number;
}

function parseEditBlocks(content: string): { text: string; edits: EditBlock[] } {
  var edits: EditBlock[] = [];
  var idx = 0;
  var cleaned = content.replace(/```edit\n([\s\S]*?)```/g, function replaceEdit(_, inner) {
    edits.push({ oldText: "", newText: inner.trim(), index: idx++ });
    return "[[EDIT_BLOCK_" + (idx - 1) + "]]";
  });
  return { text: cleaned, edits: edits };
}

function conversationIndexKey(repoKey: string, mode: ChatMode): string {
  return "scriva:conversations:" + repoKey + ":" + mode;
}

function chatStorageKey(repoKey: string, mode: ChatMode, convId: string): string {
  return "scriva:chat:" + repoKey + ":" + mode + ":" + convId;
}

function revisionStorageKey(repoKey: string): string {
  return "scriva:revision-notes:" + repoKey;
}

function loadConversations(repoKey: string, mode: ChatMode): Conversation[] {
  return getItem<Conversation[]>(conversationIndexKey(repoKey, mode), []);
}

function saveConversations(repoKey: string, mode: ChatMode, convs: Conversation[]) {
  setItem(conversationIndexKey(repoKey, mode), convs);
}

function createConversation(name?: string): Conversation {
  return {
    id: "conv-" + Date.now() + "-" + Math.random().toString(36).substring(2, 7),
    name: name || "New Chat",
    createdAt: Date.now(),
    lastMessage: "",
  };
}

function getPendingEditKeys(messages: ChatMessage[]): string[] {
  var keys: string[] = [];
  for (var i = 0; i < messages.length; i++) {
    var msg = messages[i];
    if (msg.role !== "assistant") continue;
    var parsed = parseEditBlocks(msg.content);
    for (var j = 0; j < parsed.edits.length; j++) {
      keys.push(msg.id + "-" + parsed.edits[j].index);
    }
  }
  return keys;
}

export default function ChatPanel() {
  var preferences = useAppStore(function selectPrefs(s) {
    return s.preferences;
  });
  var currentBook = useAppStore(function selectBook(s) {
    return s.editor.currentBook;
  });
  var currentChapter = useAppStore(function selectChapter(s) {
    return s.editor.currentChapter;
  });

  var repoKey = currentBook || "default";
  var [mode, setMode] = useState<ChatMode>("chat");
  var [modeOpen, setModeOpen] = useState(false);
  var [modelOpen, setModelOpen] = useState(false);
  var [convListOpen, setConvListOpen] = useState(false);

  var [conversations, setConversations] = useState<Conversation[]>([]);
  var [activeConvId, setActiveConvId] = useState<string>("");
  var [messages, setMessages] = useState<ChatMessage[]>([]);
  var [revisionNotes, setRevisionNotes] = useState<RevisionNote[]>([]);
  var [input, setInput] = useState("");
  var [streaming, setStreaming] = useState(false);
  var [streamText, setStreamText] = useState("");
  var [model, setModel] = useState<ModelId>(preferences.defaultModel);
  var [acceptedEdits, setAcceptedEdits] = useState<Record<string, boolean>>({});
  var [savingPlan, setSavingPlan] = useState(false);
  var [savingResearch, setSavingResearch] = useState(false);
  var scrollRef = useRef<HTMLDivElement>(null);
  var inputRef = useRef<HTMLTextAreaElement>(null);
  var abortRef = useRef<AbortController | null>(null);
  var modeRef = useRef<HTMLDivElement>(null);
  var modelRef = useRef<HTMLDivElement>(null);
  var convRef = useRef<HTMLDivElement>(null);

  useEffect(function initConversations() {
    var convs = loadConversations(repoKey, mode);
    if (convs.length === 0) {
      var first = createConversation();
      convs = [first];
      saveConversations(repoKey, mode, convs);
    }
    setConversations(convs);
    setActiveConvId(convs[0].id);
  }, [repoKey, mode]);

  useEffect(function loadHistory() {
    if (!activeConvId) return;
    setMessages(getItem<ChatMessage[]>(chatStorageKey(repoKey, mode, activeConvId), []));
    setAcceptedEdits({});
    if (mode === "revision") {
      setRevisionNotes(getItem<RevisionNote[]>(revisionStorageKey(repoKey), []));
    }
  }, [repoKey, mode, activeConvId]);

  useEffect(function scrollToBottom() {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamText, revisionNotes]);

  useEffect(function listenAddToChat() {
    function handler(e: Event) {
      var detail = (e as CustomEvent).detail;
      if (detail && detail.text) {
        setInput(function prev(p) { return p ? p + "\n\n" + detail.text : detail.text; });
        if (inputRef.current) inputRef.current.focus();
      }
    }
    window.addEventListener("scriva:add-note-to-chat", handler);
    return function cleanup() {
      window.removeEventListener("scriva:add-note-to-chat", handler);
    };
  }, []);

  useEffect(function closeDropdowns() {
    function handler(e: MouseEvent) {
      if (modeRef.current && !modeRef.current.contains(e.target as Node)) setModeOpen(false);
      if (modelRef.current && !modelRef.current.contains(e.target as Node)) setModelOpen(false);
      if (convRef.current && !convRef.current.contains(e.target as Node)) setConvListOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return function cleanup() { document.removeEventListener("mousedown", handler); };
  }, []);

  var persistMessages = useCallback(function persistMessages(msgs: ChatMessage[]) {
    setMessages(msgs);
    if (activeConvId) {
      setItem(chatStorageKey(repoKey, mode, activeConvId), msgs);
      var lastMsg = msgs.length > 0 ? msgs[msgs.length - 1].content.substring(0, 60) : "";
      setConversations(function prev(convs) {
        var updated = convs.map(function mapConv(c) {
          return c.id === activeConvId ? { ...c, lastMessage: lastMsg } : c;
        });
        saveConversations(repoKey, mode, updated);
        return updated;
      });
    }
  }, [repoKey, mode, activeConvId]);

  function persistNotes(notes: RevisionNote[]) {
    setRevisionNotes(notes);
    setItem(revisionStorageKey(repoKey), notes);
  }

  function handleNewConversation() {
    var conv = createConversation();
    var updated = [conv, ...conversations];
    setConversations(updated);
    saveConversations(repoKey, mode, updated);
    setActiveConvId(conv.id);
    setMessages([]);
    setAcceptedEdits({});
    setConvListOpen(false);
  }

  function handleSwitchConversation(convId: string) {
    setActiveConvId(convId);
    setConvListOpen(false);
  }

  function handleDeleteConversation(convId: string) {
    var updated = conversations.filter(function f(c) { return c.id !== convId; });
    if (updated.length === 0) {
      var fresh = createConversation();
      updated = [fresh];
    }
    setConversations(updated);
    saveConversations(repoKey, mode, updated);
    setItem(chatStorageKey(repoKey, mode, convId), []);
    if (convId === activeConvId) {
      setActiveConvId(updated[0].id);
    }
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
    setModeOpen(false);
  }

  function handleAddRevisionNote() {
    var text = input.trim();
    if (!text) return;

    var note: RevisionNote = {
      id: "note-" + Date.now(),
      text: text,
      chapterId: currentChapter,
      timestamp: Date.now(),
    };

    persistNotes([...revisionNotes, note]);
    setInput("");
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
    var notesList = notes
      .map(function formatNote(n, i) {
        var chapter = n.chapterId ? " (chapter: " + n.chapterId + ")" : "";
        return (i + 1) + ". " + n.text + chapter;
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
    var prompt = buildRevisionPlanPrompt(revisionNotes);
    return estimateTokens(prompt);
  }

  async function streamFromApi(apiMessages: { role: "user" | "assistant"; content: string }[], apiMode: string, onDone: (msgs: ChatMessage[], full: string) => void) {
    var abortController = new AbortController();
    abortRef.current = abortController;

    try {
      var res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: apiMessages,
          mode: apiMode,
          model: model,
        }),
        signal: abortController.signal,
      });

      if (!res.ok) {
        throw new Error("API error: " + res.status);
      }

      var reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");

      var decoder = new TextDecoder();
      var fullResponse = "";

      while (true) {
        var result = await reader.read();
        if (result.done) break;

        var chunk = decoder.decode(result.value, { stream: true });
        var lines = chunk.split("\n");

        for (var k = 0; k < lines.length; k++) {
          var line = lines[k];
          if (!line.startsWith("data: ")) continue;
          var data = line.slice(6);
          if (data === "[DONE]") continue;

          try {
            var parsed = JSON.parse(data);
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

      return fullResponse;
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return "";
      throw err;
    } finally {
      abortRef.current = null;
    }
  }

  async function handleGenerateRevisionPlan() {
    if (revisionNotes.length === 0 || streaming) return;
    if (!preferences.keysStored) return;

    var prompt = buildRevisionPlanPrompt(revisionNotes);

    var userMsg: ChatMessage = {
      id: "msg-" + Date.now(),
      role: "user",
      content: "Generate revision plan from " + revisionNotes.length + " notes",
      timestamp: Date.now(),
    };

    var updatedMessages = [...messages, userMsg];
    persistMessages(updatedMessages);
    setStreaming(true);
    setStreamText("");

    try {
      var fullResponse = await streamFromApi(
        [{ role: "user" as const, content: prompt }],
        "revision-plan",
        function noop() {},
      );

      if (fullResponse) {
        var assistantMsg: ChatMessage = {
          id: "msg-" + Date.now(),
          role: "assistant",
          content: fullResponse,
          timestamp: Date.now(),
        };
        persistMessages([...updatedMessages, assistantMsg]);

        // Track revision plan generated
        posthog.capture("revision_plan_generated", {
          notes_count: revisionNotes.length,
          plan_length: fullResponse.length,
        });
      }
    } catch (err: unknown) {
      var errorMsg: ChatMessage = {
        id: "msg-" + Date.now(),
        role: "assistant",
        content: "Error: " + (err instanceof Error ? err.message : "Unknown error"),
        timestamp: Date.now(),
      };
      persistMessages([...updatedMessages, errorMsg]);
    } finally {
      setStreaming(false);
      setStreamText("");
    }
  }

  async function handleCritiqueChapter() {
    if (streaming || !preferences.keysStored || !currentChapter) return;

    var userMsg: ChatMessage = {
      id: "msg-" + Date.now(),
      role: "user",
      content: "Critique the current chapter: " + currentChapter,
      timestamp: Date.now(),
    };

    var updatedMessages = [...messages, userMsg];
    persistMessages(updatedMessages);
    setStreaming(true);
    setStreamText("");

    try {
      var apiContent = "[Current chapter: " + currentChapter + "]\n\nProvide a structural critique of this chapter. Focus on pacing, character development, tension, narrative promises, dialogue effectiveness, scene transitions, and emotional impact.";
      var fullResponse = await streamFromApi(
        [{ role: "user" as const, content: apiContent }],
        "revision-critique",
        function noop() {},
      );

      if (fullResponse) {
        var assistantMsg: ChatMessage = {
          id: "msg-" + Date.now(),
          role: "assistant",
          content: fullResponse,
          timestamp: Date.now(),
        };
        persistMessages([...updatedMessages, assistantMsg]);
      }
    } catch (err: unknown) {
      var errMsg: ChatMessage = {
        id: "msg-" + Date.now(),
        role: "assistant",
        content: "Error: " + (err instanceof Error ? err.message : "Unknown error"),
        timestamp: Date.now(),
      };
      persistMessages([...updatedMessages, errMsg]);
    } finally {
      setStreaming(false);
      setStreamText("");
    }
  }

  async function handleSaveRevisionPlan() {
    var lastAssistant = [...messages].reverse().find(function findAssistant(m) {
      return m.role === "assistant";
    });
    if (!lastAssistant) return;

    var config = getBookConfig(currentBook);
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

  async function handleSaveResearch() {
    var lastAssistant = [...messages].reverse().find(function findAssistant(m) {
      return m.role === "assistant";
    });
    if (!lastAssistant) return;

    var config = getBookConfig(currentBook);
    if (!config) return;

    var slug = (conversations.find(function f(c) { return c.id === activeConvId; })?.name || "research")
      .toLowerCase().replace(/[^a-z0-9]+/g, "-").substring(0, 40);

    setSavingResearch(true);
    try {
      await fetch("/api/github/files", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner: config.owner,
          repo: config.repo,
          branch: config.branch,
          path: "context/research-" + slug + ".md",
          content: "# Research: " + slug.replace(/-/g, " ") + "\n\n" + lastAssistant.content,
          message: "Add research: " + slug,
        }),
      });

      // Track research saved
      posthog.capture("research_saved", {
        research_topic: slug,
        content_length: lastAssistant.content.length,
      });
    } catch {
    } finally {
      setSavingResearch(false);
    }
  }

  async function handleSend() {
    if (mode === "revision") {
      handleAddRevisionNote();
      return;
    }

    var text = input.trim();
    if (!text || streaming) return;
    if (!preferences.keysStored) return;

    var messageContent = text;
    var apiMode = mode as string;

    if (mode === "research" && messages.length === 0) {
      messageContent = buildResearchFirstMessage(text);
      apiMode = "research";
    }

    if (mode === "chat") {
      apiMode = "chat";
    }

    if (mode === "write") {
      apiMode = "write";
    }

    var userMsg: ChatMessage = {
      id: "msg-" + Date.now(),
      role: "user",
      content: text,
      timestamp: Date.now(),
    };

    var updatedMessages = [...messages, userMsg];
    persistMessages(updatedMessages);
    setInput("");
    setStreaming(true);
    setStreamText("");

    // Track AI chat message sent
    posthog.capture("ai_chat_sent", {
      mode: mode,
      model: model,
      message_length: text.length,
      is_first_message: messages.length === 0,
    });

    if (messages.length === 0 && conversations.length > 0) {
      var convName = text.substring(0, 50);
      setConversations(function prev(convs) {
        var updated = convs.map(function mapConv(c) {
          return c.id === activeConvId ? { ...c, name: convName } : c;
        });
        saveConversations(repoKey, mode, updated);
        return updated;
      });
    }

    try {
      var apiMessages = updatedMessages.map(function toApiMsg(m, i) {
        if (i === updatedMessages.length - 1) {
          return { role: m.role, content: messageContent };
        }
        return { role: m.role, content: m.content };
      });

      var fullResponse = await streamFromApi(apiMessages, apiMode, function noop() {});

      if (fullResponse) {
        var assistantMsg: ChatMessage = {
          id: "msg-" + Date.now(),
          role: "assistant",
          content: fullResponse,
          timestamp: Date.now(),
        };
        persistMessages([...updatedMessages, assistantMsg]);
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      var errorMsg2: ChatMessage = {
        id: "msg-" + Date.now(),
        role: "assistant",
        content: "Error: " + (err instanceof Error ? err.message : "Unknown error"),
        timestamp: Date.now(),
      };
      persistMessages([...updatedMessages, errorMsg2]);
    } finally {
      setStreaming(false);
      setStreamText("");
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
      return { ...prev, [msgId + "-" + editIdx]: true };
    });
  }

  function handleEditReject(msgId: string, editIdx: number) {
    setAcceptedEdits(function update(prev) {
      return { ...prev, [msgId + "-" + editIdx]: false };
    });
  }

  function handleAcceptAll() {
    var allKeys = getPendingEditKeys(messages);
    setAcceptedEdits(function update(prev) {
      var next = { ...prev };
      for (var i = 0; i < allKeys.length; i++) {
        if (next[allKeys[i]] === undefined) next[allKeys[i]] = true;
      }
      return next;
    });
  }

  function handleRejectAll() {
    var allKeys = getPendingEditKeys(messages);
    setAcceptedEdits(function update(prev) {
      var next = { ...prev };
      for (var i = 0; i < allKeys.length; i++) {
        if (next[allKeys[i]] === undefined) next[allKeys[i]] = false;
      }
      return next;
    });
  }

  var pendingCount = 0;
  var allEditKeys = getPendingEditKeys(messages);
  for (var pk = 0; pk < allEditKeys.length; pk++) {
    if (acceptedEdits[allEditKeys[pk]] === undefined) pendingCount++;
  }

  function renderMarkdownContent(text: string) {
    return (
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code: function renderCode({ children, className }) {
            var isInline = !className;
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
    );
  }

  function renderMessageContent(msg: ChatMessage) {
    if (mode === "chat") {
      return <div style={{ fontSize: 13, lineHeight: 1.6 }}>{renderMarkdownContent(msg.content)}</div>;
    }

    var parsed = parseEditBlocks(msg.content);

    if (parsed.edits.length === 0) {
      return <div style={{ fontSize: 13, lineHeight: 1.6 }}>{renderMarkdownContent(parsed.text)}</div>;
    }

    var parts = parsed.text.split(/\[\[EDIT_BLOCK_(\d+)\]\]/);
    return (
      <div style={{ fontSize: 13, lineHeight: 1.6 }}>
        {parts.map(function renderPart(part, i) {
          if (i % 2 === 1) {
            var editIdx = parseInt(part, 10);
            var edit = parsed.edits[editIdx];
            if (!edit) return null;
            var key = msg.id + "-" + editIdx;
            var state = acceptedEdits[key];
            if (state === true) {
              return (
                <span key={key} style={{ color: "var(--color-success)", fontStyle: "italic", fontSize: 12 }}>
                  Change applied
                </span>
              );
            }
            if (state === false) {
              return (
                <span key={key} style={{ color: "var(--color-text-muted)", fontStyle: "italic", fontSize: 12 }}>
                  Change rejected
                </span>
              );
            }
            return (
              <DiffHunk
                key={key}
                oldText={edit.oldText}
                newText={edit.newText}
                onAccept={function accept() { handleEditAccept(msg.id, editIdx); }}
                onReject={function reject() { handleEditReject(msg.id, editIdx); }}
              />
            );
          }
          return <ReactMarkdown key={i} remarkPlugins={[remarkGfm]}>{part}</ReactMarkdown>;
        })}
      </div>
    );
  }

  function getEmptyStateText(): string {
    switch (mode) {
      case "chat":
        return "Chat about your book. Ask questions, brainstorm ideas, get feedback.";
      case "write":
        return "Ask the AI to write, edit, or improve your manuscript. All changes are suggestions you review.";
      case "research":
        return "Describe a topic to research. The AI builds a deep research brief you can save to context.";
      case "revision":
        return "Add revision notes and critiques, then generate a structured revision plan.";
    }
  }

  function getPlaceholderText(): string {
    if (!preferences.keysStored) return "Set API key in settings";
    switch (mode) {
      case "chat":
        return "Chat about your book...";
      case "write":
        return "Ask the AI to write or edit...";
      case "research":
        return "Describe what to research...";
      case "revision":
        return "Add a revision note...";
    }
  }

  var tokenEstimate = estimateTokens(input);
  var hasRevisionPlan = mode === "revision" && messages.some(function findPlan(m) {
    return m.role === "assistant";
  });
  var hasResearchResult = mode === "research" && messages.some(function findRes(m) {
    return m.role === "assistant";
  });
  var activeMeta = MODE_META.find(function f(m) { return m.key === mode; }) || MODE_META[0];
  var ActiveIcon = activeMeta.icon;
  var activeConv = conversations.find(function f(c) { return c.id === activeConvId; });

  var dropdownItemStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 8,
    width: "100%",
    padding: "6px 10px",
    fontSize: 12,
    fontFamily: "inherit",
    border: "none",
    background: "transparent",
    color: "var(--color-text)",
    cursor: "pointer",
    borderRadius: 4,
    textAlign: "left",
  };

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
        <div ref={modeRef} style={{ position: "relative" }}>
          <button
            onClick={function toggleMode() { setModeOpen(!modeOpen); }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: "4px 8px",
              fontSize: 12,
              fontFamily: "inherit",
              fontWeight: 600,
              border: "1px solid var(--color-border)",
              borderRadius: 6,
              backgroundColor: "transparent",
              color: "var(--color-text)",
              cursor: "pointer",
            }}
          >
            <ActiveIcon size={13} />
            {activeMeta.label}
            <ChevronUp size={11} style={{ transform: modeOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 150ms" }} />
          </button>
          {modeOpen && (
            <div
              style={{
                position: "absolute",
                bottom: "100%",
                left: 0,
                marginBottom: 4,
                minWidth: 200,
                backgroundColor: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                borderRadius: 8,
                boxShadow: "0 -4px 16px rgba(0,0,0,0.12)",
                padding: 4,
                zIndex: 50,
              }}
            >
              {MODE_META.map(function renderModeOption(m) {
                var Icon = m.icon;
                var isActive = mode === m.key;
                return (
                  <button
                    key={m.key}
                    onClick={function selectMode() { handleModeChange(m.key); }}
                    onMouseEnter={function hover(e) { e.currentTarget.style.backgroundColor = "var(--color-surface-hover)"; }}
                    onMouseLeave={function unhover(e) { e.currentTarget.style.backgroundColor = "transparent"; }}
                    style={{
                      ...dropdownItemStyle,
                      fontWeight: isActive ? 600 : 400,
                      color: isActive ? "var(--color-accent)" : "var(--color-text)",
                    }}
                  >
                    <Icon size={14} />
                    <div>
                      <div style={{ fontSize: 12 }}>{m.label}</div>
                      <div style={{ fontSize: 10, color: "var(--color-text-muted)", marginTop: 1 }}>{m.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 4 }}>
          <button
            onClick={handleNewConversation}
            title="New chat"
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
            <Plus size={14} />
          </button>
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
      </div>

      {pendingCount > 0 && mode !== "chat" && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "4px 12px",
            borderBottom: "1px solid var(--color-border)",
            flexShrink: 0,
            backgroundColor: "color-mix(in srgb, var(--color-accent) 5%, transparent)",
          }}
        >
          <span style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
            {pendingCount} pending edit{pendingCount !== 1 ? "s" : ""}
          </span>
          <div style={{ display: "flex", gap: 4 }}>
            <button
              onClick={handleAcceptAll}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 3,
                padding: "2px 8px",
                fontSize: 10,
                fontFamily: "inherit",
                fontWeight: 600,
                border: "none",
                borderRadius: 4,
                backgroundColor: "color-mix(in srgb, var(--color-success) 15%, transparent)",
                color: "var(--color-success)",
                cursor: "pointer",
              }}
            >
              <Check size={10} /> Accept All
            </button>
            <button
              onClick={handleRejectAll}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 3,
                padding: "2px 8px",
                fontSize: 10,
                fontFamily: "inherit",
                fontWeight: 600,
                border: "none",
                borderRadius: 4,
                backgroundColor: "color-mix(in srgb, var(--color-error) 15%, transparent)",
                color: "var(--color-error)",
                cursor: "pointer",
              }}
            >
              <X size={10} /> Reject All
            </button>
          </div>
        </div>
      )}

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
          var isUser = msg.role === "user";
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
            {currentChapter && (
              <button
                onClick={handleCritiqueChapter}
                disabled={!preferences.keysStored || streaming}
                title="Get AI critique of current chapter"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 4,
                  padding: "6px 10px",
                  fontSize: 11,
                  fontFamily: "inherit",
                  fontWeight: 500,
                  border: "1px solid var(--color-border)",
                  borderRadius: 8,
                  backgroundColor: "transparent",
                  color: "var(--color-text)",
                  cursor: preferences.keysStored ? "pointer" : "default",
                  flexShrink: 0,
                }}
              >
                <FileText size={12} />
                Critique Chapter
              </button>
            )}
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
              Generate Plan
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

      {mode === "research" && hasResearchResult && !streaming && (
        <div
          style={{
            padding: "4px 12px",
            borderTop: "1px solid var(--color-border)",
            flexShrink: 0,
          }}
        >
          <button
            onClick={handleSaveResearch}
            disabled={savingResearch}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              width: "100%",
              padding: "6px 12px",
              fontSize: 12,
              fontFamily: "inherit",
              fontWeight: 500,
              border: "1px solid var(--color-border)",
              borderRadius: 8,
              backgroundColor: "transparent",
              color: savingResearch ? "var(--color-text-muted)" : "var(--color-accent)",
              cursor: savingResearch ? "default" : "pointer",
              transition: "color 150ms",
            }}
          >
            <Save size={14} />
            {savingResearch ? "Saving..." : "Save to Context"}
          </button>
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
          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
            <div ref={modelRef} style={{ position: "relative" }}>
              <button
                onClick={function toggleModel() { setModelOpen(!modelOpen); }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 3,
                  padding: "2px 8px",
                  fontSize: 11,
                  fontFamily: "inherit",
                  border: "1px solid var(--color-border)",
                  borderRadius: 4,
                  backgroundColor: "transparent",
                  color: "var(--color-text)",
                  cursor: "pointer",
                }}
              >
                {MODEL_OPTIONS.find(function f(m) { return m.key === model; })?.label || "Sonnet"}
                <ChevronUp size={9} style={{ transform: modelOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 150ms" }} />
              </button>
              {modelOpen && (
                <div
                  style={{
                    position: "absolute",
                    bottom: "100%",
                    left: 0,
                    marginBottom: 4,
                    minWidth: 120,
                    backgroundColor: "var(--color-surface)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 6,
                    boxShadow: "0 -4px 12px rgba(0,0,0,0.1)",
                    padding: 3,
                    zIndex: 50,
                  }}
                >
                  {MODEL_OPTIONS.map(function renderModelOption(m) {
                    var isActive = model === m.key;
                    return (
                      <button
                        key={m.key}
                        onClick={function selectModel() { setModel(m.key); setModelOpen(false); }}
                        onMouseEnter={function hover(e) { e.currentTarget.style.backgroundColor = "var(--color-surface-hover)"; }}
                        onMouseLeave={function unhover(e) { e.currentTarget.style.backgroundColor = "transparent"; }}
                        style={{
                          ...dropdownItemStyle,
                          fontSize: 11,
                          padding: "4px 8px",
                          fontWeight: isActive ? 600 : 400,
                          color: isActive ? "var(--color-accent)" : "var(--color-text)",
                        }}
                      >
                        {m.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <div ref={convRef} style={{ position: "relative" }}>
              <button
                onClick={function toggleConvList() { setConvListOpen(!convListOpen); }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 3,
                  padding: "2px 8px",
                  fontSize: 11,
                  fontFamily: "inherit",
                  border: "1px solid var(--color-border)",
                  borderRadius: 4,
                  backgroundColor: "transparent",
                  color: "var(--color-text)",
                  cursor: "pointer",
                  maxWidth: 140,
                  overflow: "hidden",
                }}
              >
                <MessageSquare size={9} style={{ flexShrink: 0 }} />
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {activeConv?.name || "New Chat"}
                </span>
                <ChevronUp size={9} style={{ flexShrink: 0, transform: convListOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 150ms" }} />
              </button>
              {convListOpen && (
                <div
                  style={{
                    position: "absolute",
                    bottom: "100%",
                    left: 0,
                    marginBottom: 4,
                    minWidth: 220,
                    backgroundColor: "var(--color-surface)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 8,
                    boxShadow: "0 -4px 16px rgba(0,0,0,0.12)",
                    padding: 4,
                    zIndex: 50,
                    maxHeight: 240,
                    overflowY: "auto",
                  }}
                >
                  {conversations.map(function renderConv(conv) {
                    var isActive = conv.id === activeConvId;
                    return (
                      <div
                        key={conv.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                          borderRadius: 4,
                        }}
                        onMouseEnter={function hover(e) { e.currentTarget.style.backgroundColor = "var(--color-surface-hover)"; }}
                        onMouseLeave={function unhover(e) { e.currentTarget.style.backgroundColor = "transparent"; }}
                      >
                        <button
                          onClick={function switchConv() { handleSwitchConversation(conv.id); }}
                          style={{
                            ...dropdownItemStyle,
                            flex: 1,
                            fontWeight: isActive ? 600 : 400,
                            color: isActive ? "var(--color-accent)" : "var(--color-text)",
                          }}
                        >
                          <div style={{ flex: 1, overflow: "hidden" }}>
                            <div style={{ fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{conv.name}</div>
                            {conv.lastMessage && (
                              <div style={{ fontSize: 10, color: "var(--color-text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 1 }}>
                                {conv.lastMessage}
                              </div>
                            )}
                          </div>
                        </button>
                        {conversations.length > 1 && (
                          <button
                            onClick={function del(e) { e.stopPropagation(); handleDeleteConversation(conv.id); }}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              width: 20,
                              height: 20,
                              border: "none",
                              background: "transparent",
                              color: "var(--color-text-muted)",
                              cursor: "pointer",
                              borderRadius: 3,
                              flexShrink: 0,
                              marginRight: 4,
                            }}
                          >
                            <X size={11} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
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
