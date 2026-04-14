"use client";

import { useState } from "react";
import { Quote, ChevronRight, Plus, Trash2 } from "lucide-react";
import EditorShell from "@/components/editors/EditorShell";
import type { CitationEntry } from "@/types/scriva";

var TYPES: CitationEntry["type"][] = ["book", "article", "journal", "web", "chapter", "other"];

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

function formatAPA(c: CitationEntry): string {
  var parts: string[] = [];
  if (c.authors.length > 0) parts.push(c.authors.join(", "));
  if (c.year) parts.push("(" + c.year + ")");
  parts.push(c.title + ".");
  if (c.publisher) parts.push(c.publisher + ".");
  if (c.journal) parts.push(c.journal + (c.volume ? ", " + c.volume : "") + (c.issue ? "(" + c.issue + ")" : "") + (c.pages ? ", " + c.pages : "") + ".");
  if (c.doi) parts.push("https://doi.org/" + c.doi);
  if (c.url && !c.doi) parts.push(c.url);
  return parts.join(" ");
}

function TagInput(props: { value: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      var val = e.currentTarget.value.trim();
      if (val && props.value.indexOf(val) === -1) {
        props.onChange([...props.value, val]);
      }
      e.currentTarget.value = "";
    }
  }

  function removeTag(idx: number) {
    props.onChange(props.value.filter(function f(_, i) { return i !== idx; }));
  }

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: props.value.length > 0 ? 4 : 0 }}>
        {props.value.map(function renderTag(tag, i) {
          return (
            <span key={tag + i} style={{
              display: "inline-flex", alignItems: "center", gap: 3, padding: "2px 8px", fontSize: 11, borderRadius: 4,
              backgroundColor: "color-mix(in srgb, var(--color-accent) 12%, transparent)", color: "var(--color-accent)",
            }}>
              {tag}
              <button onClick={function rm() { removeTag(i); }} style={{ border: "none", background: "none", color: "inherit", cursor: "pointer", padding: 0, fontSize: 12, lineHeight: 1 }}>x</button>
            </span>
          );
        })}
      </div>
      <input type="text" onKeyDown={handleKeyDown} placeholder={props.placeholder || "Type and press Enter..."} style={inputStyle} />
    </div>
  );
}

export default function CitationsEditor(props: { filePath: string }) {
  var [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <EditorShell filePath={props.filePath} title="Citations & Bibliography" icon={Quote}>
      {function renderForm(ctx) {
        var citations = ctx.data as CitationEntry[];

        function updateCite(id: string, partial: Partial<CitationEntry>) {
          ctx.setData(citations.map(function map(c) { return c.id === id ? { ...c, ...partial } : c; }));
        }

        function addCitation() {
          var entry: CitationEntry = {
            id: "cite-" + Date.now(),
            type: "book",
            title: "",
            authors: [],
          };
          ctx.setData([...citations, entry]);
          setExpandedId(entry.id);
        }

        function deleteCite(id: string) {
          ctx.setData(citations.filter(function f(c) { return c.id !== id; }));
          if (expandedId === id) setExpandedId(null);
        }

        return (
          <div style={{ maxWidth: 720, margin: "0 auto" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <span style={{ fontSize: 13, color: "var(--color-text-muted)" }}>{citations.length} citation{citations.length !== 1 ? "s" : ""}</span>
              <button
                onClick={addCitation}
                style={{
                  display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", border: "none", borderRadius: 6,
                  backgroundColor: "var(--color-accent)", color: "#fff", fontSize: 12, fontWeight: 500, fontFamily: "inherit", cursor: "pointer",
                }}
              >
                <Plus size={13} /> Add Citation
              </button>
            </div>

            {citations.map(function renderCite(cite) {
              var isExpanded = expandedId === cite.id;

              return (
                <div key={cite.id} style={{ border: "1px solid var(--color-border)", borderRadius: 8, marginBottom: 8, overflow: "hidden" }}>
                  <button
                    onClick={function toggle() { setExpandedId(isExpanded ? null : cite.id); }}
                    style={{
                      display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "12px 16px",
                      border: "none", background: isExpanded ? "var(--color-surface)" : "transparent",
                      cursor: "pointer", fontFamily: "inherit", textAlign: "left",
                    }}
                  >
                    <ChevronRight size={14} style={{ transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 150ms ease", flexShrink: 0, color: "var(--color-text-muted)" }} />
                    <span style={{ flex: 1, fontSize: 13, color: "var(--color-text)" }}>
                      {cite.title || <span style={{ color: "var(--color-text-muted)", fontStyle: "italic" }}>Untitled</span>}
                    </span>
                    <span style={{ fontSize: 11, color: "var(--color-text-muted)", textTransform: "capitalize" }}>{cite.type}</span>
                  </button>

                  {isExpanded && (
                    <div style={{ padding: "0 16px 16px" }}>
                      <div style={{ padding: "8px 12px", marginBottom: 12, backgroundColor: "var(--color-surface)", borderRadius: 6, fontSize: 12, color: "var(--color-text-muted)", lineHeight: 1.5, fontStyle: "italic" }}>
                        {formatAPA(cite) || "Fill in details to see preview..."}
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                        <div>
                          <label style={{ display: "block", fontSize: 11, fontWeight: 500, color: "var(--color-text-muted)", marginBottom: 4 }}>Type</label>
                          <select value={cite.type} onChange={function ch(e) { updateCite(cite.id, { type: e.target.value as CitationEntry["type"] }); }} style={inputStyle}>
                            {TYPES.map(function r(t) { return <option key={t} value={t}>{t}</option>; })}
                          </select>
                        </div>
                        <div>
                          <label style={{ display: "block", fontSize: 11, fontWeight: 500, color: "var(--color-text-muted)", marginBottom: 4 }}>Year</label>
                          <input type="number" value={cite.year || ""} onChange={function ch(e) { updateCite(cite.id, { year: parseInt(e.target.value) || undefined }); }} style={inputStyle} />
                        </div>
                      </div>

                      <div style={{ marginBottom: 12 }}>
                        <label style={{ display: "block", fontSize: 11, fontWeight: 500, color: "var(--color-text-muted)", marginBottom: 4 }}>Title</label>
                        <input type="text" value={cite.title} onChange={function ch(e) { updateCite(cite.id, { title: e.target.value }); }} style={inputStyle} />
                      </div>

                      <div style={{ marginBottom: 12 }}>
                        <label style={{ display: "block", fontSize: 11, fontWeight: 500, color: "var(--color-text-muted)", marginBottom: 4 }}>Authors</label>
                        <TagInput value={cite.authors} onChange={function ch(v) { updateCite(cite.id, { authors: v }); }} placeholder="Add author..." />
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                        <div>
                          <label style={{ display: "block", fontSize: 11, fontWeight: 500, color: "var(--color-text-muted)", marginBottom: 4 }}>Publisher</label>
                          <input type="text" value={cite.publisher || ""} onChange={function ch(e) { updateCite(cite.id, { publisher: e.target.value }); }} style={inputStyle} />
                        </div>
                        <div>
                          <label style={{ display: "block", fontSize: 11, fontWeight: 500, color: "var(--color-text-muted)", marginBottom: 4 }}>Journal</label>
                          <input type="text" value={cite.journal || ""} onChange={function ch(e) { updateCite(cite.id, { journal: e.target.value }); }} style={inputStyle} />
                        </div>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
                        <div>
                          <label style={{ display: "block", fontSize: 11, fontWeight: 500, color: "var(--color-text-muted)", marginBottom: 4 }}>Volume</label>
                          <input type="text" value={cite.volume || ""} onChange={function ch(e) { updateCite(cite.id, { volume: e.target.value }); }} style={inputStyle} />
                        </div>
                        <div>
                          <label style={{ display: "block", fontSize: 11, fontWeight: 500, color: "var(--color-text-muted)", marginBottom: 4 }}>Issue</label>
                          <input type="text" value={cite.issue || ""} onChange={function ch(e) { updateCite(cite.id, { issue: e.target.value }); }} style={inputStyle} />
                        </div>
                        <div>
                          <label style={{ display: "block", fontSize: 11, fontWeight: 500, color: "var(--color-text-muted)", marginBottom: 4 }}>Pages</label>
                          <input type="text" value={cite.pages || ""} onChange={function ch(e) { updateCite(cite.id, { pages: e.target.value }); }} style={inputStyle} />
                        </div>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                        <div>
                          <label style={{ display: "block", fontSize: 11, fontWeight: 500, color: "var(--color-text-muted)", marginBottom: 4 }}>URL</label>
                          <input type="text" value={cite.url || ""} onChange={function ch(e) { updateCite(cite.id, { url: e.target.value }); }} style={inputStyle} />
                        </div>
                        <div>
                          <label style={{ display: "block", fontSize: 11, fontWeight: 500, color: "var(--color-text-muted)", marginBottom: 4 }}>DOI</label>
                          <input type="text" value={cite.doi || ""} onChange={function ch(e) { updateCite(cite.id, { doi: e.target.value }); }} style={inputStyle} />
                        </div>
                      </div>

                      <div style={{ marginBottom: 12 }}>
                        <label style={{ display: "block", fontSize: 11, fontWeight: 500, color: "var(--color-text-muted)", marginBottom: 4 }}>Notes</label>
                        <textarea value={cite.notes || ""} onChange={function ch(e) { updateCite(cite.id, { notes: e.target.value }); }} style={{ ...inputStyle, minHeight: 60, resize: "vertical" as const }} />
                      </div>

                      <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: 8, borderTop: "1px solid var(--color-border)" }}>
                        <button onClick={function del() { deleteCite(cite.id); }} style={{ display: "flex", alignItems: "center", gap: 4, border: "none", background: "none", color: "#d9534f", cursor: "pointer", fontSize: 12, fontFamily: "inherit" }}>
                          <Trash2 size={13} /> Delete Citation
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      }}
    </EditorShell>
  );
}
