"use client";

import { useRouter } from "next/navigation";

interface BookCardRepo {
  name: string;
  full_name: string;
  description: string | null;
  private: boolean;
  default_branch: string;
  updated_at: string | null;
}

interface BookCardProps {
  repo: BookCardRepo;
  onSelect: (repo: BookCardRepo) => void;
}

function formatDate(dateString: string | null): string {
  if (!dateString) return "";
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

export default function BookCard({ repo, onSelect }: BookCardProps) {
  return (
    <button
      type="button"
      onClick={function handleClick() {
        onSelect(repo);
      }}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        padding: 20,
        backgroundColor: "var(--color-surface)",
        borderRadius: 12,
        border: "1px solid var(--color-border)",
        cursor: "pointer",
        textAlign: "left",
        width: "100%",
        transition: "background-color 150ms ease, border-color 150ms ease",
        fontFamily: "var(--font-inter), system-ui, sans-serif",
      }}
      onMouseEnter={function onEnter(e) {
        e.currentTarget.style.backgroundColor = "var(--color-surface-hover)";
        e.currentTarget.style.borderColor = "var(--color-text-muted)";
      }}
      onMouseLeave={function onLeave(e) {
        e.currentTarget.style.backgroundColor = "var(--color-surface)";
        e.currentTarget.style.borderColor = "var(--color-border)";
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
        }}
      >
        <span
          style={{
            fontSize: 16,
            fontWeight: 600,
            color: "var(--color-text)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            flex: 1,
          }}
        >
          {repo.name}
        </span>

        <span
          style={{
            fontSize: 11,
            fontWeight: 500,
            padding: "2px 8px",
            borderRadius: 9999,
            backgroundColor: repo.private
              ? "var(--color-surface-hover)"
              : "var(--color-success)",
            color: repo.private
              ? "var(--color-text-muted)"
              : "#ffffff",
            marginLeft: 8,
            flexShrink: 0,
          }}
        >
          {repo.private ? "Private" : "Public"}
        </span>
      </div>

      {repo.description && (
        <p
          style={{
            fontSize: 13,
            color: "var(--color-text-muted)",
            margin: 0,
            lineHeight: 1.4,
            overflow: "hidden",
            textOverflow: "ellipsis",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
          }}
        >
          {repo.description}
        </p>
      )}

      <span
        style={{
          fontSize: 12,
          color: "var(--color-text-muted)",
          opacity: 0.7,
          marginTop: "auto",
        }}
      >
        {formatDate(repo.updated_at)}
      </span>
    </button>
  );
}
