"use client";

import { useState, useCallback, useEffect } from "react";
import {
  FileText,
  Link2,
  CheckCircle2,
  RefreshCw,
  Loader2,
  AlertTriangle,
  AlertCircle,
  ChevronRight,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useAppStore } from "@/store";

type SubTab = "chapter" | "continuity" | "readiness";

interface ContinuityIssue {
  severity: "warning" | "error";
  category: string;
  description: string;
  chapters: string;
}

interface ReadinessScore {
  category: string;
  score: number;
  notes: string;
}

interface ChapterScores {
  chapter: string;
  scores: ReadinessScore[];
}

const SUB_TABS: { key: SubTab; label: string; icon: typeof FileText }[] = [
  { key: "chapter", label: "Chapter", icon: FileText },
  { key: "continuity", label: "Continuity", icon: Link2 },
  { key: "readiness", label: "Readiness", icon: CheckCircle2 },
];

function LoadingState({ message }: { message: string }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 40,
        gap: 12,
        color: "var(--color-text-muted)",
        fontFamily: "var(--font-inter), system-ui, sans-serif",
      }}
    >
      <Loader2
        size={20}
        style={{ animation: "critiqueSpinner 1s linear infinite", color: "var(--color-accent)" }}
      />
      <span style={{ fontSize: 13 }}>{message}</span>
      <style>{`@keyframes critiqueSpinner { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function ScoreBar({ score, label }: { score: number; label: string }) {
  function getBarColor(s: number): string {
    if (s <= 4) return "var(--color-error)";
    if (s <= 7) return "#d4a017";
    return "var(--color-success)";
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        marginBottom: 8,
      }}
    >
      <span
        style={{
          fontSize: 11,
          color: "var(--color-text-muted)",
          width: 120,
          flexShrink: 0,
          textAlign: "right",
        }}
      >
        {label}
      </span>
      <div
        style={{
          flex: 1,
          height: 8,
          backgroundColor: "var(--color-surface)",
          borderRadius: 9999,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: (score / 10) * 100 + "%",
            borderRadius: 9999,
            backgroundColor: getBarColor(score),
            transition: "width 600ms ease",
          }}
        />
      </div>
      <span
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: getBarColor(score),
          width: 28,
          textAlign: "right",
          flexShrink: 0,
        }}
      >
        {score}
      </span>
    </div>
  );
}

function CritiqueCard({
  children,
  borderColor,
}: {
  children: React.ReactNode;
  borderColor: string;
}) {
  return (
    <div
      style={{
        backgroundColor: "var(--color-surface)",
        borderRadius: 8,
        padding: 16,
        borderLeft: "3px solid " + borderColor,
        fontSize: 12,
        lineHeight: 1.6,
        color: "var(--color-text)",
      }}
    >
      {children}
    </div>
  );
}

function parseContinuityIssues(markdown: string): ContinuityIssue[] {
  const issues: ContinuityIssue[] = [];
  const sections = markdown.split(/^## /m).filter(Boolean);

  for (const section of sections) {
    const lines = section.split("\n");
    const heading = lines[0]?.trim() || "";
    let severity: "warning" | "error" = "warning";

    if (heading.toLowerCase().includes("contradiction") || heading.toLowerCase().includes("timeline")) {
      severity = "error";
    }

    const bullets = lines.filter(function isBullet(l) {
      return l.trim().startsWith("- ") || l.trim().startsWith("* ");
    });

    for (const bullet of bullets) {
      const text = bullet.replace(/^[\s]*[-*]\s*/, "").trim();
      if (!text) continue;

      const chapterMatch = text.match(/chapter[s]?\s+[\d,\s]+|chapter[s]?\s+"[^"]+"/gi);

      issues.push({
        severity: severity,
        category: heading,
        description: text,
        chapters: chapterMatch ? chapterMatch.join(", ") : "",
      });
    }
  }

  return issues;
}

function parseReadinessScores(markdown: string): {
  overall: ReadinessScore[];
  chapters: ChapterScores[];
  assessment: string;
  nextSteps: string[];
} {
  const result: {
    overall: ReadinessScore[];
    chapters: ChapterScores[];
    assessment: string;
    nextSteps: string[];
  } = {
    overall: [],
    chapters: [],
    assessment: "",
    nextSteps: [],
  };

  const overallMatch = markdown.match(/## Overall Scores[\s\S]*?(?=##|$)/);
  if (overallMatch) {
    const rows = overallMatch[0].match(/\|\s*([^|]+)\s*\|\s*(\d+)\/10\s*\|\s*([^|]*)\s*\|/g);
    if (rows) {
      for (const row of rows) {
        const cols = row.split("|").filter(Boolean).map(function trim(s) { return s.trim(); });
        if (cols.length >= 3) {
          const scoreMatch = cols[1].match(/(\d+)/);
          if (scoreMatch) {
            result.overall.push({
              category: cols[0],
              score: parseInt(scoreMatch[1], 10),
              notes: cols[2] || "",
            });
          }
        }
      }
    }
  }

  const perChapterMatch = markdown.match(/## Per-Chapter Scores[\s\S]*?(?=## Overall|$)/);
  if (perChapterMatch) {
    const chapterBlocks = perChapterMatch[0].split(/### |#### /).filter(Boolean);
    for (const block of chapterBlocks) {
      const blockLines = block.split("\n");
      const chapterName = blockLines[0]?.trim();
      if (!chapterName || chapterName.startsWith("Per-Chapter")) continue;

      const chapterRows = block.match(/\|\s*([^|]+)\s*\|\s*(\d+)\/10\s*\|\s*([^|]*)\s*\|/g);
      if (chapterRows) {
        const scores: ReadinessScore[] = [];
        for (const row of chapterRows) {
          const cols = row.split("|").filter(Boolean).map(function trim(s) { return s.trim(); });
          if (cols.length >= 3) {
            const scoreMatch = cols[1].match(/(\d+)/);
            if (scoreMatch) {
              scores.push({
                category: cols[0],
                score: parseInt(scoreMatch[1], 10),
                notes: cols[2] || "",
              });
            }
          }
        }
        if (scores.length > 0) {
          result.chapters.push({ chapter: chapterName, scores: scores });
        }
      }
    }
  }

  const assessmentMatch = markdown.match(/## Overall Assessment\s*([\s\S]*?)(?=##|$)/);
  if (assessmentMatch) {
    result.assessment = assessmentMatch[1].trim();
  }

  const stepsMatch = markdown.match(/## Actionable Next Steps\s*([\s\S]*?)(?=##|$)/);
  if (stepsMatch) {
    const stepLines = stepsMatch[1].split("\n").filter(function isStep(l) {
      return /^\d+\.\s/.test(l.trim());
    });
    result.nextSteps = stepLines.map(function clean(l) {
      return l.trim().replace(/^\d+\.\s*/, "");
    });
  }

  return result;
}

function ChapterCritiqueView() {
  const preferences = useAppStore(function selectPrefs(s) {
    return s.preferences;
  });
  const currentBook = useAppStore(function selectBook(s) {
    return s.editor.currentBook;
  });
  const currentChapter = useAppStore(function selectChapter(s) {
    return s.editor.currentChapter;
  });

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function parseBookInfo(fullName: string | undefined): { owner: string; repo: string } | null {
    if (!fullName) return null;
    const parts = fullName.split("/");
    if (parts.length !== 2) return null;
    return { owner: parts[0], repo: parts[1] };
  }

  async function handleCritique() {
    if (!preferences.keysStored || !currentBook || !currentChapter) {
      setError("Open a chapter and configure your API key first");
      return;
    }

    const bookInfo = parseBookInfo(currentBook);
    if (!bookInfo) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const configRes = await fetch("/api/github/files?path=book.json", {
        headers: {
          "x-repo-owner": bookInfo.owner,
          "x-repo-name": bookInfo.repo,
        },
      });

      let chapterPath = currentChapter;
      if (configRes.ok) {
        const configData = await configRes.json();
        if (configData.content) {
          try {
            const config = JSON.parse(configData.content);
            const book = config.book || config;
            for (const part of book.parts || []) {
              for (const ch of part.chapters || []) {
                if (ch.id === currentChapter) {
                  chapterPath = (book.bookDir || "book") + "/" + ch.file;
                }
              }
            }
          } catch {
            /* use chapterPath as-is */
          }
        }
      }

      const chapterRes = await fetch(
        "/api/github/files?path=" + encodeURIComponent(chapterPath),
        {
          headers: {
            "x-repo-owner": bookInfo.owner,
            "x-repo-name": bookInfo.repo,
          },
        },
      );

      if (!chapterRes.ok) throw new Error("Could not load chapter");
      const chapterData = await chapterRes.json();
      const text = chapterData.content || "";

      if (!text.trim()) {
        setError("Chapter is empty");
        setLoading(false);
        return;
      }

      const reviewRes = await fetch("/api/ai/review", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mode: "chapter",
          text: text,
          model: preferences.defaultModel,
        }),
      });

      if (!reviewRes.ok) throw new Error("Review API error: " + reviewRes.status);

      const data = await reviewRes.json();
      setResult(data.result || "");
      setLoading(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Critique failed");
      setLoading(false);
    }
  }

  if (loading) {
    return <LoadingState message="Reading your chapter..." />;
  }

  if (!result) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 12,
          padding: "32px 16px",
          textAlign: "center",
        }}
      >
        {error && (
          <div
            style={{
              padding: "8px 12px",
              borderRadius: 6,
              backgroundColor: "color-mix(in srgb, var(--color-error) 10%, transparent)",
              color: "var(--color-error)",
              fontSize: 11,
              width: "100%",
              textAlign: "left",
            }}
          >
            {error}
          </div>
        )}
        <p style={{ margin: 0, fontSize: 12, color: "var(--color-text-muted)", lineHeight: 1.5 }}>
          Get detailed feedback on your current chapter including strengths, weaknesses, pacing, and prose quality.
        </p>
        <button
          onClick={handleCritique}
          disabled={!currentChapter}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 16px",
            fontSize: 12,
            fontWeight: 500,
            fontFamily: "inherit",
            border: "none",
            borderRadius: 6,
            backgroundColor: "var(--color-accent)",
            color: "#fff",
            cursor: !currentChapter ? "default" : "pointer",
            opacity: !currentChapter ? 0.5 : 1,
          }}
        >
          <FileText size={13} />
          Critique This Chapter
        </button>
        {!currentChapter && (
          <span style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
            Open a chapter first
          </span>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: 12 }}>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          onClick={handleCritique}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            padding: "5px 10px",
            fontSize: 11,
            fontFamily: "inherit",
            border: "1px solid var(--color-border)",
            borderRadius: 5,
            backgroundColor: "transparent",
            color: "var(--color-text-muted)",
            cursor: "pointer",
          }}
        >
          <RefreshCw size={11} />
          Re-critique
        </button>
      </div>

      <div
        className="critique-chapter-content"
        style={{ fontSize: 12, lineHeight: 1.6, color: "var(--color-text)" }}
      >
        <style>{`
          .critique-chapter-content h2 {
            font-size: 13px;
            font-weight: 600;
            margin: 16px 0 8px 0;
            padding: 6px 10px;
            border-radius: 6px;
          }
          .critique-chapter-content h2:first-child {
            margin-top: 0;
          }
          .critique-chapter-content p {
            margin: 0 0 8px 0;
          }
          .critique-chapter-content ul, .critique-chapter-content ol {
            margin: 0 0 8px 0;
            padding-left: 18px;
          }
          .critique-chapter-content li {
            margin-bottom: 4px;
          }
          .critique-chapter-content strong {
            font-weight: 600;
          }
          .critique-chapter-content blockquote {
            margin: 6px 0;
            padding: 6px 12px;
            border-left: 3px solid var(--color-accent);
            background: var(--color-surface);
            border-radius: 0 6px 6px 0;
            font-family: var(--font-literata), serif;
            font-style: italic;
            font-size: 12px;
            color: var(--color-text-muted);
          }
        `}</style>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            h2: function renderH2({ children }) {
              const text = String(children).toLowerCase();
              let bg = "var(--color-surface)";
              let leftBorder = "var(--color-border)";

              if (text.includes("strength")) {
                bg = "color-mix(in srgb, var(--color-success) 10%, transparent)";
                leftBorder = "var(--color-success)";
              } else if (text.includes("weakness")) {
                bg = "color-mix(in srgb, #d4a017 10%, transparent)";
                leftBorder = "#d4a017";
              } else if (text.includes("suggestion")) {
                bg = "color-mix(in srgb, var(--color-accent) 10%, transparent)";
                leftBorder = "var(--color-accent)";
              }

              return (
                <h2
                  style={{
                    backgroundColor: bg,
                    borderLeft: "3px solid " + leftBorder,
                  }}
                >
                  {children}
                </h2>
              );
            },
          }}
        >
          {result}
        </ReactMarkdown>
      </div>
    </div>
  );
}

function ContinuityCheckView() {
  const preferences = useAppStore(function selectPrefs(s) {
    return s.preferences;
  });
  const currentBook = useAppStore(function selectBook(s) {
    return s.editor.currentBook;
  });

  const [loading, setLoading] = useState(false);
  const [rawResult, setRawResult] = useState<string | null>(null);
  const [issues, setIssues] = useState<ContinuityIssue[]>([]);
  const [error, setError] = useState<string | null>(null);

  function parseBookInfo(fullName: string | undefined): { owner: string; repo: string } | null {
    if (!fullName) return null;
    const parts = fullName.split("/");
    if (parts.length !== 2) return null;
    return { owner: parts[0], repo: parts[1] };
  }

  async function handleCheck() {
    if (!preferences.keysStored || !currentBook) {
      setError("Configure your API key and open a book first");
      return;
    }

    const bookInfo = parseBookInfo(currentBook);
    if (!bookInfo) return;

    setLoading(true);
    setError(null);
    setRawResult(null);
    setIssues([]);

    try {
      const configRes = await fetch("/api/github/files?path=book.json", {
        headers: {
          "x-repo-owner": bookInfo.owner,
          "x-repo-name": bookInfo.repo,
        },
      });

      if (!configRes.ok) throw new Error("Could not load book config");
      const configData = await configRes.json();
      const config = JSON.parse(configData.content);
      const book = config.book || config;
      const bookDir = book.bookDir || "book";

      const contexts: { type: string; content: string }[] = [];
      for (const part of book.parts || []) {
        for (const ch of part.chapters || []) {
          try {
            const res = await fetch(
              "/api/github/files?path=" + encodeURIComponent(bookDir + "/" + ch.file),
              {
                headers: {
                  "x-repo-owner": bookInfo.owner,
                  "x-repo-name": bookInfo.repo,
                },
              },
            );
            if (res.ok) {
              const data = await res.json();
              if (data.content) {
                contexts.push({
                  type: "chapter",
                  content: "--- " + ch.label + " ---\n\n" + data.content,
                });
              }
            }
          } catch {
            continue;
          }
        }
      }

      if (contexts.length === 0) {
        setError("No chapters found to check");
        setLoading(false);
        return;
      }

      const reviewRes = await fetch("/api/ai/review", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mode: "continuity",
          contexts: contexts,
          model: preferences.defaultModel,
        }),
      });

      if (!reviewRes.ok) throw new Error("Review API error: " + reviewRes.status);

      const data = await reviewRes.json();
      const md = data.result || "";
      setRawResult(md);
      setIssues(parseContinuityIssues(md));
      setLoading(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Continuity check failed");
      setLoading(false);
    }
  }

  if (loading) {
    return <LoadingState message="Scanning for consistency..." />;
  }

  if (!rawResult) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 12,
          padding: "32px 16px",
          textAlign: "center",
        }}
      >
        {error && (
          <div
            style={{
              padding: "8px 12px",
              borderRadius: 6,
              backgroundColor: "color-mix(in srgb, var(--color-error) 10%, transparent)",
              color: "var(--color-error)",
              fontSize: 11,
              width: "100%",
              textAlign: "left",
            }}
          >
            {error}
          </div>
        )}
        <p style={{ margin: 0, fontSize: 12, color: "var(--color-text-muted)", lineHeight: 1.5 }}>
          Scan all chapters for character inconsistencies, timeline problems, tone shifts, dropped threads, and contradictions.
        </p>
        <button
          onClick={handleCheck}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 16px",
            fontSize: 12,
            fontWeight: 500,
            fontFamily: "inherit",
            border: "none",
            borderRadius: 6,
            backgroundColor: "var(--color-accent)",
            color: "#fff",
            cursor: "pointer",
          }}
        >
          <Link2 size={13} />
          Check Continuity
        </button>
      </div>
    );
  }

  if (issues.length === 0) {
    return (
      <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            onClick={handleCheck}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "5px 10px",
              fontSize: 11,
              fontFamily: "inherit",
              border: "1px solid var(--color-border)",
              borderRadius: 5,
              backgroundColor: "transparent",
              color: "var(--color-text-muted)",
              cursor: "pointer",
            }}
          >
            <RefreshCw size={11} />
            Re-check
          </button>
        </div>
        <div
          className="continuity-raw-content"
          style={{ fontSize: 12, lineHeight: 1.6, color: "var(--color-text)" }}
        >
          <style>{`
            .continuity-raw-content h2 {
              font-size: 13px;
              font-weight: 600;
              margin: 14px 0 6px 0;
            }
            .continuity-raw-content h2:first-child { margin-top: 0; }
            .continuity-raw-content p { margin: 0 0 8px 0; }
            .continuity-raw-content ul { margin: 0 0 8px 0; padding-left: 18px; }
            .continuity-raw-content li { margin-bottom: 4px; }
          `}</style>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{rawResult}</ReactMarkdown>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
          {issues.length} issue{issues.length !== 1 ? "s" : ""} found
        </span>
        <button
          onClick={handleCheck}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            padding: "5px 10px",
            fontSize: 11,
            fontFamily: "inherit",
            border: "1px solid var(--color-border)",
            borderRadius: 5,
            backgroundColor: "transparent",
            color: "var(--color-text-muted)",
            cursor: "pointer",
          }}
        >
          <RefreshCw size={11} />
          Re-check
        </button>
      </div>

      {issues.map(function renderIssue(issue, idx) {
        const isError = issue.severity === "error";
        const borderColor = isError ? "var(--color-error)" : "#d4a017";

        return (
          <CritiqueCard key={idx} borderColor={borderColor}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
              {isError ? (
                <AlertCircle
                  size={14}
                  style={{ color: "var(--color-error)", flexShrink: 0, marginTop: 1 }}
                />
              ) : (
                <AlertTriangle
                  size={14}
                  style={{ color: "#d4a017", flexShrink: 0, marginTop: 1 }}
                />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.3px",
                    color: isError ? "var(--color-error)" : "#d4a017",
                    marginBottom: 4,
                  }}
                >
                  {issue.category}
                </div>
                <div style={{ fontSize: 12, lineHeight: 1.5, color: "var(--color-text)" }}>
                  {issue.description}
                </div>
                {issue.chapters && (
                  <div
                    style={{
                      marginTop: 6,
                      fontSize: 10,
                      color: "var(--color-text-muted)",
                    }}
                  >
                    {issue.chapters}
                  </div>
                )}
              </div>
            </div>
          </CritiqueCard>
        );
      })}
    </div>
  );
}

function ReadinessCheckView() {
  const preferences = useAppStore(function selectPrefs(s) {
    return s.preferences;
  });
  const currentBook = useAppStore(function selectBook(s) {
    return s.editor.currentBook;
  });

  const [loading, setLoading] = useState(false);
  const [parsed, setParsed] = useState<ReturnType<typeof parseReadinessScores> | null>(null);
  const [rawResult, setRawResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedChapter, setExpandedChapter] = useState<string | null>(null);

  function parseBookInfo(fullName: string | undefined): { owner: string; repo: string } | null {
    if (!fullName) return null;
    const parts = fullName.split("/");
    if (parts.length !== 2) return null;
    return { owner: parts[0], repo: parts[1] };
  }

  async function handleCheck() {
    if (!preferences.keysStored || !currentBook) {
      setError("Configure your API key and open a book first");
      return;
    }

    const bookInfo = parseBookInfo(currentBook);
    if (!bookInfo) return;

    setLoading(true);
    setError(null);
    setParsed(null);
    setRawResult(null);

    try {
      const configRes = await fetch("/api/github/files?path=book.json", {
        headers: {
          "x-repo-owner": bookInfo.owner,
          "x-repo-name": bookInfo.repo,
        },
      });

      if (!configRes.ok) throw new Error("Could not load book config");
      const configData = await configRes.json();
      const config = JSON.parse(configData.content);
      const book = config.book || config;
      const bookDir = book.bookDir || "book";

      const contexts: { type: string; content: string }[] = [];
      for (const part of book.parts || []) {
        for (const ch of part.chapters || []) {
          try {
            const res = await fetch(
              "/api/github/files?path=" + encodeURIComponent(bookDir + "/" + ch.file),
              {
                headers: {
                  "x-repo-owner": bookInfo.owner,
                  "x-repo-name": bookInfo.repo,
                },
              },
            );
            if (res.ok) {
              const data = await res.json();
              if (data.content) {
                contexts.push({
                  type: "chapter",
                  content: "--- " + ch.label + " ---\n\n" + data.content,
                });
              }
            }
          } catch {
            continue;
          }
        }
      }

      let outlineContext = "";
      try {
        const outlineRes = await fetch("/api/github/files?path=outline.json", {
          headers: {
            "x-repo-owner": bookInfo.owner,
            "x-repo-name": bookInfo.repo,
          },
        });
        if (outlineRes.ok) {
          const outlineData = await outlineRes.json();
          outlineContext = outlineData.content || "";
        }
      } catch {
        /* no outline */
      }

      if (contexts.length === 0) {
        setError("No chapters found");
        setLoading(false);
        return;
      }

      const allContexts = [...contexts];
      if (outlineContext) {
        allContexts.push({ type: "outline", content: outlineContext });
      }

      const reviewRes = await fetch("/api/ai/review", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mode: "readiness",
          contexts: allContexts,
          model: preferences.defaultModel,
        }),
      });

      if (!reviewRes.ok) throw new Error("Review API error: " + reviewRes.status);

      const data = await reviewRes.json();
      const md = data.result || "";
      setRawResult(md);
      setParsed(parseReadinessScores(md));
      setLoading(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Readiness check failed");
      setLoading(false);
    }
  }

  function getScoreColor(score: number): string {
    if (score <= 4) return "var(--color-error)";
    if (score <= 7) return "#d4a017";
    return "var(--color-success)";
  }

  if (loading) {
    return <LoadingState message="Evaluating your manuscript..." />;
  }

  if (!parsed) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 12,
          padding: "32px 16px",
          textAlign: "center",
        }}
      >
        {error && (
          <div
            style={{
              padding: "8px 12px",
              borderRadius: 6,
              backgroundColor: "color-mix(in srgb, var(--color-error) 10%, transparent)",
              color: "var(--color-error)",
              fontSize: 11,
              width: "100%",
              textAlign: "left",
            }}
          >
            {error}
          </div>
        )}
        <p style={{ margin: 0, fontSize: 12, color: "var(--color-text-muted)", lineHeight: 1.5 }}>
          Get a comprehensive readiness assessment with scores across grammar, pacing, character development, prose quality, and more.
        </p>
        <button
          onClick={handleCheck}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 16px",
            fontSize: 12,
            fontWeight: 500,
            fontFamily: "inherit",
            border: "none",
            borderRadius: 6,
            backgroundColor: "var(--color-accent)",
            color: "#fff",
            cursor: "pointer",
          }}
        >
          <CheckCircle2 size={13} />
          Check Readiness
        </button>
      </div>
    );
  }

  const overallAvg = parsed.overall.length > 0
    ? Math.round(
        (parsed.overall.reduce(function sum(acc, s) { return acc + s.score; }, 0) /
          parsed.overall.length) *
          10,
      ) / 10
    : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, padding: 12 }}>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          onClick={handleCheck}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            padding: "5px 10px",
            fontSize: 11,
            fontFamily: "inherit",
            border: "1px solid var(--color-border)",
            borderRadius: 5,
            backgroundColor: "transparent",
            color: "var(--color-text-muted)",
            cursor: "pointer",
          }}
        >
          <RefreshCw size={11} />
          Re-check
        </button>
      </div>

      {parsed.overall.length > 0 && (
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 12,
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text)" }}>
              Overall Scores
            </span>
            <span
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: getScoreColor(Math.round(overallAvg)),
              }}
            >
              {overallAvg}
              <span style={{ fontSize: 12, fontWeight: 400, color: "var(--color-text-muted)" }}>
                /10
              </span>
            </span>
          </div>
          {parsed.overall.map(function renderScore(s) {
            return <ScoreBar key={s.category} score={s.score} label={s.category} />;
          })}
        </div>
      )}

      {parsed.chapters.length > 0 && (
        <div>
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "var(--color-text)",
              display: "block",
              marginBottom: 8,
            }}
          >
            Per-Chapter Breakdown
          </span>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {parsed.chapters.map(function renderChapter(ch) {
              const chAvg = ch.scores.length > 0
                ? Math.round(
                    (ch.scores.reduce(function sum(acc, s) { return acc + s.score; }, 0) /
                      ch.scores.length) *
                      10,
                  ) / 10
                : 0;
              const isExpanded = expandedChapter === ch.chapter;

              return (
                <div
                  key={ch.chapter}
                  style={{
                    border: "1px solid var(--color-border)",
                    borderRadius: 6,
                    overflow: "hidden",
                  }}
                >
                  <button
                    onClick={function toggle() {
                      setExpandedChapter(isExpanded ? null : ch.chapter);
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      width: "100%",
                      padding: "8px 10px",
                      border: "none",
                      background: "var(--color-surface)",
                      cursor: "pointer",
                      fontFamily: "inherit",
                      fontSize: 12,
                      textAlign: "left",
                    }}
                  >
                    <ChevronRight
                      size={12}
                      style={{
                        transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
                        transition: "transform 150ms",
                        color: "var(--color-text-muted)",
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ flex: 1, color: "var(--color-text)" }}>{ch.chapter}</span>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: getScoreColor(Math.round(chAvg)),
                        flexShrink: 0,
                      }}
                    >
                      {chAvg}
                    </span>
                  </button>
                  {isExpanded && (
                    <div style={{ padding: "8px 12px 10px" }}>
                      {ch.scores.map(function renderScore(s) {
                        return <ScoreBar key={s.category} score={s.score} label={s.category} />;
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {parsed.assessment && (
        <CritiqueCard borderColor="var(--color-accent)">
          <div
            style={{
              fontSize: 10,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.3px",
              color: "var(--color-accent)",
              marginBottom: 6,
            }}
          >
            Overall Assessment
          </div>
          <div style={{ fontSize: 12, lineHeight: 1.6, color: "var(--color-text)" }}>
            {parsed.assessment}
          </div>
        </CritiqueCard>
      )}

      {parsed.nextSteps.length > 0 && (
        <div>
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "var(--color-text)",
              display: "block",
              marginBottom: 8,
            }}
          >
            Actionable Next Steps
          </span>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {parsed.nextSteps.map(function renderStep(step, idx) {
              return (
                <CritiqueCard key={idx} borderColor="var(--color-success)">
                  <div style={{ display: "flex", gap: 8 }}>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: "var(--color-success)",
                        flexShrink: 0,
                        width: 18,
                      }}
                    >
                      {idx + 1}.
                    </span>
                    <span style={{ fontSize: 12, lineHeight: 1.5, color: "var(--color-text)" }}>
                      {step}
                    </span>
                  </div>
                </CritiqueCard>
              );
            })}
          </div>
        </div>
      )}

      {parsed.overall.length === 0 && rawResult && (
        <div
          className="readiness-fallback"
          style={{ fontSize: 12, lineHeight: 1.6, color: "var(--color-text)" }}
        >
          <style>{`
            .readiness-fallback h2 {
              font-size: 13px;
              font-weight: 600;
              margin: 14px 0 6px 0;
            }
            .readiness-fallback h2:first-child { margin-top: 0; }
            .readiness-fallback p { margin: 0 0 8px 0; }
            .readiness-fallback ul, .readiness-fallback ol { margin: 0 0 8px 0; padding-left: 18px; }
            .readiness-fallback li { margin-bottom: 4px; }
            .readiness-fallback table {
              width: 100%;
              border-collapse: collapse;
              margin: 8px 0;
              font-size: 11px;
            }
            .readiness-fallback th, .readiness-fallback td {
              padding: 4px 8px;
              border: 1px solid var(--color-border);
              text-align: left;
            }
            .readiness-fallback th {
              background: var(--color-surface);
              font-weight: 600;
            }
          `}</style>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{rawResult}</ReactMarkdown>
        </div>
      )}
    </div>
  );
}

export default function CritiquePanel() {
  const [activeTab, setActiveTab] = useState<SubTab>("chapter");

  function renderContent() {
    switch (activeTab) {
      case "chapter":
        return <ChapterCritiqueView />;
      case "continuity":
        return <ContinuityCheckView />;
      case "readiness":
        return <ReadinessCheckView />;
      default:
        return null;
    }
  }

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
          padding: "6px 8px",
          gap: 4,
          borderBottom: "1px solid var(--color-border)",
          flexShrink: 0,
        }}
      >
        {SUB_TABS.map(function renderTab(tab) {
          const isActive = activeTab === tab.key;
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={function handleClick() {
                setActiveTab(tab.key);
              }}
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 5,
                padding: "6px 8px",
                fontSize: 11,
                fontWeight: isActive ? 600 : 400,
                fontFamily: "inherit",
                color: isActive ? "var(--color-accent)" : "var(--color-text-muted)",
                backgroundColor: isActive
                  ? "color-mix(in srgb, var(--color-accent) 8%, transparent)"
                  : "transparent",
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
                transition: "all 150ms",
              }}
            >
              <Icon size={12} />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
        {renderContent()}
      </div>
    </div>
  );
}
