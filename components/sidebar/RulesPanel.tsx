"use client";

import { useState, useEffect, useCallback } from "react";
import { Settings, Loader2, Save, Pencil } from "lucide-react";
import { useAppStore } from "@/store";
import { getBookConfig } from "@/lib/bookConfig";
import type { WritingRules } from "@/types/scriva";
import { defaultWritingRules } from "@/types/scriva";

export default function RulesPanel() {
  var currentBook = useAppStore(function selectBook(s) { return s.editor.currentBook; });
  var keysStored = useAppStore(function selectKeys(s) { return s.preferences.keysStored; });

  var cfg = getBookConfig(currentBook);
  var owner = cfg?.owner;
  var repo = cfg?.repo;
  var branch = cfg?.branch || "main";

  var [rules, setRules] = useState<WritingRules>(defaultWritingRules());
  var [loading, setLoading] = useState(false);
  var [editing, setEditing] = useState(false);
  var [saving, setSaving] = useState(false);
  var [editRules, setEditRules] = useState<WritingRules>(defaultWritingRules());
  var [sha, setSha] = useState<string | null>(null);

  var fetchRules = useCallback(function fetch() {
    if (!keysStored || !owner || !repo) return;
    setLoading(true);

    window.fetch("/api/github/files?owner=" + owner + "&repo=" + repo + "&path=.scriva/rules.json&branch=" + branch)
      .then(function handleRes(res) { return res.ok ? res.json() : null; })
      .then(function handleData(data) {
        if (data && data.content) {
          try {
            var parsed = JSON.parse(data.content);
            setRules(parsed);
            setSha(data.sha || null);
          } catch {}
        }
      })
      .catch(function handleErr() {})
      .finally(function done() { setLoading(false); });
  }, [keysStored, owner, repo, branch]);

  useEffect(function load() { fetchRules(); }, [fetchRules]);

  function handleEdit() {
    setEditing(true);
    setEditRules({ ...rules });
  }

  function handleSave() {
    if (!keysStored || !owner || !repo) return;
    setSaving(true);

    var body: Record<string, string> = {
      owner,
      repo,
      path: ".scriva/rules.json",
      content: JSON.stringify(editRules, null, 2),
      message: "Update writing rules",
    };
    if (sha) body.sha = sha;

    window.fetch("/api/github/files", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
      .then(function handleRes(res) { return res.json(); })
      .then(function handleData(data) {
        setRules(editRules);
        setSha(data.sha || sha);
        setEditing(false);
      })
      .catch(function handleErr() { alert("Failed to save rules."); })
      .finally(function done() { setSaving(false); });
  }

  function updateField(field: keyof WritingRules, value: string | string[]) {
    setEditRules(function update(prev) { return { ...prev, [field]: value }; });
  }

  if (!owner || !repo) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 12, color: "var(--color-text-muted)", padding: 24, textAlign: "center", fontFamily: "var(--font-inter), system-ui, sans-serif", fontSize: 13 }}>
        <Settings size={32} strokeWidth={1} style={{ opacity: 0.5 }} />
        <span>Open a book to view writing rules</span>
      </div>
    );
  }

  var inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "6px 10px",
    fontFamily: "var(--font-inter), system-ui, sans-serif",
    fontSize: 12,
    color: "var(--color-text)",
    backgroundColor: "var(--color-bg)",
    border: "1px solid var(--color-border)",
    borderRadius: 4,
    outline: "none",
    boxSizing: "border-box" as const,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", fontFamily: "var(--font-inter), system-ui, sans-serif", fontSize: 12 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", padding: "4px 12px" }}>
        {!editing ? (
          <button onClick={handleEdit} style={{ display: "flex", alignItems: "center", gap: 4, padding: "3px 8px", border: "none", background: "none", color: "var(--color-text-muted)", cursor: "pointer", borderRadius: 4, fontSize: 11, fontFamily: "inherit" }}>
            <Pencil size={12} /> Edit
          </button>
        ) : (
          <div style={{ display: "flex", gap: 4 }}>
            <button onClick={function cancel() { setEditing(false); }} style={{ fontSize: 11, padding: "3px 8px", border: "1px solid var(--color-border)", borderRadius: 4, background: "none", color: "var(--color-text-muted)", cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
            <button onClick={handleSave} disabled={saving} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, padding: "3px 8px", border: "none", borderRadius: 4, backgroundColor: "var(--color-accent)", color: "#fff", cursor: saving ? "default" : "pointer", fontFamily: "inherit", opacity: saving ? 0.6 : 1 }}>
              <Save size={12} /> {saving ? "Saving..." : "Save"}
            </button>
          </div>
        )}
      </div>

      <div style={{ maxHeight: 400, overflowY: "auto", padding: "0 12px 8px" }}>
        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 24, color: "var(--color-text-muted)" }}>
            <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : editing ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 500, color: "var(--color-text-muted)", display: "block", marginBottom: 3 }}>POV</label>
              <input type="text" value={editRules.povConsistency} onChange={function handle(e) { updateField("povConsistency", e.target.value); }} style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 500, color: "var(--color-text-muted)", display: "block", marginBottom: 3 }}>Tense</label>
              <input type="text" value={editRules.tenseConsistency} onChange={function handle(e) { updateField("tenseConsistency", e.target.value); }} style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 500, color: "var(--color-text-muted)", display: "block", marginBottom: 3 }}>Dialogue Style</label>
              <input type="text" value={editRules.dialogueStyle} onChange={function handle(e) { updateField("dialogueStyle", e.target.value); }} style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 500, color: "var(--color-text-muted)", display: "block", marginBottom: 3 }}>Tone (comma-separated)</label>
              <input type="text" value={editRules.tone.join(", ")} onChange={function handle(e) { updateField("tone", e.target.value.split(",").map(function trim(s) { return s.trim(); }).filter(function nonEmpty(s) { return s.length > 0; })); }} style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 500, color: "var(--color-text-muted)", display: "block", marginBottom: 3 }}>Prefer (comma-separated)</label>
              <input type="text" value={editRules.prefer.join(", ")} onChange={function handle(e) { updateField("prefer", e.target.value.split(",").map(function trim(s) { return s.trim(); }).filter(function nonEmpty(s) { return s.length > 0; })); }} style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 500, color: "var(--color-text-muted)", display: "block", marginBottom: 3 }}>Avoid (comma-separated)</label>
              <input type="text" value={editRules.avoid.join(", ")} onChange={function handle(e) { updateField("avoid", e.target.value.split(",").map(function trim(s) { return s.trim(); }).filter(function nonEmpty(s) { return s.length > 0; })); }} style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 500, color: "var(--color-text-muted)", display: "block", marginBottom: 3 }}>Custom Instructions</label>
              <textarea value={editRules.customInstructions} onChange={function handle(e) { updateField("customInstructions", e.target.value); }} rows={3} style={{ ...inputStyle, resize: "vertical" }} />
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {rules.povConsistency && <RuleRow label="POV" value={rules.povConsistency} />}
            {rules.tenseConsistency && <RuleRow label="Tense" value={rules.tenseConsistency} />}
            {rules.dialogueStyle && <RuleRow label="Dialogue" value={rules.dialogueStyle} />}
            {rules.tone.length > 0 && <RuleRow label="Tone" value={rules.tone.join(", ")} />}
            {rules.prefer.length > 0 && <RuleRow label="Prefer" value={rules.prefer.join(", ")} />}
            {rules.avoid.length > 0 && <RuleRow label="Avoid" value={rules.avoid.join(", ")} />}
            {rules.customInstructions && <RuleRow label="Custom" value={rules.customInstructions} />}
            {!rules.povConsistency && !rules.tenseConsistency && rules.tone.length === 0 && (
              <div style={{ color: "var(--color-text-muted)", fontSize: 12, textAlign: "center", padding: 24 }}>
                No writing rules set yet. Click Edit to add rules the AI will follow.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function RuleRow(props: { label: string; value: string }) {
  return (
    <div style={{ padding: "4px 0" }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.3px" }}>{props.label}</span>
      <div style={{ fontSize: 12, color: "var(--color-text)", marginTop: 2, lineHeight: 1.4 }}>{props.value}</div>
    </div>
  );
}
