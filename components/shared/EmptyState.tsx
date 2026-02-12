"use client";

import type { ReactNode } from "react";

interface EmptyStateProps {
  icon?: ReactNode;
  heading: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function EmptyState({ icon, heading, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        width: "100%",
        padding: 32,
        textAlign: "center",
      }}
    >
      <div style={{ maxWidth: 320, display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
        {icon && (
          <div style={{ color: "var(--color-text-muted)", opacity: 0.6, marginBottom: 4 }}>
            {icon}
          </div>
        )}
        <h3
          style={{
            fontFamily: "var(--font-literata), Georgia, serif",
            fontSize: 16,
            fontWeight: 600,
            color: "var(--color-text)",
            margin: 0,
          }}
        >
          {heading}
        </h3>
        <p
          style={{
            fontFamily: "var(--font-inter), system-ui, sans-serif",
            fontSize: 13,
            lineHeight: 1.5,
            color: "var(--color-text-muted)",
            margin: 0,
          }}
        >
          {description}
        </p>
        {actionLabel && onAction && (
          <button
            onClick={onAction}
            style={{
              marginTop: 8,
              padding: "6px 16px",
              fontSize: 13,
              fontFamily: "var(--font-inter), system-ui, sans-serif",
              fontWeight: 500,
              color: "var(--color-accent)",
              backgroundColor: "transparent",
              border: "1px solid var(--color-accent)",
              borderRadius: 6,
              cursor: "pointer",
              transition: "background-color 150ms ease",
            }}
            onMouseEnter={function onEnter(e) {
              e.currentTarget.style.backgroundColor = "color-mix(in srgb, var(--color-accent) 10%, transparent)";
            }}
            onMouseLeave={function onLeave(e) {
              e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}
