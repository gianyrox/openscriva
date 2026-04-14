"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, ChevronRight, ChevronLeft } from "lucide-react";
import posthog from "posthog-js";
import { useAppStore } from "@/store";
import { saveBookConfig } from "@/lib/bookConfig";
import type { BookConfig, RoomProject } from "@/types";
import type { WritingType } from "@/types/scriva";
import ApiKeyStep from "./ApiKeyStep";
import GitHubStep from "./GitHubStep";
import WritingTypeStep from "./WritingTypeStep";
import FirstMoveStep, { type FirstMove } from "./FirstMoveStep";

const STEPS = [
  { label: "GitHub" },
  { label: "API Key" },
  { label: "Writing" },
  { label: "Start" },
];

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

export default function SetupWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const updatePreferences = useAppStore(function selectUpdate(s) {
    return s.updatePreferences;
  });
  const setBook = useAppStore(function selectSetBook(s) {
    return s.setBook;
  });
  const setDraftBranch = useAppStore(function selectSetDraftBranch(s) {
    return s.setDraftBranch;
  });

  var lastStep = STEPS.length - 1;

  const [bootstrapping, setBootstrapping] = useState(true);
  const [step, setStep] = useState(0);
  const [apiKey, setApiKey] = useState("");
  const [apiKeyValid, setApiKeyValid] = useState(false);
  const [githubValid, setGithubValid] = useState(false);
  const [writingType, setWritingType] = useState<WritingType>("fiction");
  const [firstMove, setFirstMove] = useState<FirstMove>({ kind: "blank-page" });
  const [isReturningUser, setIsReturningUser] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [finishError, setFinishError] = useState("");
  const [showConnectToast, setShowConnectToast] = useState(false);
  const [toastUsername, setToastUsername] = useState("");

  // A4: auto-skip on mount based on cookie state.
  useEffect(function bootstrap() {
    var cancelled = false;

    async function run() {
      try {
        const res = await fetch("/api/keys/check");
        const data = await res.json();
        if (cancelled) return;

        const hasGithubToken = Boolean(data.hasGithubToken);
        const hasAnthropicKey = Boolean(data.hasAnthropicKey);

        if (hasGithubToken && hasAnthropicKey) {
          updatePreferences({ keysStored: true });
          router.replace("/shelf");
          return;
        }

        if (hasGithubToken) {
          setIsReturningUser(true);
          // Pre-mark step 0 complete (GitHub already authed).
          setGithubValid(true);
          setStep(1);
        } else if (hasAnthropicKey) {
          setIsReturningUser(true);
          setApiKeyValid(true);
          setStep(0);
        }
      } catch {
        // Ignore; show wizard from step 0.
      } finally {
        if (!cancelled) setBootstrapping(false);
      }
    }

    void run();
    return function cleanup() {
      cancelled = true;
    };
  }, [router, updatePreferences]);

  // A7: detect first connect from OAuth callback redirect.
  useEffect(function handleConnectToast() {
    const githubParam = searchParams?.get("github") ?? null;
    const usernameParam = searchParams?.get("username") ?? null;
    if (githubParam === "connected" && usernameParam) {
      setToastUsername(usernameParam);
      setShowConnectToast(true);
      const timer = window.setTimeout(function hideToast() {
        setShowConnectToast(false);
      }, 4000);
      return function cleanup() {
        window.clearTimeout(timer);
      };
    }
    return undefined;
  }, [searchParams]);

  function isStepValid(): boolean {
    if (step === 0) return githubValid;
    if (step === 1) return apiKeyValid;
    if (step === 2) return true;
    if (step === 3) return true;
    return false;
  }

  function handleNext() {
    if (step < lastStep) {
      setStep(step + 1);
    } else {
      void handleFinish();
    }
  }

  function handleBack() {
    if (step > 0) {
      setStep(step - 1);
    }
  }

  async function handleFinish() {
    if (finishing) return;
    setFinishing(true);
    setFinishError("");

    // A3 made the key store idempotent at validation time, but POST again to be safe.
    try {
      if (apiKey.trim()) {
        await fetch("/api/keys/store", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ anthropicKey: apiKey.trim() }),
        });
      }
    } catch {}

    updatePreferences({ keysStored: true });

    posthog.capture("setup_completed", {
      first_move: firstMove.kind,
      writing_type: writingType,
      is_returning: isReturningUser,
    });

    if (firstMove.kind === "skip") {
      setFinishing(false);
      router.push("/shelf");
      return;
    }

    if (firstMove.kind === "book") {
      try {
        const res = await fetch("/api/github/room/books", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: (firstMove.title && firstMove.title.trim()) || "Untitled Book",
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(function fallback() {
            return { error: "Failed to create book" };
          });
          throw new Error(err.error || "Failed to create book");
        }
        const data = await res.json();

        const fullName = data.full_name as string;
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
        setFinishing(false);
        router.push("/book");
        return;
      } catch (err) {
        setFinishError(err instanceof Error ? err.message : "Failed to create book");
        setFinishing(false);
        return;
      }
    }

    // blank-page / essay / poem / journal -> POST /api/github/room/pages
    var title: string | undefined;
    if (firstMove.kind === "essay") title = "New Essay";
    else if (firstMove.kind === "poem") title = "New Poem";
    else if (firstMove.kind === "journal") {
      const today = new Date().toISOString().slice(0, 10);
      title = "Morning Pages — " + today;
    }
    // blank-page: leave title undefined; the route will pick a default.

    try {
      const body: Record<string, string> = {};
      if (title) body.title = title;
      const res = await fetch("/api/github/room/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(function fallback() {
          return { error: "Failed to create page" };
        });
        throw new Error(err.error || "Failed to create page");
      }
      const data = await res.json();

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
      setFinishing(false);
      router.push("/book");
    } catch (err) {
      setFinishError(err instanceof Error ? err.message : "Failed to create page");
      setFinishing(false);
    }
  }

  if (bootstrapping) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "var(--color-bg)",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-inter), system-ui, sans-serif",
            fontSize: "13px",
            color: "var(--color-text-muted)",
          }}
        >
          Restoring session...
        </span>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 20px",
        backgroundColor: "var(--color-bg)",
        position: "relative",
      }}
    >
      {showConnectToast && (
        <div
          style={{
            position: "fixed",
            top: 24,
            right: 24,
            zIndex: 1000,
            padding: "12px 16px",
            borderRadius: 10,
            backgroundColor: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontFamily: "var(--font-inter), system-ui, sans-serif",
            fontSize: 13,
            color: "var(--color-text)",
            maxWidth: 360,
          }}
        >
          <Check size={16} style={{ color: "var(--color-success)", flexShrink: 0 }} />
          <span>
            Connected as @{toastUsername} — you won&apos;t need to do this again
          </span>
        </div>
      )}

      <div
        style={{
          width: "100%",
          maxWidth: "520px",
          display: "flex",
          flexDirection: "column",
          gap: "40px",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <h1
            style={{
              fontFamily: "var(--font-literata), Georgia, serif",
              fontStyle: "italic",
              fontWeight: 500,
              fontSize: "32px",
              color: "var(--color-accent)",
              marginBottom: "4px",
            }}
          >
            scriva
          </h1>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0",
            padding: "0 20px",
          }}
        >
          {STEPS.map(function renderStepIndicator(s, i) {
            const isCompleted = i < step;
            const isCurrent = i === step;

            return (
              <div
                key={s.label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontFamily: "var(--font-inter), system-ui, sans-serif",
                      fontSize: "13px",
                      fontWeight: 600,
                      transition: "all 0.2s",
                      backgroundColor: isCompleted
                        ? "var(--color-accent)"
                        : isCurrent
                          ? "var(--color-accent)"
                          : "var(--color-surface)",
                      color: isCompleted || isCurrent
                        ? "#ffffff"
                        : "var(--color-text-muted)",
                    }}
                  >
                    {isCompleted ? <Check size={16} /> : i + 1}
                  </div>
                  <span
                    style={{
                      fontFamily: "var(--font-inter), system-ui, sans-serif",
                      fontSize: "11px",
                      fontWeight: 500,
                      color: isCurrent
                        ? "var(--color-accent)"
                        : isCompleted
                          ? "var(--color-text)"
                          : "var(--color-text-muted)",
                      whiteSpace: "nowrap",
                      transition: "color 0.2s",
                    }}
                  >
                    {s.label}
                  </span>
                </div>

                {i < STEPS.length - 1 && (
                  <div
                    style={{
                      width: "60px",
                      height: "2px",
                      backgroundColor:
                        i < step
                          ? "var(--color-accent)"
                          : "var(--color-border)",
                      margin: "0 12px",
                      marginBottom: "20px",
                      borderRadius: "1px",
                      transition: "background-color 0.2s",
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>

        <div
          style={{
            backgroundColor: "var(--color-bg)",
            borderRadius: "16px",
            border: "1px solid var(--color-border)",
            padding: "32px",
          }}
        >
          {step === 0 && (
            <GitHubStep
              onValidated={function handleGitHubValidated(valid) {
                setGithubValid(valid);
              }}
            />
          )}
          {step === 1 && (
            <ApiKeyStep
              value={apiKey}
              onChange={setApiKey}
              onValidated={setApiKeyValid}
            />
          )}
          {step === 2 && (
            <WritingTypeStep
              value={writingType}
              onChange={setWritingType}
            />
          )}
          {step === 3 && (
            <FirstMoveStep value={firstMove} onChange={setFirstMove} />
          )}
        </div>

        {finishError && (
          <div
            style={{
              fontFamily: "var(--font-inter), system-ui, sans-serif",
              fontSize: "13px",
              color: "var(--color-error)",
              textAlign: "center",
            }}
          >
            {finishError}
          </div>
        )}

        <div
          style={{
            display: "flex",
            justifyContent: step === 0 ? "flex-end" : "space-between",
            alignItems: "center",
          }}
        >
          {step > 0 && (
            <button
              type="button"
              onClick={handleBack}
              disabled={finishing}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "10px 20px",
                fontFamily: "var(--font-inter), system-ui, sans-serif",
                fontSize: "14px",
                fontWeight: 500,
                color: "var(--color-text-muted)",
                backgroundColor: "transparent",
                border: "1px solid var(--color-border)",
                borderRadius: "8px",
                cursor: finishing ? "not-allowed" : "pointer",
                transition: "all 0.15s",
              }}
              onMouseEnter={function hoverOn(e) {
                e.currentTarget.style.borderColor = "var(--color-text-muted)";
              }}
              onMouseLeave={function hoverOff(e) {
                e.currentTarget.style.borderColor = "var(--color-border)";
              }}
            >
              <ChevronLeft size={16} />
              Back
            </button>
          )}

          <button
            type="button"
            onClick={handleNext}
            disabled={!isStepValid() || finishing}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "10px 24px",
              fontFamily: "var(--font-inter), system-ui, sans-serif",
              fontSize: "14px",
              fontWeight: 500,
              color: isStepValid() && !finishing ? "#ffffff" : "var(--color-text-muted)",
              backgroundColor: isStepValid() && !finishing
                ? "var(--color-accent)"
                : "var(--color-surface)",
              border: "none",
              borderRadius: "8px",
              cursor: isStepValid() && !finishing ? "pointer" : "not-allowed",
              transition: "all 0.15s",
            }}
            onMouseEnter={function hoverOn(e) {
              if (isStepValid() && !finishing) {
                e.currentTarget.style.backgroundColor =
                  "var(--color-accent-hover)";
              }
            }}
            onMouseLeave={function hoverOff(e) {
              if (isStepValid() && !finishing) {
                e.currentTarget.style.backgroundColor = "var(--color-accent)";
              }
            }}
          >
            {step === lastStep
              ? finishing
                ? "Setting up..."
                : "Finish Setup"
              : "Next"}
            {step < lastStep && <ChevronRight size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
}
