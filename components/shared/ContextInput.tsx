"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  FileText,
  Users,
  BookOpen,
  ListTree,
  Mic,
  MousePointer,
  BookMarked,
  X,
} from "lucide-react";
import { formatTokenCount } from "@/lib/tokens";
import type { ContextRef } from "@/types";

interface ContextInputProps {
  value: string;
  onChange: (value: string) => void;
  contexts: ContextRef[];
  onContextsChange: (refs: ContextRef[]) => void;
  placeholder?: string;
  availableContexts: ContextRef[];
}

const typeIcons: Record<ContextRef["type"], typeof FileText> = {
  chapter: FileText,
  character: Users,
  research: BookOpen,
  outline: ListTree,
  voice: Mic,
  selection: MousePointer,
  book: BookMarked,
};

export default function ContextInput({
  value,
  onChange,
  contexts,
  onContextsChange,
  placeholder,
  availableContexts,
}: ContextInputProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [filter, setFilter] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filtered = availableContexts.filter(function matchFilter(ctx) {
    const alreadySelected = contexts.some(function isSelected(c) {
      return c.type === ctx.type && c.key === ctx.key;
    });
    if (alreadySelected) return false;
    if (!filter) return true;
    return ctx.label.toLowerCase().includes(filter.toLowerCase());
  });

  const resetDropdown = useCallback(function resetDropdown() {
    setShowDropdown(false);
    setFilter("");
    setActiveIndex(0);
  }, []);

  useEffect(function scrollActive() {
    if (!showDropdown || !dropdownRef.current) return;
    const activeEl = dropdownRef.current.children[activeIndex] as HTMLElement | undefined;
    if (activeEl) {
      activeEl.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex, showDropdown]);

  function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const text = e.target.value;
    onChange(text);

    const cursorPos = e.target.selectionStart;
    const textUpToCursor = text.slice(0, cursorPos);
    const lastAt = textUpToCursor.lastIndexOf("@");

    if (lastAt !== -1) {
      const afterAt = textUpToCursor.slice(lastAt + 1);
      if (!afterAt.includes(" ") && !afterAt.includes("\n")) {
        setShowDropdown(true);
        setFilter(afterAt);
        setActiveIndex(0);
        return;
      }
    }

    resetDropdown();
  }

  function selectContext(ctx: ContextRef) {
    onContextsChange([...contexts, ctx]);

    const cursorPos = inputRef.current?.selectionStart ?? value.length;
    const textUpToCursor = value.slice(0, cursorPos);
    const lastAt = textUpToCursor.lastIndexOf("@");

    if (lastAt !== -1) {
      const before = value.slice(0, lastAt);
      const after = value.slice(cursorPos);
      onChange(before + after);
    }

    resetDropdown();
    inputRef.current?.focus();
  }

  function removeContext(idx: number) {
    const updated = contexts.filter(function keepOthers(_, i) {
      return i !== idx;
    });
    onContextsChange(updated);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (!showDropdown) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex(function next(prev) {
        return prev < filtered.length - 1 ? prev + 1 : 0;
      });
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex(function prev(p) {
        return p > 0 ? p - 1 : filtered.length - 1;
      });
      return;
    }

    if (e.key === "Enter" && filtered.length > 0) {
      e.preventDefault();
      selectContext(filtered[activeIndex]);
      return;
    }

    if (e.key === "Escape") {
      e.preventDefault();
      resetDropdown();
    }
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 6,
        position: "relative",
        fontFamily: "var(--font-inter), system-ui, sans-serif",
      }}
    >
      {contexts.length > 0 && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 4,
          }}
        >
          {contexts.map(function renderPill(ctx, idx) {
            const Icon = typeIcons[ctx.type] ?? FileText;

            return (
              <span
                key={`${ctx.type}-${ctx.key}`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "3px 8px",
                  backgroundColor: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 6,
                  fontSize: 11,
                  color: "var(--color-text)",
                  lineHeight: 1,
                }}
              >
                <Icon size={11} strokeWidth={1.5} style={{ color: "var(--color-accent)" }} />
                <span style={{ maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {ctx.label}
                </span>
                {ctx.tokenCount != null && (
                  <span style={{ color: "var(--color-text-muted)", fontSize: 10 }}>
                    {formatTokenCount(ctx.tokenCount)}
                  </span>
                )}
                <button
                  type="button"
                  onClick={function onRemove() {
                    removeContext(idx);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    border: "none",
                    background: "none",
                    padding: 0,
                    cursor: "pointer",
                    color: "var(--color-text-muted)",
                    marginLeft: 2,
                  }}
                >
                  <X size={10} strokeWidth={2} />
                </button>
              </span>
            );
          })}
        </div>
      )}

      <textarea
        ref={inputRef}
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onBlur={function onBlur() {
          setTimeout(function delayClose() {
            resetDropdown();
          }, 200);
        }}
        placeholder={placeholder ?? "Type @ to add context..."}
        rows={3}
        style={{
          width: "100%",
          padding: "10px 12px",
          border: "1px solid var(--color-border)",
          borderRadius: 8,
          backgroundColor: "var(--color-bg)",
          color: "var(--color-text)",
          fontSize: 13,
          fontFamily: "inherit",
          lineHeight: 1.5,
          resize: "vertical",
          outline: "none",
          boxSizing: "border-box",
        }}
      />

      {showDropdown && filtered.length > 0 && (
        <div
          ref={dropdownRef}
          style={{
            position: "absolute",
            bottom: "calc(100% + 4px)",
            left: 0,
            right: 0,
            maxHeight: 240,
            overflow: "auto",
            backgroundColor: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: 10,
            boxShadow: "0 8px 24px rgba(0, 0, 0, 0.12)",
            zIndex: 200,
            padding: 4,
          }}
        >
          {filtered.map(function renderOption(ctx, idx) {
            const Icon = typeIcons[ctx.type] ?? FileText;
            const isActive = idx === activeIndex;

            return (
              <button
                key={`${ctx.type}-${ctx.key}`}
                type="button"
                onMouseDown={function onSelect(e) {
                  e.preventDefault();
                  selectContext(ctx);
                }}
                onMouseEnter={function onHover() {
                  setActiveIndex(idx);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  width: "100%",
                  padding: "8px 10px",
                  border: "none",
                  borderRadius: 6,
                  backgroundColor: isActive ? "var(--color-surface-hover)" : "transparent",
                  cursor: "pointer",
                  textAlign: "left",
                  fontFamily: "inherit",
                  transition: "background-color 100ms ease",
                }}
              >
                <Icon
                  size={14}
                  strokeWidth={1.5}
                  style={{ color: "var(--color-accent)", flexShrink: 0 }}
                />

                <span
                  style={{
                    flex: 1,
                    fontSize: 13,
                    color: "var(--color-text)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {ctx.label}
                </span>

                <span
                  style={{
                    fontSize: 11,
                    color: "var(--color-text-muted)",
                    flexShrink: 0,
                  }}
                >
                  {ctx.type}
                </span>

                {ctx.tokenCount != null && (
                  <span
                    style={{
                      fontSize: 10,
                      color: "var(--color-text-muted)",
                      opacity: 0.7,
                      flexShrink: 0,
                    }}
                  >
                    {formatTokenCount(ctx.tokenCount)}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
