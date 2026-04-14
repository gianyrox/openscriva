"use client";

import { useState } from "react";
import { Users, ChevronRight, Plus, Trash2 } from "lucide-react";
import EditorShell from "@/components/editors/EditorShell";
import type { CharacterNode, Relationship } from "@/types/scriva";

var ROLES: CharacterNode["role"][] = ["protagonist", "antagonist", "supporting", "minor", "mentioned"];

var ROLE_COLORS: Record<string, string> = {
  protagonist: "#6ab04c",
  antagonist: "#d9534f",
  supporting: "#5b9bd5",
  minor: "var(--color-text-muted)",
  mentioned: "var(--color-text-muted)",
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

export default function CharactersEditor(props: { filePath: string }) {
  var [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <EditorShell filePath={props.filePath} title="Characters" icon={Users}>
      {function renderForm(ctx) {
        var characters = ctx.data as CharacterNode[];

        function updateChar(id: string, partial: Partial<CharacterNode>) {
          ctx.setData(characters.map(function map(c) { return c.id === id ? { ...c, ...partial } : c; }));
        }

        function addCharacter() {
          var newChar: CharacterNode = {
            id: "char-" + Date.now(),
            name: "New Character",
            aliases: [],
            role: "supporting",
            firstAppearance: "",
            lastAppearance: "",
            alive: true,
            description: "",
            arc: "",
            currentState: "",
            traits: [],
            relationships: [],
            appearances: [],
          };
          ctx.setData([...characters, newChar]);
          setExpandedId(newChar.id);
        }

        function deleteChar(id: string) {
          ctx.setData(characters.filter(function f(c) { return c.id !== id; }));
          if (expandedId === id) setExpandedId(null);
        }

        function addRelationship(charId: string) {
          var ch = characters.find(function f(c) { return c.id === charId; });
          if (!ch) return;
          var newRel: Relationship = { target: "", type: "", evolution: "", currentState: "" };
          updateChar(charId, { relationships: [...ch.relationships, newRel] });
        }

        function updateRelationship(charId: string, idx: number, partial: Partial<Relationship>) {
          var ch = characters.find(function f(c) { return c.id === charId; });
          if (!ch) return;
          var rels = ch.relationships.map(function map(r, i) { return i === idx ? { ...r, ...partial } : r; });
          updateChar(charId, { relationships: rels });
        }

        function removeRelationship(charId: string, idx: number) {
          var ch = characters.find(function f(c) { return c.id === charId; });
          if (!ch) return;
          updateChar(charId, { relationships: ch.relationships.filter(function f(_, i) { return i !== idx; }) });
        }

        return (
          <div style={{ maxWidth: 720, margin: "0 auto" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <span style={{ fontSize: 13, color: "var(--color-text-muted)" }}>{characters.length} character{characters.length !== 1 ? "s" : ""}</span>
              <button
                onClick={addCharacter}
                style={{
                  display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", border: "none", borderRadius: 6,
                  backgroundColor: "var(--color-accent)", color: "#fff", fontSize: 12, fontWeight: 500, fontFamily: "inherit", cursor: "pointer",
                }}
              >
                <Plus size={13} /> Add Character
              </button>
            </div>

            {characters.map(function renderChar(ch) {
              var isExpanded = expandedId === ch.id;
              return (
                <div key={ch.id} style={{ border: "1px solid var(--color-border)", borderRadius: 8, marginBottom: 8, overflow: "hidden" }}>
                  <button
                    onClick={function toggle() { setExpandedId(isExpanded ? null : ch.id); }}
                    style={{
                      display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "12px 16px",
                      border: "none", background: isExpanded ? "var(--color-surface)" : "transparent",
                      cursor: "pointer", fontFamily: "inherit", textAlign: "left", transition: "background 100ms",
                    }}
                  >
                    <ChevronRight size={14} style={{ transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 150ms ease", flexShrink: 0, color: "var(--color-text-muted)" }} />
                    <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: "var(--color-text)" }}>{ch.name}</span>
                    <span style={{ fontSize: 11, fontWeight: 500, color: ROLE_COLORS[ch.role], textTransform: "capitalize" }}>{ch.role}</span>
                    {ch._override && <span style={{ fontSize: 9, color: "var(--color-accent)", fontWeight: 600 }}>OVERRIDE</span>}
                  </button>

                  {isExpanded && (
                    <div style={{ padding: "0 16px 16px" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                        <div>
                          <label style={{ display: "block", fontSize: 11, fontWeight: 500, color: "var(--color-text-muted)", marginBottom: 4 }}>Name</label>
                          <input type="text" value={ch.name} onChange={function ch2(e) { updateChar(ch.id, { name: e.target.value }); }} style={inputStyle} />
                        </div>
                        <div>
                          <label style={{ display: "block", fontSize: 11, fontWeight: 500, color: "var(--color-text-muted)", marginBottom: 4 }}>Role</label>
                          <select value={ch.role} onChange={function ch2(e) { updateChar(ch.id, { role: e.target.value as CharacterNode["role"] }); }} style={inputStyle}>
                            {ROLES.map(function r(role) { return <option key={role} value={role}>{role}</option>; })}
                          </select>
                        </div>
                      </div>

                      <div style={{ marginBottom: 12 }}>
                        <label style={{ display: "block", fontSize: 11, fontWeight: 500, color: "var(--color-text-muted)", marginBottom: 4 }}>Description</label>
                        <textarea value={ch.description} onChange={function ch2(e) { updateChar(ch.id, { description: e.target.value }); }} style={{ ...inputStyle, minHeight: 60, resize: "vertical" as const }} />
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                        <div>
                          <label style={{ display: "block", fontSize: 11, fontWeight: 500, color: "var(--color-text-muted)", marginBottom: 4 }}>Arc</label>
                          <input type="text" value={ch.arc} onChange={function ch2(e) { updateChar(ch.id, { arc: e.target.value }); }} style={inputStyle} />
                        </div>
                        <div>
                          <label style={{ display: "block", fontSize: 11, fontWeight: 500, color: "var(--color-text-muted)", marginBottom: 4 }}>Current State</label>
                          <input type="text" value={ch.currentState} onChange={function ch2(e) { updateChar(ch.id, { currentState: e.target.value }); }} style={inputStyle} />
                        </div>
                      </div>

                      <div style={{ marginBottom: 12 }}>
                        <label style={{ display: "block", fontSize: 11, fontWeight: 500, color: "var(--color-text-muted)", marginBottom: 4 }}>Aliases</label>
                        <TagInput value={ch.aliases} onChange={function ch2(v) { updateChar(ch.id, { aliases: v }); }} placeholder="Add alias..." />
                      </div>

                      <div style={{ marginBottom: 12 }}>
                        <label style={{ display: "block", fontSize: 11, fontWeight: 500, color: "var(--color-text-muted)", marginBottom: 4 }}>Traits</label>
                        <TagInput value={ch.traits} onChange={function ch2(v) { updateChar(ch.id, { traits: v }); }} placeholder="Add trait..." />
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                        <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                          <input type="checkbox" checked={ch.alive} onChange={function ch2(e) { updateChar(ch.id, { alive: e.target.checked }); }} style={{ accentColor: "var(--color-accent)" }} />
                          <span style={{ fontSize: 12, color: "var(--color-text)" }}>Alive</span>
                        </label>
                      </div>

                      <div style={{ marginBottom: 12 }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                          <label style={{ fontSize: 11, fontWeight: 500, color: "var(--color-text-muted)" }}>Relationships</label>
                          <button onClick={function add() { addRelationship(ch.id); }} style={{ border: "none", background: "none", color: "var(--color-accent)", cursor: "pointer", fontSize: 11, fontFamily: "inherit", display: "flex", alignItems: "center", gap: 3 }}>
                            <Plus size={11} /> Add
                          </button>
                        </div>
                        {ch.relationships.map(function renderRel(rel, ri) {
                          return (
                            <div key={ri} style={{ display: "flex", gap: 6, marginBottom: 4, alignItems: "center" }}>
                              <input type="text" value={rel.target} onChange={function ch2(e) { updateRelationship(ch.id, ri, { target: e.target.value }); }} placeholder="Target" style={{ ...inputStyle, flex: 1 }} />
                              <input type="text" value={rel.type} onChange={function ch2(e) { updateRelationship(ch.id, ri, { type: e.target.value }); }} placeholder="Type" style={{ ...inputStyle, flex: 1 }} />
                              <button onClick={function rm() { removeRelationship(ch.id, ri); }} style={{ border: "none", background: "none", color: "#d9534f", cursor: "pointer", padding: 4 }}><Trash2 size={13} /></button>
                            </div>
                          );
                        })}
                      </div>

                      <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: 8, borderTop: "1px solid var(--color-border)" }}>
                        <button
                          onClick={function del() { deleteChar(ch.id); }}
                          style={{ display: "flex", alignItems: "center", gap: 4, border: "none", background: "none", color: "#d9534f", cursor: "pointer", fontSize: 12, fontFamily: "inherit" }}
                        >
                          <Trash2 size={13} /> Delete Character
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
