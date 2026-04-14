"use client";

interface LoadingStateProps {
  message?: string;
}

export default function LoadingState({ message = "Opening your manuscript..." }: LoadingStateProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        width: "100%",
        gap: 20,
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-literata), Georgia, serif",
          fontStyle: "italic",
          fontSize: 36,
          color: "var(--color-accent)",
          animation: "scriva-pulse 2s ease-in-out infinite",
          userSelect: "none",
        }}
      >
        s
      </span>
      <span
        style={{
          fontFamily: "var(--font-inter), system-ui, sans-serif",
          fontSize: 13,
          color: "var(--color-text-muted)",
        }}
      >
        {message}
      </span>
    </div>
  );
}
