"use client";

import { useState } from "react";
import {
  Eye,
  EyeOff,
  Check,
  ExternalLink,
  AlertCircle,
  Loader2,
} from "lucide-react";

interface GitHubStepProps {
  value: string;
  onChange: (value: string) => void;
  onValidated: (valid: boolean, username?: string) => void;
}

const PERMISSIONS = [
  {
    name: "Contents",
    description: "Read and write your book files",
  },
  {
    name: "Pull Requests",
    description: "Submit and review changes from editors",
  },
  {
    name: "Administration",
    description: "Invite collaborators to your book",
  },
  {
    name: "Metadata",
    description: "See your repository list",
  },
];

export default function GitHubStep({
  value,
  onChange,
  onValidated,
}: GitHubStepProps) {
  const [showToken, setShowToken] = useState(false);
  const [testing, setTesting] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [username, setUsername] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleTestConnection() {
    if (!value.trim()) return;
    setTesting(true);
    setStatus("idle");
    setErrorMessage("");

    try {
      const res = await fetch("/api/github/repos", {
        headers: { "x-github-token": value.trim() },
      });

      const data = await res.json();

      if (res.ok && data.username) {
        setStatus("success");
        setUsername(data.username);
        onValidated(true, data.username);
      } else {
        setStatus("error");
        setErrorMessage(data.error || "Authentication failed");
        onValidated(false);
      }
    } catch {
      setStatus("error");
      setErrorMessage("Network error. Check your connection.");
      onValidated(false);
    } finally {
      setTesting(false);
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    onChange(e.target.value);
    if (status !== "idle") {
      setStatus("idle");
      setUsername("");
      onValidated(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <div>
        <h2
          style={{
            fontFamily: "var(--font-inter), system-ui, sans-serif",
            fontSize: "20px",
            fontWeight: 600,
            color: "var(--color-text)",
            marginBottom: "8px",
          }}
        >
          Connect to GitHub
        </h2>
        <p
          style={{
            fontFamily: "var(--font-inter), system-ui, sans-serif",
            fontSize: "14px",
            lineHeight: "1.6",
            color: "var(--color-text-muted)",
          }}
        >
          Scriva stores your book in a GitHub repository so you have version
          history, backups, and collaboration built in. Create a fine-grained
          personal access token with the permissions below.
        </p>
      </div>

      <div
        style={{
          backgroundColor: "var(--color-surface)",
          borderRadius: "12px",
          padding: "16px 20px",
        }}
      >
        <p
          style={{
            fontFamily: "var(--font-inter), system-ui, sans-serif",
            fontSize: "13px",
            fontWeight: 500,
            color: "var(--color-text)",
            marginBottom: "12px",
          }}
        >
          Required permissions
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {PERMISSIONS.map(function renderPermission(perm) {
            return (
              <div
                key={perm.name}
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: "8px",
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-inter), system-ui, sans-serif",
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "var(--color-text)",
                    minWidth: "120px",
                  }}
                >
                  {perm.name}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-inter), system-ui, sans-serif",
                    fontSize: "13px",
                    color: "var(--color-text-muted)",
                  }}
                >
                  {perm.description}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <a
          href="https://github.com/settings/tokens?type=beta"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            fontFamily: "var(--font-inter), system-ui, sans-serif",
            fontSize: "13px",
            color: "var(--color-accent)",
            textDecoration: "none",
          }}
          onMouseEnter={function handleHover(e) {
            e.currentTarget.style.textDecoration = "underline";
          }}
          onMouseLeave={function handleLeave(e) {
            e.currentTarget.style.textDecoration = "none";
          }}
        >
          Create fine-grained token (recommended)
          <ExternalLink size={14} />
        </a>
        <a
          href="https://github.com/settings/tokens/new?scopes=repo"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            fontFamily: "var(--font-inter), system-ui, sans-serif",
            fontSize: "13px",
            color: "var(--color-text-muted)",
            textDecoration: "none",
          }}
          onMouseEnter={function handleHover(e) {
            e.currentTarget.style.textDecoration = "underline";
          }}
          onMouseLeave={function handleLeave(e) {
            e.currentTarget.style.textDecoration = "none";
          }}
        >
          Or create classic token with repo scope
          <ExternalLink size={14} />
        </a>
      </div>

      <div>
        <label
          htmlFor="github-token"
          style={{
            display: "block",
            fontFamily: "var(--font-inter), system-ui, sans-serif",
            fontSize: "13px",
            fontWeight: 500,
            color: "var(--color-text-muted)",
            marginBottom: "6px",
          }}
        >
          GitHub Personal Access Token
        </label>
        <div style={{ position: "relative" }}>
          <input
            id="github-token"
            type={showToken ? "text" : "password"}
            value={value}
            onChange={handleChange}
            placeholder="github_pat_..."
            spellCheck={false}
            autoComplete="off"
            style={{
              width: "100%",
              padding: "12px 48px 12px 16px",
              fontFamily: "var(--font-inter), system-ui, sans-serif",
              fontSize: "14px",
              color: "var(--color-text)",
              backgroundColor: "var(--color-bg)",
              border: "1px solid var(--color-border)",
              borderRadius: "8px",
              outline: "none",
              transition: "border-color 0.15s, box-shadow 0.15s",
            }}
            onFocus={function handleFocus(e) {
              e.currentTarget.style.borderColor = "var(--color-accent)";
              e.currentTarget.style.boxShadow =
                "0 0 0 3px color-mix(in srgb, var(--color-accent) 15%, transparent)";
            }}
            onBlur={function handleBlur(e) {
              e.currentTarget.style.borderColor = "var(--color-border)";
              e.currentTarget.style.boxShadow = "none";
            }}
          />
          <button
            type="button"
            onClick={function toggleVisibility() {
              setShowToken(!showToken);
            }}
            style={{
              position: "absolute",
              right: "12px",
              top: "50%",
              transform: "translateY(-50%)",
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--color-text-muted)",
              padding: "4px",
              display: "flex",
              alignItems: "center",
            }}
            aria-label={showToken ? "Hide token" : "Show token"}
          >
            {showToken ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <button
          type="button"
          onClick={handleTestConnection}
          disabled={!value.trim() || testing}
          style={{
            padding: "10px 20px",
            fontFamily: "var(--font-inter), system-ui, sans-serif",
            fontSize: "14px",
            fontWeight: 500,
            color: !value.trim() || testing ? "var(--color-text-muted)" : "var(--color-accent)",
            backgroundColor: "transparent",
            border: `1px solid ${!value.trim() || testing ? "var(--color-border)" : "var(--color-accent)"}`,
            borderRadius: "8px",
            cursor: !value.trim() || testing ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            transition: "all 0.15s",
          }}
        >
          {testing && <Loader2 size={16} className="animate-spin" />}
          Test Connection
        </button>

        {status === "success" && (
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontFamily: "var(--font-inter), system-ui, sans-serif",
              fontSize: "14px",
              fontWeight: 500,
              color: "var(--color-success)",
            }}
          >
            <Check size={16} />
            Connected as {username}
          </span>
        )}

        {status === "error" && (
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontFamily: "var(--font-inter), system-ui, sans-serif",
              fontSize: "14px",
              color: "var(--color-error)",
            }}
          >
            <AlertCircle size={16} />
            {errorMessage}
          </span>
        )}
      </div>
    </div>
  );
}
