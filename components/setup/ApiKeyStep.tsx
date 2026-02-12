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

interface ApiKeyStepProps {
  value: string;
  onChange: (value: string) => void;
  onValidated: (valid: boolean) => void;
}

export default function ApiKeyStep({
  value,
  onChange,
  onValidated,
}: ApiKeyStepProps) {
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleTestConnection() {
    if (!value.trim()) return;
    setTesting(true);
    setStatus("idle");
    setErrorMessage("");

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-anthropic-key": value.trim(),
        },
        body: JSON.stringify({ mode: "test" }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setStatus("success");
        onValidated(true);
      } else {
        setStatus("error");
        setErrorMessage(data.error || "Connection failed");
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
          Connect to Anthropic
        </h2>
        <p
          style={{
            fontFamily: "var(--font-inter), system-ui, sans-serif",
            fontSize: "14px",
            lineHeight: "1.6",
            color: "var(--color-text-muted)",
          }}
        >
          Scriva uses Claude to help you write, edit, and critique your book.
          Sign up at Anthropic, go to Settings, then API Keys, create a key, and
          paste it here.
        </p>
      </div>

      <div>
        <label
          htmlFor="api-key"
          style={{
            display: "block",
            fontFamily: "var(--font-inter), system-ui, sans-serif",
            fontSize: "13px",
            fontWeight: 500,
            color: "var(--color-text-muted)",
            marginBottom: "6px",
          }}
        >
          Anthropic API Key
        </label>
        <div style={{ position: "relative" }}>
          <input
            id="api-key"
            type={showKey ? "text" : "password"}
            value={value}
            onChange={handleChange}
            placeholder="sk-ant-api03-..."
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
              setShowKey(!showKey);
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
            aria-label={showKey ? "Hide key" : "Show key"}
          >
            {showKey ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>

      <a
        href="https://console.anthropic.com/settings/keys"
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
        Open Anthropic API Keys
        <ExternalLink size={14} />
      </a>

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
            Connected
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
