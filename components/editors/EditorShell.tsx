"use client";

import { useState, useEffect, useRef, type ReactNode } from "react";
import { Save, Loader2, AlertCircle, Check } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAppStore } from "@/store";
import { getBookConfig } from "@/lib/bookConfig";

interface EditorShellProps {
  filePath: string;
  title: string;
  icon: LucideIcon;
  children: (props: {
    data: any;
    setData: (data: any) => void;
    dirty: boolean;
    owner: string;
    repo: string;
    branch: string;
  }) => ReactNode;
}

export default function EditorShell(props: EditorShellProps) {
  var currentBook = useAppStore(function selectBook(s) { return s.editor.currentBook; });
  var config = getBookConfig(currentBook);

  var [data, setData] = useState<any>(null);
  var [sha, setSha] = useState<string | undefined>(undefined);
  var [loading, setLoading] = useState(true);
  var [error, setError] = useState<string | null>(null);
  var [dirty, setDirty] = useState(false);
  var [saving, setSaving] = useState(false);
  var [saved, setSaved] = useState(false);
  var originalRef = useRef<string>("");
  var Icon = props.icon;

  var owner = config?.owner || "";
  var repo = config?.repo || "";
  var branch = config?.branch || "main";

  useEffect(function load() {
    if (!owner || !repo) { setLoading(false); setError("No book selected"); return; }

    setLoading(true);
    setError(null);

    window.fetch("/api/github/files?owner=" + owner + "&repo=" + repo + "&path=" + encodeURIComponent(props.filePath) + "&branch=" + branch)
      .then(function handleRes(res) {
        if (!res.ok) throw new Error("File not found");
        return res.json();
      })
      .then(function handleData(result) {
        var parsed = JSON.parse(result.content);
        setData(parsed);
        setSha(result.sha);
        originalRef.current = result.content;
        setDirty(false);
      })
      .catch(function handleErr(e) {
        setError(e.message || "Failed to load");
      })
      .finally(function done() { setLoading(false); });
  }, [owner, repo, branch, props.filePath]);

  function handleSetData(next: any) {
    setData(next);
    setDirty(true);
    setSaved(false);
  }

  function handleSave() {
    if (!data || saving || !owner || !repo) return;
    setSaving(true);

    var content = JSON.stringify(data, null, 2);

    window.fetch("/api/github/files", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        owner: owner,
        repo: repo,
        path: props.filePath,
        content: content,
        sha: sha,
        message: "Update " + props.filePath,
        branch: branch,
      }),
    })
      .then(function handleRes(res) {
        if (!res.ok) throw new Error("Save failed");
        return res.json();
      })
      .then(function handleData(result) {
        setSha(result.sha);
        originalRef.current = content;
        setDirty(false);
        setSaved(true);
        setTimeout(function clearSaved() { setSaved(false); }, 2000);
      })
      .catch(function handleErr(e) {
        setError(e.message || "Save failed");
      })
      .finally(function done() { setSaving(false); });
  }

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--color-text-muted)" }}>
        <Loader2 size={24} style={{ animation: "spin 1s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 12, color: "var(--color-text-muted)" }}>
        <AlertCircle size={24} />
        <span style={{ fontSize: 14 }}>{error}</span>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", fontFamily: "var(--font-inter), system-ui, sans-serif" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "12px 24px",
          borderBottom: "1px solid var(--color-border)",
          flexShrink: 0,
          backgroundColor: "var(--color-surface)",
        }}
      >
        <Icon size={18} strokeWidth={1.5} style={{ color: "var(--color-accent)", flexShrink: 0 }} />
        <span style={{ fontSize: 16, fontWeight: 600, color: "var(--color-text)", flex: 1 }}>
          {props.title}
        </span>
        <span style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
          {props.filePath}
        </span>
        <button
          onClick={handleSave}
          disabled={!dirty || saving}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 16px",
            border: "none",
            borderRadius: 6,
            backgroundColor: dirty ? "var(--color-accent)" : "var(--color-surface)",
            color: dirty ? "#fff" : "var(--color-text-muted)",
            fontSize: 12,
            fontWeight: 500,
            fontFamily: "inherit",
            cursor: dirty && !saving ? "pointer" : "default",
            opacity: !dirty && !saved ? 0.5 : 1,
            transition: "all 150ms",
          }}
        >
          {saving ? (
            <><Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> Saving...</>
          ) : saved ? (
            <><Check size={13} /> Saved</>
          ) : (
            <><Save size={13} /> Save</>
          )}
        </button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "24px" }} data-scriva-scroll>
        {data !== null && props.children({ data, setData: handleSetData, dirty, owner, repo, branch })}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
