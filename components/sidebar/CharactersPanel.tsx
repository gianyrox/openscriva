"use client";

import { useState, useEffect, useCallback } from "react";
import { Users, Loader2, ChevronRight, Shield, AlertTriangle } from "lucide-react";
import { useAppStore } from "@/store";
import { getBookConfig, isFeatureEnabled } from "@/lib/bookConfig";
import type { CharacterNode } from "@/types/scriva";

var ROLE_COLORS: Record<string, string> = {
  protagonist: "#6ab04c",
  antagonist: "#d9534f",
  supporting: "#5b9bd5",
  minor: "var(--color-text-muted)",
  mentioned: "var(--color-text-muted)",
};

export default function CharactersPanel() {
  var currentBook = useAppStore(function selectBook(s) { return s.editor.currentBook; });
  var keysStored = useAppStore(function selectKeys(s) { return s.preferences.keysStored; });

  var cfg = getBookConfig(currentBook);
  var owner = cfg?.owner;
  var repo = cfg?.repo;
  var branch = cfg?.branch || "main";

  var [characters, setCharacters] = useState<CharacterNode[]>([]);
  var [loading, setLoading] = useState(false);
  var [expanded, setExpanded] = useState<string | null>(null);

  var fetchCharacters = useCallback(function fetch() {
    if (!keysStored || !owner || !repo) return;
    setLoading(true);

    window.fetch("/api/github/files?owner=" + owner + "&repo=" + repo + "&path=.scriva/characters.json&branch=" + branch)
      .then(function handleRes(res) {
        if (!res.ok) return null;
        return res.json();
      })
      .then(function handleData(data) {
        if (data && data.content) {
          try { setCharacters(JSON.parse(data.content)); } catch { setCharacters([]); }
        }
      })
      .catch(function handleErr() { setCharacters([]); })
      .finally(function done() { setLoading(false); });
  }, [keysStored, owner, repo, branch]);

  useEffect(function load() { fetchCharacters(); }, [fetchCharacters]);

  if (!owner || !repo) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 12, color: "var(--color-text-muted)", padding: 24, textAlign: "center", fontFamily: "var(--font-inter), system-ui, sans-serif", fontSize: 13 }}>
        <Users size={32} strokeWidth={1} style={{ opacity: 0.5 }} />
        <span>Open a book to view characters</span>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", fontFamily: "var(--font-inter), system-ui, sans-serif", fontSize: 12 }}>
      <div style={{ maxHeight: 400, overflowY: "auto", padding: "4px 0" }}>
        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 24, color: "var(--color-text-muted)" }}>
            <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : characters.length === 0 ? (
          <div style={{ color: "var(--color-text-muted)", fontSize: 12, textAlign: "center", padding: 24, lineHeight: 1.5 }}>
            No characters detected yet. Characters are automatically tracked as you write.
          </div>
        ) : (
          characters.map(function renderChar(c) {
            var isExpanded = expanded === c.id;
            return (
              <div key={c.id}>
                <div
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", cursor: "pointer", transition: "background 100ms" }}
                  onClick={function toggle() { setExpanded(isExpanded ? null : c.id); }}
                  onMouseEnter={function enter(e) { e.currentTarget.style.backgroundColor = "var(--color-surface-hover)"; }}
                  onMouseLeave={function leave(e) { e.currentTarget.style.backgroundColor = "transparent"; }}
                >
                  <ChevronRight size={12} style={{ transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 150ms", flexShrink: 0, color: "var(--color-text-muted)" }} />
                  <span style={{ flex: 1, color: "var(--color-text)", fontWeight: 500 }}>{c.name}</span>
                  <span style={{ fontSize: 10, color: ROLE_COLORS[c.role] || "var(--color-text-muted)", fontWeight: 500 }}>{c.role}</span>
                  {c._override && <span title="Author override"><Shield size={10} style={{ color: "var(--color-accent)", flexShrink: 0 }} /></span>}
                </div>
                {isExpanded && (
                  <div style={{ padding: "4px 12px 8px 30px", fontSize: 11, color: "var(--color-text-muted)", lineHeight: 1.5 }}>
                    {c.description && <div style={{ marginBottom: 4 }}>{c.description}</div>}
                    {c.currentState && <div style={{ marginBottom: 4 }}><strong>State:</strong> {c.currentState}</div>}
                    {c.traits.length > 0 && <div style={{ marginBottom: 4 }}><strong>Traits:</strong> {c.traits.join(", ")}</div>}
                    {c.relationships.length > 0 && (
                      <div>
                        <strong>Relationships:</strong>
                        {c.relationships.map(function renderRel(r, i) {
                          return <div key={i} style={{ paddingLeft: 8 }}>- {r.target}: {r.type}</div>;
                        })}
                      </div>
                    )}
                    <div style={{ marginTop: 4, fontSize: 10 }}>Appears in {c.appearances.length} chapter(s)</div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
