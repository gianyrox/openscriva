"use client";

import { AlertCircle } from "lucide-react";

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export default function ErrorState({
  message = "Something went wrong, but your work is saved locally.",
  onRetry,
}: ErrorStateProps) {
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
        gap: 16,
      }}
    >
      <AlertCircle
        size={32}
        strokeWidth={1.5}
        style={{ color: "var(--color-error)", opacity: 0.8 }}
      />
      <p
        style={{
          fontFamily: "var(--font-inter), system-ui, sans-serif",
          fontSize: 13,
          lineHeight: 1.5,
          color: "var(--color-text-muted)",
          margin: 0,
          maxWidth: 280,
        }}
      >
        {message}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            padding: "6px 16px",
            fontSize: 13,
            fontFamily: "var(--font-inter), system-ui, sans-serif",
            fontWeight: 500,
            color: "var(--color-text)",
            backgroundColor: "var(--color-surface-hover)",
            border: "1px solid var(--color-border)",
            borderRadius: 6,
            cursor: "pointer",
            transition: "background-color 150ms ease",
          }}
          onMouseEnter={function onEnter(e) {
            e.currentTarget.style.backgroundColor = "var(--color-border)";
          }}
          onMouseLeave={function onLeave(e) {
            e.currentTarget.style.backgroundColor = "var(--color-surface-hover)";
          }}
        >
          Try again
        </button>
      )}
    </div>
  );
}
