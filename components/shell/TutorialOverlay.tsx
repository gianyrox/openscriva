"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronRight, ChevronLeft, X, BookOpen, PenLine, MessageSquare, BarChart3, Sparkles } from "lucide-react";

interface TutorialStep {
  target: string;
  title: string;
  description: string;
  icon: typeof BookOpen;
  position: "right" | "left" | "above" | "below" | "center";
}

var TUTORIAL_STEPS: TutorialStep[] = [
  {
    target: ".shell-left-panel",
    title: "Your Book",
    description: "This sidebar shows your chapters and files. Click any chapter to open it in the editor.",
    icon: BookOpen,
    position: "right",
  },
  {
    target: "main",
    title: "Write Here",
    description: "This is your editor. Start writing and your work auto-saves to GitHub. Use / for quick commands.",
    icon: PenLine,
    position: "center",
  },
  {
    target: ".shell-right-panel",
    title: "AI Assistant",
    description: "Chat with the AI to brainstorm, get feedback, or edit your writing. It knows your whole book.",
    icon: MessageSquare,
    position: "left",
  },
  {
    target: ".shell-status-bar",
    title: "Status Bar",
    description: "Track your word count, save status, and switch themes. Everything about your session lives here.",
    icon: BarChart3,
    position: "above",
  },
  {
    target: "",
    title: "You're All Set",
    description: "Start writing your story. You can customize AI features, writing rules, and voice settings from the sidebar panels anytime.",
    icon: Sparkles,
    position: "center",
  },
];

var STORAGE_KEY = "scriva-tutorial-done";

interface TutorialOverlayProps {
  onComplete: () => void;
}

export default function TutorialOverlay({ onComplete }: TutorialOverlayProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  var step = TUTORIAL_STEPS[currentStep];
  var isLastStep = currentStep === TUTORIAL_STEPS.length - 1;
  var isFirstStep = currentStep === 0;

  var measureTarget = useCallback(function measureTarget() {
    if (!step.target) {
      setTargetRect(null);
      return;
    }
    var el = document.querySelector(step.target);
    if (el) {
      setTargetRect(el.getBoundingClientRect());
    } else {
      setTargetRect(null);
    }
  }, [step.target]);

  useEffect(function measure() {
    measureTarget();
    window.addEventListener("resize", measureTarget);
    return function cleanup() {
      window.removeEventListener("resize", measureTarget);
    };
  }, [measureTarget]);

  function handleNext() {
    if (isLastStep) {
      handleDone();
    } else {
      setCurrentStep(currentStep + 1);
    }
  }

  function handleBack() {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  }

  function handleDone() {
    localStorage.setItem(STORAGE_KEY, "true");
    onComplete();
  }

  function getTooltipPosition(): React.CSSProperties {
    if (!targetRect || step.position === "center") {
      return {
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
      };
    }

    var padding = 16;

    if (step.position === "right") {
      return {
        position: "fixed",
        top: Math.max(padding, targetRect.top + targetRect.height / 2 - 100) + "px",
        left: (targetRect.right + padding) + "px",
      };
    }

    if (step.position === "left") {
      return {
        position: "fixed",
        top: Math.max(padding, targetRect.top + targetRect.height / 2 - 100) + "px",
        right: (window.innerWidth - targetRect.left + padding) + "px",
      };
    }

    if (step.position === "above") {
      return {
        position: "fixed",
        bottom: (window.innerHeight - targetRect.top + padding) + "px",
        left: "50%",
        transform: "translateX(-50%)",
      };
    }

    return {
      position: "fixed",
      top: (targetRect.bottom + padding) + "px",
      left: "50%",
      transform: "translateX(-50%)",
    };
  }

  var Icon = step.icon;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1100,
      }}
    >
      <svg
        style={{
          position: "fixed",
          inset: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
        }}
      >
        <defs>
          <mask id="tutorial-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {targetRect && (
              <rect
                x={targetRect.left - 4}
                y={targetRect.top - 4}
                width={targetRect.width + 8}
                height={targetRect.height + 8}
                rx="8"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(0, 0, 0, 0.6)"
          mask="url(#tutorial-mask)"
        />
      </svg>

      {targetRect && (
        <div
          style={{
            position: "fixed",
            left: (targetRect.left - 4) + "px",
            top: (targetRect.top - 4) + "px",
            width: (targetRect.width + 8) + "px",
            height: (targetRect.height + 8) + "px",
            borderRadius: "8px",
            border: "2px solid var(--color-accent)",
            pointerEvents: "none",
            boxShadow: "0 0 0 4px color-mix(in srgb, var(--color-accent) 20%, transparent)",
            transition: "all 0.3s ease",
          }}
        />
      )}

      <div
        style={{
          ...getTooltipPosition(),
          width: "340px",
          backgroundColor: "var(--color-bg)",
          border: "1px solid var(--color-border)",
          borderRadius: "16px",
          padding: "24px",
          boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
          zIndex: 1101,
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "10px",
              backgroundColor: "var(--color-surface)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon size={20} style={{ color: "var(--color-accent)" }} />
          </div>
          <button
            type="button"
            onClick={handleDone}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--color-text-muted)",
              padding: "4px",
              display: "flex",
              alignItems: "center",
            }}
          >
            <X size={18} />
          </button>
        </div>

        <div>
          <h3
            style={{
              fontFamily: "var(--font-inter), system-ui, sans-serif",
              fontSize: "16px",
              fontWeight: 600,
              color: "var(--color-text)",
              margin: "0 0 6px 0",
            }}
          >
            {step.title}
          </h3>
          <p
            style={{
              fontFamily: "var(--font-inter), system-ui, sans-serif",
              fontSize: "14px",
              lineHeight: "1.6",
              color: "var(--color-text-muted)",
              margin: 0,
            }}
          >
            {step.description}
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: "6px" }}>
            {TUTORIAL_STEPS.map(function renderDot(_, i) {
              return (
                <div
                  key={i}
                  style={{
                    width: "6px",
                    height: "6px",
                    borderRadius: "50%",
                    backgroundColor: i === currentStep ? "var(--color-accent)" : "var(--color-border)",
                    transition: "background-color 0.2s",
                  }}
                />
              );
            })}
          </div>

          <div style={{ display: "flex", gap: "8px" }}>
            {!isFirstStep && (
              <button
                type="button"
                onClick={handleBack}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  padding: "8px 14px",
                  fontFamily: "var(--font-inter), system-ui, sans-serif",
                  fontSize: "13px",
                  fontWeight: 500,
                  color: "var(--color-text-muted)",
                  backgroundColor: "transparent",
                  border: "1px solid var(--color-border)",
                  borderRadius: "8px",
                  cursor: "pointer",
                }}
              >
                <ChevronLeft size={14} />
                Back
              </button>
            )}
            <button
              type="button"
              onClick={handleNext}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                padding: "8px 16px",
                fontFamily: "var(--font-inter), system-ui, sans-serif",
                fontSize: "13px",
                fontWeight: 500,
                color: "#ffffff",
                backgroundColor: "var(--color-accent)",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                transition: "background-color 0.15s",
              }}
              onMouseEnter={function hoverOn(e) {
                e.currentTarget.style.backgroundColor = "var(--color-accent-hover)";
              }}
              onMouseLeave={function hoverOff(e) {
                e.currentTarget.style.backgroundColor = "var(--color-accent)";
              }}
            >
              {isLastStep ? "Start Writing" : "Next"}
              {!isLastStep && <ChevronRight size={14} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
