"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Check, AlertCircle, Github, Loader2 } from "lucide-react";

interface GitHubStepProps {
  onValidated: (valid: boolean, username?: string) => void;
}

export default function GitHubStep({ onValidated }: GitHubStepProps) {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [username, setUsername] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [checking, setChecking] = useState(true);

  useEffect(function checkOAuthReturn() {
    const githubParam = searchParams.get("github");
    const usernameParam = searchParams.get("username");
    const reason = searchParams.get("reason");

    if (githubParam === "connected" && usernameParam) {
      setStatus("success");
      setUsername(usernameParam);
      onValidated(true, usernameParam);
      setChecking(false);
      return;
    }

    if (githubParam === "error") {
      setStatus("error");
      setErrorMessage(reason === "invalid_state"
        ? "Authorization expired. Please try again."
        : reason === "missing_params"
          ? "GitHub did not return the expected data. Please try again."
          : "Failed to connect to GitHub. Please try again.");
      onValidated(false);
      setChecking(false);
      return;
    }

    fetch("/api/auth/github/check")
      .then(function handleRes(res) { return res.json(); })
      .then(function handleData(data) {
        if (data.authenticated && data.username) {
          setStatus("success");
          setUsername(data.username);
          onValidated(true, data.username);
        } else {
          setStatus("idle");
        }
      })
      .catch(function noop() {
        setStatus("idle");
      })
      .finally(function done() {
        setChecking(false);
      });
  }, [searchParams, onValidated]);

  function handleConnect() {
    window.location.href = "/api/auth/github";
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
          history, backups, and collaboration built in. Connect your GitHub
          account to get started.
        </p>
      </div>

      {checking ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            padding: "20px",
            fontFamily: "var(--font-inter), system-ui, sans-serif",
            fontSize: "14px",
            color: "var(--color-text-muted)",
          }}
        >
          <Loader2 size={16} className="animate-spin" />
          Checking connection...
        </div>
      ) : status === "success" ? (
        <div
          style={{
            backgroundColor: "var(--color-surface)",
            borderRadius: "12px",
            padding: "20px 24px",
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              backgroundColor: "var(--color-success)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Check size={20} color="#ffffff" />
          </div>
          <div>
            <p
              style={{
                fontFamily: "var(--font-inter), system-ui, sans-serif",
                fontSize: "14px",
                fontWeight: 600,
                color: "var(--color-text)",
                margin: 0,
              }}
            >
              Connected as {username}
            </p>
            <p
              style={{
                fontFamily: "var(--font-inter), system-ui, sans-serif",
                fontSize: "13px",
                color: "var(--color-text-muted)",
                margin: "2px 0 0 0",
              }}
            >
              Your GitHub account is linked
            </p>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
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
              Scriva will request access to
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {[
                { name: "Repository contents", description: "Read and write your book files" },
                { name: "Pull requests", description: "Submit and review changes from editors" },
                { name: "Administration", description: "Invite collaborators to your book" },
              ].map(function renderPerm(perm) {
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
                        minWidth: "140px",
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

          <button
            type="button"
            onClick={handleConnect}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px",
              padding: "12px 24px",
              fontFamily: "var(--font-inter), system-ui, sans-serif",
              fontSize: "14px",
              fontWeight: 500,
              color: "#ffffff",
              backgroundColor: "#24292f",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              transition: "background-color 0.15s",
            }}
            onMouseEnter={function hoverOn(e) {
              e.currentTarget.style.backgroundColor = "#32383f";
            }}
            onMouseLeave={function hoverOff(e) {
              e.currentTarget.style.backgroundColor = "#24292f";
            }}
          >
            <Github size={18} />
            Connect to GitHub
          </button>

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
      )}
    </div>
  );
}
