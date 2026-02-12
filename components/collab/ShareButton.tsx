"use client";

import { useState, useRef, useEffect } from "react";
import { UserPlus, Send, X, Check, AlertCircle } from "lucide-react";
import { useAppStore } from "@/store";

interface ShareButtonProps {
  owner: string;
  repo: string;
}

export default function ShareButton({ owner, repo }: ShareButtonProps) {
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const keysStored = useAppStore(function selectKeysStored(s) {
    return s.preferences.keysStored;
  });

  useEffect(function handleClickOutside() {
    function onDocumentClick(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", onDocumentClick);
    }
    return function cleanup() {
      document.removeEventListener("mousedown", onDocumentClick);
    };
  }, [open]);

  function handleInvite() {
    if (!username.trim() || !keysStored) return;

    setLoading(true);
    setResult(null);

    fetch("/api/github/collaborators", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ owner, repo, username: username.trim() }),
    })
      .then(function handleResponse(res) {
        return res.json().then(function parseBody(data) {
          if (!res.ok) {
            setResult({ type: "error", message: data.error ?? "Failed to invite" });
            return;
          }
          if (data.already_collaborator) {
            setResult({ type: "success", message: `@${username.trim()} is already a collaborator` });
          } else {
            setResult({ type: "success", message: `Invitation sent to @${username.trim()}` });
          }
          setUsername("");
        });
      })
      .catch(function handleError() {
        setResult({ type: "error", message: "Network error" });
      })
      .finally(function done() {
        setLoading(false);
      });
  }

  return (
    <div ref={popoverRef} style={{ position: "relative", display: "inline-block" }}>
      <button
        type="button"
        onClick={function togglePopover() {
          setOpen(!open);
          setResult(null);
        }}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "6px 12px",
          border: "1px solid var(--color-border)",
          borderRadius: 8,
          background: "var(--color-surface)",
          color: "var(--color-text)",
          fontSize: 13,
          cursor: "pointer",
          fontFamily: "inherit",
          transition: "background-color 150ms ease",
        }}
        onMouseEnter={function onEnter(e) {
          e.currentTarget.style.backgroundColor = "var(--color-surface-hover)";
        }}
        onMouseLeave={function onLeave(e) {
          e.currentTarget.style.backgroundColor = "var(--color-surface)";
        }}
      >
        <UserPlus size={14} strokeWidth={1.5} />
        Share
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            width: 280,
            padding: 16,
            backgroundColor: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: 12,
            boxShadow: "0 8px 24px rgba(0, 0, 0, 0.12)",
            zIndex: 100,
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "var(--color-text)",
              }}
            >
              Invite Collaborator
            </span>
            <button
              type="button"
              onClick={function closePopover() {
                setOpen(false);
              }}
              style={{
                border: "none",
                background: "none",
                color: "var(--color-text-muted)",
                cursor: "pointer",
                padding: 2,
                display: "flex",
              }}
            >
              <X size={14} />
            </button>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="text"
              value={username}
              onChange={function onInput(e) {
                setUsername(e.target.value);
                setResult(null);
              }}
              onKeyDown={function onKeyDown(e) {
                if (e.key === "Enter") handleInvite();
              }}
              placeholder="GitHub username"
              style={{
                flex: 1,
                padding: "8px 10px",
                border: "1px solid var(--color-border)",
                borderRadius: 8,
                backgroundColor: "var(--color-bg)",
                color: "var(--color-text)",
                fontSize: 13,
                fontFamily: "inherit",
                outline: "none",
              }}
            />
            <button
              type="button"
              onClick={handleInvite}
              disabled={loading || !username.trim()}
              style={{
                padding: "8px 14px",
                border: "none",
                borderRadius: 8,
                backgroundColor: "var(--color-accent)",
                color: "#fff",
                fontSize: 13,
                fontWeight: 600,
                cursor: loading || !username.trim() ? "default" : "pointer",
                opacity: loading || !username.trim() ? 0.5 : 1,
                display: "flex",
                alignItems: "center",
                gap: 4,
                fontFamily: "inherit",
                transition: "opacity 150ms ease",
              }}
            >
              <Send size={13} strokeWidth={2} />
            </button>
          </div>

          {result && (
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 8,
                padding: "8px 10px",
                borderRadius: 8,
                backgroundColor:
                  result.type === "success"
                    ? "rgba(34, 197, 94, 0.08)"
                    : "rgba(239, 68, 68, 0.08)",
                color:
                  result.type === "success"
                    ? "var(--color-success)"
                    : "var(--color-error)",
                fontSize: 12,
                lineHeight: 1.4,
              }}
            >
              {result.type === "success" ? (
                <Check size={14} strokeWidth={2} style={{ flexShrink: 0, marginTop: 1 }} />
              ) : (
                <AlertCircle size={14} strokeWidth={2} style={{ flexShrink: 0, marginTop: 1 }} />
              )}
              {result.message}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
