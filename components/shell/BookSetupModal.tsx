"use client";

import { useState } from "react";
import { ChevronRight, ChevronLeft, Sparkles, Loader2 } from "lucide-react";
import type { WritingType, ScrivaFeatures, WritingRules } from "@/types/scriva";
import { defaultFeaturesForType, defaultWritingRules } from "@/types/scriva";
import { saveScrivaConfig } from "@/lib/bookConfig";
import WritingTypeStep from "@/components/setup/WritingTypeStep";
import FeaturesStep from "@/components/setup/FeaturesStep";
import RulesStep from "@/components/setup/RulesStep";

interface BookSetupModalProps {
  owner: string;
  repo: string;
  branch: string;
  onComplete: () => void;
}

var STEPS = [
  { label: "Writing Type" },
  { label: "Features" },
  { label: "Rules" },
];

export default function BookSetupModal(props: BookSetupModalProps) {
  var [step, setStep] = useState(0);
  var [writingType, setWritingType] = useState<WritingType>("fiction");
  var [features, setFeatures] = useState<ScrivaFeatures>(defaultFeaturesForType("fiction"));
  var [rules, setRules] = useState<WritingRules>(defaultWritingRules());
  var [saving, setSaving] = useState(false);

  function handleWritingTypeChange(type: WritingType) {
    setWritingType(type);
    setFeatures(defaultFeaturesForType(type));
  }

  function handleNext() {
    if (step < STEPS.length - 1) {
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

  function handleFinish() {
    setSaving(true);

    window.fetch("/api/scaffold", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        owner: props.owner,
        repo: props.repo,
        branch: props.branch,
        writingType: writingType,
        features: features,
        rules: rules,
      }),
    })
      .then(function handleRes(res) {
        if (res.ok) return res.json();
        throw new Error("Scaffold failed");
      })
      .then(function handleData(data) {
        if (data.config) {
          var repoKey = props.owner + "/" + props.repo;
          saveScrivaConfig(repoKey, data.config);
        }
        props.onComplete();
      })
      .catch(function handleErr() {
        var repoKey = props.owner + "/" + props.repo;
        saveScrivaConfig(repoKey, {
          version: "1.0.0",
          writingType: writingType,
          features: features,
          ai: {
            defaultModel: "sonnet",
            memoryModel: "haiku",
            embeddingModel: "voyage-3-lite",
            contextBudget: 4000,
            ragTopK: 5,
            autoReindex: true,
            autoReindexDebounceMs: 15000,
          },
        });
        props.onComplete();
      })
      .finally(function done() { setSaving(false); });
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(0, 0, 0, 0.5)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 520,
          maxHeight: "90vh",
          overflowY: "auto",
          backgroundColor: "var(--color-bg)",
          border: "1px solid var(--color-border)",
          borderRadius: 16,
          padding: 32,
          boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
          display: "flex",
          flexDirection: "column",
          gap: 24,
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 8 }}>
            <Sparkles size={20} style={{ color: "var(--color-accent)" }} />
            <span style={{
              fontFamily: "var(--font-literata), Georgia, serif",
              fontStyle: "italic",
              fontSize: 20,
              fontWeight: 500,
              color: "var(--color-accent)",
            }}>
              Configure Your Book
            </span>
          </div>
          <p style={{
            fontFamily: "var(--font-inter), system-ui, sans-serif",
            fontSize: 13,
            color: "var(--color-text-muted)",
            margin: 0,
            lineHeight: 1.5,
          }}>
            Set up the AI features for this project. You can change any of these from the sidebar later.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0 }}>
          {STEPS.map(function renderStep(s, i) {
            var isCompleted = i < step;
            var isCurrent = i === step;
            return (
              <div key={s.label} style={{ display: "flex", alignItems: "center" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <div style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 12,
                    fontWeight: 600,
                    fontFamily: "var(--font-inter), system-ui, sans-serif",
                    backgroundColor: isCompleted || isCurrent ? "var(--color-accent)" : "var(--color-surface)",
                    color: isCompleted || isCurrent ? "#fff" : "var(--color-text-muted)",
                    transition: "all 200ms",
                  }}>
                    {i + 1}
                  </div>
                  <span style={{
                    fontFamily: "var(--font-inter), system-ui, sans-serif",
                    fontSize: 10,
                    fontWeight: 500,
                    color: isCurrent ? "var(--color-accent)" : isCompleted ? "var(--color-text)" : "var(--color-text-muted)",
                    whiteSpace: "nowrap",
                  }}>
                    {s.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div style={{
                    width: 40,
                    height: 2,
                    backgroundColor: i < step ? "var(--color-accent)" : "var(--color-border)",
                    margin: "0 8px",
                    marginBottom: 18,
                    borderRadius: 1,
                  }} />
                )}
              </div>
            );
          })}
        </div>

        <div>
          {step === 0 && <WritingTypeStep value={writingType} onChange={handleWritingTypeChange} />}
          {step === 1 && <FeaturesStep features={features} onChange={setFeatures} />}
          {step === 2 && <RulesStep rules={rules} onChange={setRules} />}
        </div>

        <div style={{ display: "flex", justifyContent: step === 0 ? "flex-end" : "space-between", alignItems: "center" }}>
          {step > 0 && (
            <button
              onClick={handleBack}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                padding: "8px 16px",
                fontFamily: "var(--font-inter), system-ui, sans-serif",
                fontSize: 13,
                fontWeight: 500,
                color: "var(--color-text-muted)",
                backgroundColor: "transparent",
                border: "1px solid var(--color-border)",
                borderRadius: 8,
                cursor: "pointer",
              }}
            >
              <ChevronLeft size={14} />
              Back
            </button>
          )}

          <button
            onClick={handleNext}
            disabled={saving}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: "8px 20px",
              fontFamily: "var(--font-inter), system-ui, sans-serif",
              fontSize: 13,
              fontWeight: 500,
              color: "#fff",
              backgroundColor: "var(--color-accent)",
              border: "none",
              borderRadius: 8,
              cursor: saving ? "default" : "pointer",
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? (
              <>
                <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
                Setting up...
              </>
            ) : step === STEPS.length - 1 ? (
              "Finish Setup"
            ) : (
              <>
                Next
                <ChevronRight size={14} />
              </>
            )}
          </button>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
