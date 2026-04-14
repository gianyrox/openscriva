"use client";

import { useState, useEffect } from "react";
import { GitBranch, Loader2, Save, Check } from "lucide-react";
import { useAppStore } from "@/store";
import { getBookConfig } from "@/lib/bookConfig";
import type { NarrativeState, NarrativePromise, PlotThread, TensionData } from "@/types/scriva";

var TABS = [
  { id: "state", label: "State", path: ".scriva/narrative/state.json" },
  { id: "promises", label: "Promises", path: ".scriva/narrative/promises.json" },
  { id: "threads", label: "Threads", path: ".scriva/narrative/threads.json" },
  { id: "tension", label: "Tension", path: ".scriva/narrative/tension.json" },
];

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

var inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 12px",
  fontSize: 13,
  border: "1px solid var(--color-border)",
  borderRadius: 6,
  backgroundColor: "var(--color-bg)",
  color: "var(--color-text)",
  fontFamily: "var(--font-inter), system-ui, sans-serif",
  outline: "none",
};

export default function NarrativeEditor(props: { filePath: string }) {
  var currentBook = useAppStore(function selectBook(s) { return s.editor.currentBook; });
  var config = getBookConfig(currentBook);
  var owner = config?.owner || "";
  var repo = config?.repo || "";
  var branch = config?.branch || "main";

  var initialTab = TABS.find(function f(t) { return t.path === props.filePath; })?.id || "state";
  var [activeTab, setActiveTab] = useState(initialTab);
  var [data, setData] = useState<any>(null);
  var [sha, setSha] = useState<string | undefined>(undefined);
  var [loading, setLoading] = useState(true);
  var [dirty, setDirty] = useState(false);
  var [saving, setSaving] = useState(false);
  var [saved, setSaved] = useState(false);

  var currentPath = TABS.find(function f(t) { return t.id === activeTab; })?.path || TABS[0].path;

  useEffect(function loadData() {
    if (!owner || !repo) { setLoading(false); return; }
    setLoading(true);
    setDirty(false);
    setSaved(false);

    window.fetch("/api/github/files?owner=" + owner + "&repo=" + repo + "&path=" + encodeURIComponent(currentPath) + "&branch=" + branch)
      .then(function handleRes(res) { return res.ok ? res.json() : Promise.reject(); })
      .then(function handleData(result) { setData(JSON.parse(result.content)); setSha(result.sha); })
      .catch(function err() { setData(activeTab === "state" ? { currentPoint: "", readerKnows: [], readerExpects: [], dramaticIrony: [] } : []); })
      .finally(function done() { setLoading(false); });
  }, [owner, repo, branch, currentPath, activeTab]);

  function handleSave() {
    if (saving || !dirty || !owner || !repo) return;
    setSaving(true);

    window.fetch("/api/github/files", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ owner, repo, path: currentPath, content: JSON.stringify(data, null, 2), sha, message: "Update " + currentPath, branch }),
    })
      .then(function handleRes(res) { return res.ok ? res.json() : Promise.reject(); })
      .then(function handleData(result) { setSha(result.sha); setDirty(false); setSaved(true); setTimeout(function cl() { setSaved(false); }, 2000); })
      .catch(function err() {})
      .finally(function done() { setSaving(false); });
  }

  function renderState() {
    var state = data as NarrativeState;
    if (!state) return null;

    function updateState(field: string, value: any) {
      setData({ ...state, [field]: value });
      setDirty(true);
    }

    return (
      <div style={{ maxWidth: 680, margin: "0 auto" }}>
        <div style={{ padding: "8px 12px", marginBottom: 16, backgroundColor: "color-mix(in srgb, var(--color-accent) 8%, transparent)", borderRadius: 6, fontSize: 11, color: "var(--color-text-muted)", lineHeight: 1.5 }}>
          Narrative state is AI-derived. Edit to override AI conclusions.
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "var(--color-text)", marginBottom: 4 }}>Current Story Point</label>
          <input type="text" value={state.currentPoint || ""} onChange={function ch(e) { updateState("currentPoint", e.target.value); }} style={inputStyle} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "var(--color-text)", marginBottom: 4 }}>Reader Knows</label>
          {(state.readerKnows || []).map(function renderItem(item, i) {
            return (
              <div key={i} style={{ display: "flex", gap: 4, marginBottom: 4 }}>
                <input type="text" value={item} onChange={function ch(e) { var arr = [...state.readerKnows]; arr[i] = e.target.value; updateState("readerKnows", arr); }} style={{ ...inputStyle, flex: 1 }} />
              </div>
            );
          })}
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "var(--color-text)", marginBottom: 4 }}>Reader Expects</label>
          {(state.readerExpects || []).map(function renderItem(item, i) {
            return (
              <div key={i} style={{ display: "flex", gap: 4, marginBottom: 4 }}>
                <input type="text" value={item} onChange={function ch(e) { var arr = [...state.readerExpects]; arr[i] = e.target.value; updateState("readerExpects", arr); }} style={{ ...inputStyle, flex: 1 }} />
              </div>
            );
          })}
        </div>
        <div>
          <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "var(--color-text)", marginBottom: 4 }}>Dramatic Irony</label>
          {(state.dramaticIrony || []).map(function renderItem(item, i) {
            return (
              <div key={i} style={{ display: "flex", gap: 4, marginBottom: 4 }}>
                <input type="text" value={item} onChange={function ch(e) { var arr = [...state.dramaticIrony]; arr[i] = e.target.value; updateState("dramaticIrony", arr); }} style={{ ...inputStyle, flex: 1 }} />
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  function renderPromises() {
    var promises = data as NarrativePromise[];
    if (!Array.isArray(promises)) return null;

    return (
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <div style={{ padding: "8px 12px", marginBottom: 16, backgroundColor: "color-mix(in srgb, var(--color-accent) 8%, transparent)", borderRadius: 6, fontSize: 11, color: "var(--color-text-muted)" }}>
          Narrative promises tracked by the AI. Toggle override to edit.
        </div>
        {promises.map(function renderP(p, idx) {
          return (
            <div key={p.id} style={{ border: "1px solid var(--color-border)", borderRadius: 8, padding: 16, marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: STATUS_COLORS[p.status] || "var(--color-text-muted)", flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: "var(--color-text)" }}>{p.setup || "Untitled"}</span>
                <span style={{ fontSize: 11, color: STATUS_COLORS[p.status], textTransform: "capitalize" }}>{p.status}</span>
                <span style={{ fontSize: 10, color: "var(--color-text-muted)" }}>{p.urgency}</span>
              </div>
              <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
                Planted in: {p.setupChapter || "—"} {p.payoffChapter ? "| Payoff: " + p.payoffChapter : ""}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  function renderThreads() {
    var threads = data as PlotThread[];
    if (!Array.isArray(threads)) return null;

    return (
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        {threads.map(function renderT(t) {
          return (
            <div key={t.id} style={{ border: "1px solid var(--color-border)", borderRadius: 8, padding: 16, marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: STATUS_COLORS[t.status] || "var(--color-text-muted)", flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: "var(--color-text)" }}>{t.name}</span>
                <span style={{ fontSize: 11, color: STATUS_COLORS[t.status], textTransform: "capitalize" }}>{t.status}</span>
              </div>
              <div style={{ fontSize: 12, color: "var(--color-text-muted)", lineHeight: 1.5 }}>{t.summary}</div>
              {t.chapters.length > 0 && (
                <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 4 }}>Chapters: {t.chapters.join(", ")}</div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  function renderTension() {
    var tension = data as TensionData[];
    if (!Array.isArray(tension)) return null;

    var maxTension = 10;

    return (
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        {tension.length > 0 && (
          <div style={{ marginBottom: 24, padding: 16, border: "1px solid var(--color-border)", borderRadius: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text)", marginBottom: 12 }}>Tension Curve</div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 80 }}>
              {tension.map(function renderBar(t, i) {
                var pct = (t.tensionLevel / maxTension) * 100;
                return (
                  <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                    <div style={{
                      width: "100%",
                      height: pct + "%",
                      minHeight: 4,
                      backgroundColor: t.tensionLevel >= 7 ? "#d9534f" : t.tensionLevel >= 4 ? "#d4a843" : "#5b9bd5",
                      borderRadius: "2px 2px 0 0",
                      transition: "height 200ms",
                    }} />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tension.map(function renderItem(t, idx) {
          return (
            <div key={idx} style={{ border: "1px solid var(--color-border)", borderRadius: 8, padding: 16, marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text)" }}>{t.chapterId}</span>
                <span style={{
                  fontSize: 11, fontWeight: 600,
                  color: t.tensionLevel >= 7 ? "#d9534f" : t.tensionLevel >= 4 ? "#d4a843" : "#5b9bd5",
                }}>
                  {t.tensionLevel}/10
                </span>
              </div>
              <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>{t.emotionalBeat}</div>
              {t.pacingNote && <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 2, fontStyle: "italic" }}>{t.pacingNote}</div>}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", fontFamily: "var(--font-inter), system-ui, sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 24px", borderBottom: "1px solid var(--color-border)", flexShrink: 0, backgroundColor: "var(--color-surface)" }}>
        <GitBranch size={18} strokeWidth={1.5} style={{ color: "var(--color-accent)", flexShrink: 0 }} />
        <span style={{ fontSize: 16, fontWeight: 600, color: "var(--color-text)", flex: 1 }}>Narrative Intelligence</span>
        <button
          onClick={handleSave}
          disabled={!dirty || saving}
          style={{
            display: "flex", alignItems: "center", gap: 6, padding: "6px 16px", border: "none", borderRadius: 6,
            backgroundColor: dirty ? "var(--color-accent)" : "var(--color-surface)", color: dirty ? "#fff" : "var(--color-text-muted)",
            fontSize: 12, fontWeight: 500, fontFamily: "inherit", cursor: dirty && !saving ? "pointer" : "default", opacity: !dirty && !saved ? 0.5 : 1,
          }}
        >
          {saving ? <><Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> Saving...</> : saved ? <><Check size={13} /> Saved</> : <><Save size={13} /> Save</>}
        </button>
      </div>

      <div style={{ display: "flex", gap: 0, borderBottom: "1px solid var(--color-border)", padding: "0 16px", flexShrink: 0 }}>
        {TABS.map(function renderTab(t) {
          var active = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={function select() { setActiveTab(t.id); }}
              style={{
                padding: "8px 16px", border: "none", borderBottom: active ? "2px solid var(--color-accent)" : "2px solid transparent",
                background: "transparent", cursor: "pointer", fontSize: 12, fontWeight: active ? 600 : 400,
                color: active ? "var(--color-accent)" : "var(--color-text-muted)", fontFamily: "inherit",
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 40 }}><Loader2 size={20} style={{ animation: "spin 1s linear infinite", color: "var(--color-text-muted)" }} /></div>
        ) : (
          <>
            {activeTab === "state" && renderState()}
            {activeTab === "promises" && renderPromises()}
            {activeTab === "threads" && renderThreads()}
            {activeTab === "tension" && renderTension()}
          </>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
