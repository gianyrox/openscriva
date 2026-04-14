"use client";

import { useState, useEffect } from "react";
import { Globe, Plus, Trash2, Loader2, Save, Check } from "lucide-react";
import { useAppStore } from "@/store";
import { getBookConfig } from "@/lib/bookConfig";
import type { PlaceNode, TimelineEvent, ObjectNode, WorldRule } from "@/types/scriva";

var TABS = [
  { id: "places", label: "Places", path: ".scriva/world/places.json" },
  { id: "timeline", label: "Timeline", path: ".scriva/world/timeline.json" },
  { id: "objects", label: "Objects", path: ".scriva/world/objects.json" },
  { id: "rules", label: "Rules", path: ".scriva/world/rules.json" },
];

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

export default function WorldEditor(props: { filePath: string }) {
  var currentBook = useAppStore(function selectBook(s) { return s.editor.currentBook; });
  var config = getBookConfig(currentBook);
  var owner = config?.owner || "";
  var repo = config?.repo || "";
  var branch = config?.branch || "main";

  var initialTab = TABS.find(function f(t) { return t.path === props.filePath; })?.id || "places";
  var [activeTab, setActiveTab] = useState(initialTab);
  var [data, setData] = useState<any[]>([]);
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
      .then(function handleData(result) {
        setData(JSON.parse(result.content));
        setSha(result.sha);
      })
      .catch(function err() { setData([]); })
      .finally(function done() { setLoading(false); });
  }, [owner, repo, branch, currentPath]);

  function handleSave() {
    if (saving || !dirty || !owner || !repo) return;
    setSaving(true);

    window.fetch("/api/github/files", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        owner: owner, repo: repo, path: currentPath,
        content: JSON.stringify(data, null, 2),
        sha: sha, message: "Update " + currentPath, branch: branch,
      }),
    })
      .then(function handleRes(res) { return res.ok ? res.json() : Promise.reject(); })
      .then(function handleData(result) { setSha(result.sha); setDirty(false); setSaved(true); setTimeout(function cl() { setSaved(false); }, 2000); })
      .catch(function err() {})
      .finally(function done() { setSaving(false); });
  }

  function updateItem(idx: number, partial: Record<string, any>) {
    setData(data.map(function map(item, i) { return i === idx ? { ...item, ...partial } : item; }));
    setDirty(true);
    setSaved(false);
  }

  function addItem() {
    var newItem: any;
    if (activeTab === "places") newItem = { id: "place-" + Date.now(), name: "", description: "", significance: "", chapters: [] };
    else if (activeTab === "timeline") newItem = { id: "event-" + Date.now(), event: "", chapter: "", characters: [], significance: "", storyTime: "" };
    else if (activeTab === "objects") newItem = { id: "obj-" + Date.now(), name: "", description: "", significance: "", chapters: [] };
    else newItem = { id: "rule-" + Date.now(), rule: "", domain: "" };
    setData([...data, newItem]);
    setDirty(true);
  }

  function removeItem(idx: number) {
    setData(data.filter(function f(_, i) { return i !== idx; }));
    setDirty(true);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", fontFamily: "var(--font-inter), system-ui, sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 24px", borderBottom: "1px solid var(--color-border)", flexShrink: 0, backgroundColor: "var(--color-surface)" }}>
        <Globe size={18} strokeWidth={1.5} style={{ color: "var(--color-accent)", flexShrink: 0 }} />
        <span style={{ fontSize: 16, fontWeight: 600, color: "var(--color-text)", flex: 1 }}>World</span>
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
                color: active ? "var(--color-accent)" : "var(--color-text-muted)", fontFamily: "inherit", transition: "color 150ms",
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
          <div style={{ maxWidth: 720, margin: "0 auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
              <span style={{ fontSize: 13, color: "var(--color-text-muted)" }}>{data.length} item{data.length !== 1 ? "s" : ""}</span>
              <button onClick={addItem} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", border: "none", borderRadius: 6, backgroundColor: "var(--color-accent)", color: "#fff", fontSize: 12, fontWeight: 500, fontFamily: "inherit", cursor: "pointer" }}>
                <Plus size={13} /> Add
              </button>
            </div>

            {data.map(function renderItem(item, idx) {
              if (activeTab === "places") {
                var p = item as PlaceNode;
                return (
                  <div key={p.id} style={{ border: "1px solid var(--color-border)", borderRadius: 8, padding: 16, marginBottom: 8 }}>
                    <div style={{ display: "flex", gap: 12, marginBottom: 8 }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ display: "block", fontSize: 11, fontWeight: 500, color: "var(--color-text-muted)", marginBottom: 4 }}>Name</label>
                        <input type="text" value={p.name} onChange={function ch(e) { updateItem(idx, { name: e.target.value }); }} style={inputStyle} />
                      </div>
                      <button onClick={function rm() { removeItem(idx); }} style={{ border: "none", background: "none", color: "#d9534f", cursor: "pointer", alignSelf: "flex-end", padding: 8 }}><Trash2 size={14} /></button>
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <label style={{ display: "block", fontSize: 11, fontWeight: 500, color: "var(--color-text-muted)", marginBottom: 4 }}>Description</label>
                      <textarea value={p.description} onChange={function ch(e) { updateItem(idx, { description: e.target.value }); }} style={{ ...inputStyle, minHeight: 50, resize: "vertical" as const }} />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 11, fontWeight: 500, color: "var(--color-text-muted)", marginBottom: 4 }}>Significance</label>
                      <input type="text" value={p.significance} onChange={function ch(e) { updateItem(idx, { significance: e.target.value }); }} style={inputStyle} />
                    </div>
                  </div>
                );
              }
              if (activeTab === "timeline") {
                var ev = item as TimelineEvent;
                return (
                  <div key={ev.id} style={{ border: "1px solid var(--color-border)", borderRadius: 8, padding: 16, marginBottom: 8 }}>
                    <div style={{ display: "flex", gap: 12, marginBottom: 8 }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ display: "block", fontSize: 11, fontWeight: 500, color: "var(--color-text-muted)", marginBottom: 4 }}>Event</label>
                        <input type="text" value={ev.event} onChange={function ch(e) { updateItem(idx, { event: e.target.value }); }} style={inputStyle} />
                      </div>
                      <button onClick={function rm() { removeItem(idx); }} style={{ border: "none", background: "none", color: "#d9534f", cursor: "pointer", alignSelf: "flex-end", padding: 8 }}><Trash2 size={14} /></button>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 8 }}>
                      <div>
                        <label style={{ display: "block", fontSize: 11, fontWeight: 500, color: "var(--color-text-muted)", marginBottom: 4 }}>Story Time</label>
                        <input type="text" value={ev.storyTime} onChange={function ch(e) { updateItem(idx, { storyTime: e.target.value }); }} style={inputStyle} />
                      </div>
                      <div>
                        <label style={{ display: "block", fontSize: 11, fontWeight: 500, color: "var(--color-text-muted)", marginBottom: 4 }}>Significance</label>
                        <input type="text" value={ev.significance} onChange={function ch(e) { updateItem(idx, { significance: e.target.value }); }} style={inputStyle} />
                      </div>
                    </div>
                  </div>
                );
              }
              if (activeTab === "objects") {
                var obj = item as ObjectNode;
                return (
                  <div key={obj.id} style={{ border: "1px solid var(--color-border)", borderRadius: 8, padding: 16, marginBottom: 8 }}>
                    <div style={{ display: "flex", gap: 12, marginBottom: 8 }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ display: "block", fontSize: 11, fontWeight: 500, color: "var(--color-text-muted)", marginBottom: 4 }}>Name</label>
                        <input type="text" value={obj.name} onChange={function ch(e) { updateItem(idx, { name: e.target.value }); }} style={inputStyle} />
                      </div>
                      <button onClick={function rm() { removeItem(idx); }} style={{ border: "none", background: "none", color: "#d9534f", cursor: "pointer", alignSelf: "flex-end", padding: 8 }}><Trash2 size={14} /></button>
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <label style={{ display: "block", fontSize: 11, fontWeight: 500, color: "var(--color-text-muted)", marginBottom: 4 }}>Description</label>
                      <textarea value={obj.description} onChange={function ch(e) { updateItem(idx, { description: e.target.value }); }} style={{ ...inputStyle, minHeight: 50, resize: "vertical" as const }} />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 11, fontWeight: 500, color: "var(--color-text-muted)", marginBottom: 4 }}>Significance</label>
                      <input type="text" value={obj.significance} onChange={function ch(e) { updateItem(idx, { significance: e.target.value }); }} style={inputStyle} />
                    </div>
                  </div>
                );
              }
              var wr = item as WorldRule;
              return (
                <div key={wr.id} style={{ border: "1px solid var(--color-border)", borderRadius: 8, padding: 16, marginBottom: 8 }}>
                  <div style={{ display: "flex", gap: 12, marginBottom: 8 }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: "block", fontSize: 11, fontWeight: 500, color: "var(--color-text-muted)", marginBottom: 4 }}>Rule</label>
                      <input type="text" value={wr.rule} onChange={function ch(e) { updateItem(idx, { rule: e.target.value }); }} style={inputStyle} />
                    </div>
                    <button onClick={function rm() { removeItem(idx); }} style={{ border: "none", background: "none", color: "#d9534f", cursor: "pointer", alignSelf: "flex-end", padding: 8 }}><Trash2 size={14} /></button>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 500, color: "var(--color-text-muted)", marginBottom: 4 }}>Domain</label>
                    <input type="text" value={wr.domain} onChange={function ch(e) { updateItem(idx, { domain: e.target.value }); }} style={inputStyle} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
