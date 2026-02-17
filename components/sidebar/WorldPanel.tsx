"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useAppStore } from "@/store";
import { getBookConfig } from "@/lib/bookConfig";
import type { PlaceNode, TimelineEvent, ObjectNode, WorldRule } from "@/types/scriva";

export default function WorldPanel() {
  var currentBook = useAppStore(function selectBook(s) { return s.editor.currentBook; });
  var keysStored = useAppStore(function selectKeys(s) { return s.preferences.keysStored; });

  var cfg = getBookConfig(currentBook);
  var owner = cfg?.owner;
  var repo = cfg?.repo;
  var branch = cfg?.branch || "main";

  var [places, setPlaces] = useState<PlaceNode[]>([]);
  var [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  var [objects, setObjects] = useState<ObjectNode[]>([]);
  var [rules, setRules] = useState<WorldRule[]>([]);
  var [loading, setLoading] = useState(false);

  useEffect(function load() {
    if (!keysStored || !owner || !repo) return;
    setLoading(true);
    Promise.all([
      window.fetch("/api/github/files?owner=" + owner + "&repo=" + repo + "&path=.scriva/world/places.json&branch=" + branch),
      window.fetch("/api/github/files?owner=" + owner + "&repo=" + repo + "&path=.scriva/world/timeline.json&branch=" + branch),
      window.fetch("/api/github/files?owner=" + owner + "&repo=" + repo + "&path=.scriva/world/objects.json&branch=" + branch),
      window.fetch("/api/github/files?owner=" + owner + "&repo=" + repo + "&path=.scriva/world/rules.json&branch=" + branch),
    ]).then(function handleAll(responses) {
      return Promise.all(responses.map(function toJson(r) { return r.ok ? r.json() : null; }));
    }).then(function handleData(results) {
      if (results[0]?.content) try { setPlaces(JSON.parse(results[0].content)); } catch {}
      if (results[1]?.content) try { setTimeline(JSON.parse(results[1].content)); } catch {}
      if (results[2]?.content) try { setObjects(JSON.parse(results[2].content)); } catch {}
      if (results[3]?.content) try { setRules(JSON.parse(results[3].content)); } catch {}
    }).catch(function handleErr() {})
    .finally(function done() { setLoading(false); });
  }, [keysStored, owner, repo, branch]);

  if (!owner || !repo) {
    return (
      <div style={{ color: "var(--color-text-muted)", fontSize: 12, textAlign: "center", padding: 24, fontFamily: "var(--font-inter), system-ui, sans-serif" }}>
        Open a book to view the world model
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
      <SubSection title="Places" count={places.length}>
        {places.length === 0 ? <EmptyState text="No places tracked yet" /> : places.map(function renderPlace(p) {
          return (
            <div key={p.id} style={{ padding: "6px 12px", borderBottom: "1px solid var(--color-border)" }}>
              <div style={{ fontWeight: 500, color: "var(--color-text)" }}>{p.name}</div>
              <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 2 }}>{p.description}</div>
            </div>
          );
        })}
      </SubSection>

      <SubSection title="Timeline" count={timeline.length}>
        {timeline.length === 0 ? <EmptyState text="No timeline events yet" /> : timeline.map(function renderEvent(e) {
          return (
            <div key={e.id} style={{ padding: "6px 12px", borderBottom: "1px solid var(--color-border)" }}>
              <div style={{ fontWeight: 500, color: "var(--color-text)" }}>{e.event}</div>
              <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 2 }}>Ch. {e.chapter} {e.storyTime ? "- " + e.storyTime : ""}</div>
            </div>
          );
        })}
      </SubSection>

      <SubSection title="Objects" count={objects.length}>
        {objects.length === 0 ? <EmptyState text="No significant objects yet" /> : objects.map(function renderObj(o) {
          return (
            <div key={o.id} style={{ padding: "6px 12px", borderBottom: "1px solid var(--color-border)" }}>
              <div style={{ fontWeight: 500, color: "var(--color-text)" }}>{o.name}</div>
              <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 2 }}>{o.significance}</div>
            </div>
          );
        })}
      </SubSection>

      <SubSection title="Rules" count={rules.length}>
        {rules.length === 0 ? <EmptyState text="No world rules yet" /> : rules.map(function renderRule(r) {
          return (
            <div key={r.id} style={{ padding: "6px 12px", borderBottom: "1px solid var(--color-border)" }}>
              <div style={{ fontWeight: 500, color: "var(--color-text)" }}>{r.rule}</div>
              <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 2 }}>{r.domain}</div>
            </div>
          );
        })}
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

function EmptyState(props: { text: string }) {
  return (
    <div style={{ color: "var(--color-text-muted)", fontSize: 11, textAlign: "center", padding: "12px 8px", lineHeight: 1.5 }}>
      {props.text}. Populated automatically as you write.
    </div>
  );
}
