"use client";

import { useState, useEffect, useRef } from "react";
import { Sparkles, X, Loader2 } from "lucide-react";
import { useAppStore } from "@/store";
import { getBookConfig, getScrivaConfig } from "@/lib/bookConfig";

export default function MigrationBanner() {
  var currentBook = useAppStore(function selectBook(s) { return s.editor.currentBook; });
  var keysStored = useAppStore(function selectKeys(s) { return s.preferences.keysStored; });

  var cfg = getBookConfig(currentBook);
  var owner = cfg?.owner || "";
  var repo = cfg?.repo || "";
  var branch = cfg?.branch || "main";
  var hasScriva = getScrivaConfig(currentBook) !== null;

  var [visible, setVisible] = useState(false);
  var [migrating, setMigrating] = useState(false);
  var [dismissed, setDismissed] = useState(false);
  var checkedRef = useRef("");

  useEffect(function checkMigration() {
    if (!keysStored || !owner || !repo || hasScriva || dismissed) {
      setVisible(false);
      return;
    }

    var checkKey = owner + "/" + repo + "/" + branch;
    if (checkedRef.current === checkKey) return;
    checkedRef.current = checkKey;

    window.fetch("/api/github/files?owner=" + owner + "&repo=" + repo + "&path=.scriva/config.json&branch=" + branch)
      .then(function handleRes(res) {
        if (res.ok) {
          setVisible(false);
        } else {
          setVisible(true);
        }
      })
      .catch(function handleErr() { setVisible(true); });
  }, [keysStored, owner, repo, branch, hasScriva, dismissed]);

  function handleMigrate() {
    if (!owner || !repo) return;
    setMigrating(true);

    window.fetch("/api/scaffold", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        owner,
        repo,
        branch,
        writingType: "fiction",
        migrate: true,
      }),
    })
      .then(function handleRes(res) {
        if (res.ok) {
          setVisible(false);
        }
      })
      .catch(function handleErr() {})
      .finally(function done() { setMigrating(false); });
  }

  function handleDismiss() {
    setDismissed(true);
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 12,
      padding: "8px 16px",
      backgroundColor: "color-mix(in srgb, var(--color-accent) 8%, var(--color-bg))",
      borderBottom: "1px solid var(--color-accent)",
      fontFamily: "var(--font-inter), system-ui, sans-serif",
      fontSize: 13,
    }}>
      <Sparkles size={16} style={{ color: "var(--color-accent)", flexShrink: 0 }} />
      <span style={{ flex: 1, color: "var(--color-text)" }}>
        Upgrade this book to the Scriva framework for AI-powered summaries, world tracking, voice analysis, and more.
      </span>
      <button
        onClick={handleMigrate}
        disabled={migrating}
        style={{
          padding: "4px 12px",
          fontFamily: "inherit",
          fontSize: 12,
          fontWeight: 500,
          backgroundColor: "var(--color-accent)",
          color: "#fff",
          border: "none",
          borderRadius: 6,
          cursor: migrating ? "default" : "pointer",
          display: "flex",
          alignItems: "center",
          gap: 4,
          flexShrink: 0,
          opacity: migrating ? 0.6 : 1,
        }}
      >
        {migrating ? (
          <>
            <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} />
            Migrating...
          </>
        ) : (
          "Upgrade Now"
        )}
      </button>
      <button
        onClick={handleDismiss}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: "none",
          background: "transparent",
          color: "var(--color-text-muted)",
          cursor: "pointer",
          padding: 2,
          flexShrink: 0,
        }}
      >
        <X size={14} />
      </button>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
