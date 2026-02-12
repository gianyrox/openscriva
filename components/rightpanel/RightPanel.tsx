"use client";

import { useState } from "react";
import { MessageSquare, StickyNote } from "lucide-react";
import ChatPanel from "./ChatPanel";
import NotesPanel from "./NotesPanel";

type RightTab = "chat" | "notes";

export default function RightPanel() {
  const [tab, setTab] = useState<RightTab>("chat");

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        fontFamily: "var(--font-inter), system-ui, sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          borderBottom: "1px solid var(--color-border)",
          flexShrink: 0,
        }}
      >
        {[
          { key: "chat" as const, label: "Chat", icon: MessageSquare },
          { key: "notes" as const, label: "Notes", icon: StickyNote },
        ].map(function renderTab(t) {
          var isActive = tab === t.key;
          var Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={function switchTab() {
                setTab(t.key);
              }}
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                padding: "8px 0",
                fontSize: 12,
                fontFamily: "inherit",
                fontWeight: isActive ? 600 : 400,
                border: "none",
                borderBottom: isActive ? "2px solid var(--color-accent)" : "2px solid transparent",
                backgroundColor: "transparent",
                color: isActive ? "var(--color-accent)" : "var(--color-text-muted)",
                cursor: "pointer",
                transition: "color 150ms, border-color 150ms",
              }}
            >
              <Icon size={14} />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "chat" && <ChatPanel />}
      {tab === "notes" && <NotesPanel />}
    </div>
  );
}
