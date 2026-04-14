"use client";

import { useState, useEffect, useRef, type ReactNode } from "react";
import { ChevronRight, Maximize2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface SidebarSectionProps {
  id: string;
  label: string;
  icon: LucideIcon;
  bookKey: string;
  defaultOpen?: boolean;
  badge?: string | number;
  onOpen?: () => void;
  children: ReactNode;
}

function storageKey(bookKey: string): string {
  return "scriva-sidebar-sections:" + bookKey;
}

function loadSections(bookKey: string): Record<string, boolean> {
  try {
    var raw = localStorage.getItem(storageKey(bookKey));
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}

function saveSectionState(bookKey: string, id: string, open: boolean) {
  var sections = loadSections(bookKey);
  sections[id] = open;
  try {
    localStorage.setItem(storageKey(bookKey), JSON.stringify(sections));
  } catch {}
}

export default function SidebarSection(props: SidebarSectionProps) {
  var saved = loadSections(props.bookKey);
  var initial = saved[props.id] !== undefined ? saved[props.id] : (props.defaultOpen ?? false);
  var [open, setOpen] = useState(initial);
  var contentRef = useRef<HTMLDivElement>(null);
  var [height, setHeight] = useState<number | undefined>(undefined);
  var Icon = props.icon;

  useEffect(function syncSaved() {
    var s = loadSections(props.bookKey);
    var v = s[props.id] !== undefined ? s[props.id] : (props.defaultOpen ?? false);
    setOpen(v);
  }, [props.bookKey, props.id, props.defaultOpen]);

  useEffect(function measureHeight() {
    if (contentRef.current) {
      setHeight(contentRef.current.scrollHeight);
    }
  }, [open, props.children]);

  function toggle() {
    var next = !open;
    setOpen(next);
    saveSectionState(props.bookKey, props.id, next);
  }

  function handleOpen(e: React.MouseEvent) {
    e.stopPropagation();
    if (props.onOpen) props.onOpen();
  }

  return (
    <div style={{ borderBottom: "1px solid var(--color-border)" }}>
      <button
        onClick={toggle}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          width: "100%",
          padding: "8px 12px",
          border: "none",
          background: "transparent",
          cursor: "pointer",
          fontFamily: "var(--font-inter), system-ui, sans-serif",
          fontSize: 11,
          fontWeight: 600,
          color: "var(--color-text-muted)",
          textTransform: "uppercase",
          letterSpacing: "0.5px",
          textAlign: "left",
          transition: "color 150ms",
        }}
        onMouseEnter={function enter(e) { e.currentTarget.style.color = "var(--color-text)"; }}
        onMouseLeave={function leave(e) { e.currentTarget.style.color = "var(--color-text-muted)"; }}
      >
        <ChevronRight
          size={12}
          style={{
            transform: open ? "rotate(90deg)" : "rotate(0deg)",
            transition: "transform 150ms ease",
            flexShrink: 0,
          }}
        />
        <Icon size={13} strokeWidth={1.5} style={{ flexShrink: 0 }} />
        <span style={{ flex: 1 }}>{props.label}</span>
        {props.badge !== undefined && props.badge !== "" && (
          <span style={{
            fontSize: 10,
            fontWeight: 500,
            color: "var(--color-text-muted)",
            textTransform: "none",
            letterSpacing: "normal",
          }}>
            {props.badge}
          </span>
        )}
        {props.onOpen && (
          <span
            onClick={handleOpen}
            title="Open in editor"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 2,
              borderRadius: 3,
              color: "var(--color-text-muted)",
              opacity: 0.6,
              transition: "opacity 150ms, color 150ms",
              flexShrink: 0,
            }}
            onMouseEnter={function enter(e) { e.currentTarget.style.opacity = "1"; e.currentTarget.style.color = "var(--color-accent)"; }}
            onMouseLeave={function leave(e) { e.currentTarget.style.opacity = "0.6"; e.currentTarget.style.color = "var(--color-text-muted)"; }}
          >
            <Maximize2 size={11} strokeWidth={1.5} />
          </span>
        )}
      </button>
      <div
        style={{
          overflow: "hidden",
          maxHeight: open ? (height !== undefined ? height + "px" : "none") : "0px",
          transition: "max-height 200ms ease",
        }}
      >
        <div ref={contentRef}>
          {props.children}
        </div>
      </div>
    </div>
  );
}
