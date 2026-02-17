"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronRight, ChevronLeft } from "lucide-react";
import posthog from "posthog-js";
import { useAppStore } from "@/store";
import type { BookConfig } from "@/types";
import type { WritingType } from "@/types/scriva";
import ApiKeyStep from "./ApiKeyStep";
import GitHubStep from "./GitHubStep";
import WritingTypeStep from "./WritingTypeStep";
import BookStep from "./BookStep";

const STEPS = [
  { label: "GitHub" },
  { label: "API Key" },
  { label: "Writing" },
  { label: "Book" },
];

export default function SetupWizard() {
  const router = useRouter();
  const updatePreferences = useAppStore(function selectUpdate(s) {
    return s.updatePreferences;
  });
  const setBook = useAppStore(function selectSetBook(s) {
    return s.setBook;
  });

  var lastStep = STEPS.length - 1;

  const [step, setStep] = useState(0);
  const [apiKey, setApiKey] = useState("");
  const [apiKeyValid, setApiKeyValid] = useState(false);
  const [githubValid, setGithubValid] = useState(false);
  const [githubUsername, setGithubUsername] = useState("");
  const [writingType, setWritingType] = useState<WritingType>("fiction");
  const [bookConfig, setBookConfig] = useState<BookConfig | null>(null);

  const handleBookSelected = useCallback(function handleBookSelected(
    config: BookConfig,
  ) {
    setBookConfig(config);
  }, []);

  function isStepValid(): boolean {
    if (step === 0) return githubValid;
    if (step === 1) return apiKeyValid;
    if (step === 2) return true;
    if (step === 3) return bookConfig !== null;
    return false;
  }

  function handleNext() {
    if (step < lastStep) {
      setStep(step + 1);
    } else {
      handleFinish();
    }
  }

  function handleBack() {
    if (step > 0) {
      setStep(step - 1);
    }
  }

  async function handleFinish() {
    await fetch("/api/keys/store", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        anthropicKey: apiKey.trim(),
      }),
    });

    updatePreferences({ keysStored: true });

    if (bookConfig) {
      const fullName = bookConfig.owner + "/" + bookConfig.repo;
      setBook(fullName);

      const books = JSON.parse(localStorage.getItem("scriva-books") || "[]");
      const exists = books.some(function match(b: { full_name: string }) {
        return b.full_name === fullName;
      });
      if (!exists) {
        books.push({
          full_name: fullName,
          name: bookConfig.repo,
          description: null,
          private: bookConfig.private ?? true,
          default_branch: bookConfig.branch,
          added_at: new Date().toISOString(),
        });
        localStorage.setItem("scriva-books", JSON.stringify(books));
      }

      const currentBook = {
        name: bookConfig.repo,
        full_name: fullName,
        description: null,
        private: bookConfig.private ?? true,
        default_branch: bookConfig.branch,
        updated_at: null,
      };
      localStorage.setItem("scriva-current-book", JSON.stringify(currentBook));

      try {
        await fetch("/api/scaffold", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            owner: bookConfig.owner,
            repo: bookConfig.repo,
            branch: bookConfig.branch,
            writingType,
          }),
        });
      } catch {}

      posthog.capture("setup_completed", {
        has_book_selected: true,
        book_name: bookConfig.repo,
        book_owner: bookConfig.owner,
        is_new_book: !exists,
        writing_type: writingType,
      });

      router.push("/book");
    } else {
      posthog.capture("setup_completed", {
        has_book_selected: false,
      });

      router.push("/shelf");
    }
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
      }}
    >
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
              onValidated={function handleGitHubValidated(valid, username) {
                setGithubValid(valid);
                if (username) setGithubUsername(username);
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
            <BookStep
              onBookSelected={handleBookSelected}
            />
          )}
        </div>

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
                cursor: "pointer",
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
            disabled={!isStepValid()}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "10px 24px",
              fontFamily: "var(--font-inter), system-ui, sans-serif",
              fontSize: "14px",
              fontWeight: 500,
              color: isStepValid() ? "#ffffff" : "var(--color-text-muted)",
              backgroundColor: isStepValid()
                ? "var(--color-accent)"
                : "var(--color-surface)",
              border: "none",
              borderRadius: "8px",
              cursor: isStepValid() ? "pointer" : "not-allowed",
              transition: "all 0.15s",
            }}
            onMouseEnter={function hoverOn(e) {
              if (isStepValid()) {
                e.currentTarget.style.backgroundColor =
                  "var(--color-accent-hover)";
              }
            }}
            onMouseLeave={function hoverOff(e) {
              if (isStepValid()) {
                e.currentTarget.style.backgroundColor = "var(--color-accent)";
              }
            }}
          >
            {step === lastStep ? "Finish Setup" : "Next"}
            {step < lastStep && <ChevronRight size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
}
