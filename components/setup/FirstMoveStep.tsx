"use client";

import {
  FilePen,
  BookOpen,
  Newspaper,
  Feather,
  NotebookPen,
  Sparkles,
  LayoutTemplate,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import manifest from "@/templates/manifest.json";

export type FirstMoveKind =
  | "blank-page"
  | "book"
  | "template"
  | "essay"
  | "poem"
  | "journal"
  | "skip";

export interface FirstMove {
  kind: FirstMoveKind;
  title?: string;
  // Set only when kind === "template" — the id from templates/manifest.json.
  templateId?: string;
}

interface TemplateShelfEntry {
  id: string;
  name: string;
  writingType: string;
  description: string;
}

const TEMPLATES: TemplateShelfEntry[] = (
  manifest as { templates: TemplateShelfEntry[] }
).templates;

interface FirstMoveStepProps {
  value: FirstMove;
  onChange: (move: FirstMove) => void;
}

interface MoveOption {
  kind: FirstMoveKind;
  icon: LucideIcon;
  label: string;
  description: string;
}

const OPTIONS: MoveOption[] = [
  {
    kind: "blank-page",
    icon: FilePen,
    label: "A blank page",
    description: "Just start writing. No structure.",
  },
  {
    kind: "book",
    icon: BookOpen,
    label: "A book",
    description: "Long-form, multiple chapters.",
  },
  {
    kind: "template",
    icon: LayoutTemplate,
    label: "Start from a template",
    description: "A pre-scaffolded mind and chapter skeleton for a form.",
  },
  {
    kind: "essay",
    icon: Newspaper,
    label: "An essay or article",
    description: "Single piece, medium length.",
  },
  {
    kind: "poem",
    icon: Feather,
    label: "A poem",
    description: "Verse, any form.",
  },
  {
    kind: "journal",
    icon: NotebookPen,
    label: "Morning pages / journal",
    description: "Daily writing practice.",
  },
  {
    kind: "skip",
    icon: Sparkles,
    label: "I'm not sure yet",
    description: "Just take me to my room.",
  },
];

export default function FirstMoveStep(props: FirstMoveStepProps) {
  function handleSelect(kind: FirstMoveKind) {
    if (kind === "book") {
      props.onChange({ kind, title: props.value.title ?? "" });
    } else if (kind === "template") {
      // Keep any previously picked template so re-selecting the option doesn't
      // clear the choice.
      props.onChange({ kind, templateId: props.value.templateId });
    } else {
      props.onChange({ kind });
    }
  }

  function handleTitleChange(e: React.ChangeEvent<HTMLInputElement>) {
    props.onChange({ kind: "book", title: e.target.value });
  }

  function handleTemplatePick(templateId: string) {
    props.onChange({ kind: "template", templateId });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <h2
        style={{
          fontFamily: "var(--font-literata), Georgia, serif",
          fontSize: "18px",
          fontWeight: 500,
          color: "var(--color-text)",
          margin: 0,
        }}
      >
        What&apos;s your first move?
      </h2>
      <p
        style={{
          fontFamily: "var(--font-inter), system-ui, sans-serif",
          fontSize: "13px",
          color: "var(--color-text-muted)",
          margin: 0,
          lineHeight: 1.5,
        }}
      >
        Pick something to start with. You can always add more later.
      </p>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          marginTop: "8px",
        }}
      >
        {OPTIONS.map(function renderOption(opt) {
          const Icon = opt.icon;
          const isSelected = props.value.kind === opt.kind;
          return (
            <div key={opt.kind} style={{ display: "flex", flexDirection: "column" }}>
              <button
                type="button"
                onClick={function select() {
                  handleSelect(opt.kind);
                }}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "12px",
                  padding: "14px 16px",
                  textAlign: "left",
                  backgroundColor: isSelected ? "var(--color-surface)" : "transparent",
                  border: isSelected
                    ? "1.5px solid var(--color-accent)"
                    : "1px solid var(--color-border)",
                  borderRadius: "10px",
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                <Icon
                  size={18}
                  style={{
                    flexShrink: 0,
                    marginTop: 1,
                    color: isSelected ? "var(--color-accent)" : "var(--color-text-muted)",
                  }}
                />
                <span style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <span
                    style={{
                      fontFamily: "var(--font-inter), system-ui, sans-serif",
                      fontSize: "14px",
                      fontWeight: 500,
                      color: isSelected ? "var(--color-accent)" : "var(--color-text)",
                    }}
                  >
                    {opt.label}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-inter), system-ui, sans-serif",
                      fontSize: "12px",
                      color: "var(--color-text-muted)",
                      lineHeight: 1.4,
                    }}
                  >
                    {opt.description}
                  </span>
                </span>
              </button>

              {opt.kind === "book" && isSelected && (
                <div style={{ display: "flex", flexDirection: "column", gap: "6px", padding: "12px 16px 4px 46px" }}>
                  <label
                    style={{
                      fontFamily: "var(--font-inter), system-ui, sans-serif",
                      fontSize: "12px",
                      fontWeight: 500,
                      color: "var(--color-text-muted)",
                    }}
                  >
                    Book title (optional)
                  </label>
                  <input
                    type="text"
                    value={props.value.title ?? ""}
                    onChange={handleTitleChange}
                    placeholder="Untitled Book"
                    style={{
                      fontSize: 14,
                      padding: "8px 12px",
                      borderRadius: 8,
                      border: "1px solid var(--color-border)",
                      backgroundColor: "var(--color-bg)",
                      color: "var(--color-text)",
                      outline: "none",
                      fontFamily: "var(--font-inter), system-ui, sans-serif",
                      transition: "border-color 0.15s",
                    }}
                  />
                </div>
              )}

              {opt.kind === "template" && isSelected && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                    padding: "12px 16px 4px 46px",
                  }}
                >
                  {TEMPLATES.map(function renderTemplate(tpl) {
                    const isTemplateSelected = props.value.templateId === tpl.id;
                    return (
                      <button
                        key={tpl.id}
                        type="button"
                        onClick={function pick() {
                          handleTemplatePick(tpl.id);
                        }}
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "2px",
                          padding: "10px 12px",
                          textAlign: "left",
                          backgroundColor: isTemplateSelected
                            ? "var(--color-surface)"
                            : "var(--color-bg)",
                          border: isTemplateSelected
                            ? "1.5px solid var(--color-accent)"
                            : "1px solid var(--color-border)",
                          borderRadius: "8px",
                          cursor: "pointer",
                          transition: "all 0.15s",
                        }}
                      >
                        <span
                          style={{
                            fontFamily: "var(--font-inter), system-ui, sans-serif",
                            fontSize: "13px",
                            fontWeight: 500,
                            color: isTemplateSelected
                              ? "var(--color-accent)"
                              : "var(--color-text)",
                          }}
                        >
                          {tpl.name}
                        </span>
                        <span
                          style={{
                            fontFamily: "var(--font-inter), system-ui, sans-serif",
                            fontSize: "12px",
                            color: "var(--color-text-muted)",
                            lineHeight: 1.4,
                          }}
                        >
                          {tpl.description}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
