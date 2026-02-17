"use client";

import { useState, useEffect } from "react";
import { GitBranch, Loader2, Flag } from "lucide-react";
import { useAppStore } from "@/store";
import { getBookConfig } from "@/lib/bookConfig";
import type { NarrativePromise, PlotThread, TensionData } from "@/types/scriva";

var STATUS_COLORS: Record<string, string> = {
  planted: "#5b9bd5",
  growing: "#d4a843",
  due: "#d9534f",
  paid: "#6ab04c",
  abandoned: "var(--color-text-muted)",
  open: "#5b9bd5",
  progressing: "#d4a843",
  resolved: "#6ab04c",
  dropped: "var(--color-text-muted)",
};

export default function NarrativePanel() {
  var currentBook = useAppStore(function selectBook(s) { return s.editor.currentBook; });
  var keysStored = useAppStore(function selectKeys(s) { return s.preferences.keysStored; });

  var cfg = getBookConfig(currentBook);
  var owner = cfg?.owner;
  var repo = cfg?.repo;
  var branch = cfg?.branch || "main";

  var [promises, setPromises] = useState<NarrativePromise[]>([]);
  var [threads, setThreads] = useState<PlotThread[]>([]);
  var [tension, setTension] = useState<TensionData[]>([]);
  var [loading, setLoading] = useState(false);

  useEffect(function load() {
    if (!keysStored || !owner || !repo) return;
    setLoading(true);

    Promise.all([
      window.fetch("/api/github/files?owner=" + owner + "&repo=" + repo + "&path=.scriva/narrative/promises.json&branch=" + branch),
      window.fetch("/api/github/files?owner=" + owner + "&repo=" + repo + "&path=.scriva/narrative/threads.json&branch=" + branch),
      window.fetch("/api/github/files?owner=" + owner + "&repo=" + repo + "&path=.scriva/narrative/tension.json&branch=" + branch),
    ]).then(function handleAll(responses) {
      return Promise.all(responses.map(function toJson(r) { return r.ok ? r.json() : null; }));
    }).then(function handleData(results) {
      if (results[0]?.content) try { setPromises(JSON.parse(results[0].content)); } catch {}
      if (results[1]?.content) try { setThreads(JSON.parse(results[1].content)); } catch {}
      if (results[2]?.content) try { setTension(JSON.parse(results[2].content)); } catch {}
    }).catch(function handleErr() {})
    .finally(function done() { setLoading(false); });
  }, [keysStored, owner, repo, branch]);

  if (!owner || !repo) {
    return (
      <div style={{ color: "var(--color-text-muted)", fontSize: 12, textAlign: "center", padding: 24, fontFamily: "var(--font-inter), system-ui, sans-serif" }}>
        Open a book to view narrative state
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 24, color: "var(--color-text-muted)" }}>
        <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "var(--font-inter), system-ui, sans-serif", fontSize: 12, maxHeight: 500, overflowY: "auto" }}>
      <SubSection title="Promises" count={promises.length}>
        {promises.length === 0 ? (
          <div style={{ color: "var(--color-text-muted)", fontSize: 11, textAlign: "center", padding: "12px 8px" }}>No narrative promises yet.</div>
        ) : promises.map(function renderPromise(p) {
          return (
            <div key={p.id} style={{ padding: "6px 12px", borderBottom: "1px solid var(--color-border)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Flag size={12} style={{ color: STATUS_COLORS[p.status], flexShrink: 0 }} />
                <span style={{ flex: 1, fontWeight: 500, color: "var(--color-text)" }}>{p.setup}</span>
                <span style={{ fontSize: 10, color: STATUS_COLORS[p.status], fontWeight: 500 }}>{p.status}</span>
              </div>
              <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 2, paddingLeft: 18 }}>
                Set up in ch. {p.setupChapter}{p.payoffChapter ? ", paid in ch. " + p.payoffChapter : ""} ({p.urgency} urgency)
              </div>
            </div>
          );
        })}
      </SubSection>

      <SubSection title="Threads" count={threads.length}>
        {threads.length === 0 ? (
          <div style={{ color: "var(--color-text-muted)", fontSize: 11, textAlign: "center", padding: "12px 8px" }}>No plot threads yet.</div>
        ) : threads.map(function renderThread(t) {
          return (
            <div key={t.id} style={{ padding: "6px 12px", borderBottom: "1px solid var(--color-border)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <GitBranch size={12} style={{ color: STATUS_COLORS[t.status], flexShrink: 0 }} />
                <span style={{ flex: 1, fontWeight: 500, color: "var(--color-text)" }}>{t.name}</span>
                <span style={{ fontSize: 10, color: STATUS_COLORS[t.status], fontWeight: 500 }}>{t.status}</span>
              </div>
              <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 2, paddingLeft: 18 }}>{t.summary}</div>
            </div>
          );
        })}
      </SubSection>

      <SubSection title="Tension" count={tension.length}>
        {tension.length === 0 ? (
          <div style={{ color: "var(--color-text-muted)", fontSize: 11, textAlign: "center", padding: "12px 8px" }}>No tension data yet.</div>
        ) : (
          <div style={{ padding: "8px 12px" }}>
            <div style={{ display: "flex", gap: 2, alignItems: "flex-end", height: 60, marginBottom: 8 }}>
              {tension.map(function renderBar(t) {
                var h = Math.max(4, (t.tensionLevel / 10) * 52);
                return (
                  <div key={t.chapterId} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }} title={t.chapterId + ": " + t.tensionLevel + "/10 - " + t.emotionalBeat}>
                    <div style={{ width: "100%", height: h, backgroundColor: "var(--color-accent)", borderRadius: 2, opacity: 0.6 + (t.tensionLevel / 25), minWidth: 4 }} />
                  </div>
                );
              })}
            </div>
            {tension.map(function renderDetail(t) {
              return (
                <div key={t.chapterId} style={{ padding: "3px 0", borderBottom: "1px solid var(--color-border)", fontSize: 11 }}>
                  <span style={{ fontWeight: 500, color: "var(--color-text)" }}>{t.chapterId}</span>
                  <span style={{ color: "var(--color-text-muted)", marginLeft: 6 }}>{t.tensionLevel}/10 - {t.emotionalBeat}</span>
                </div>
              );
            })}
          </div>
        )}
      </SubSection>
    </div>
  );
}

function SubSection(props: { title: string; count: number; children: React.ReactNode }) {
  var [open, setOpen] = useState(true);
  return (
    <div>
      <button
        onClick={function toggle() { setOpen(!open); }}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          width: "100%",
          padding: "5px 12px",
          border: "none",
          borderBottom: "1px solid var(--color-border)",
          background: "var(--color-surface)",
          cursor: "pointer",
          fontFamily: "inherit",
          fontSize: 10,
          fontWeight: 600,
          color: "var(--color-text-muted)",
          textTransform: "uppercase",
          letterSpacing: "0.5px",
          textAlign: "left",
        }}
      >
        <span style={{ flex: 1 }}>{props.title}</span>
        <span style={{ fontWeight: 500, fontSize: 10 }}>{props.count}</span>
      </button>
      {open && props.children}
    </div>
  );
}
