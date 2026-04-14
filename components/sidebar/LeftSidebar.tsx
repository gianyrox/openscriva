"use client";

import { useState, useEffect, useCallback } from "react";
import { BookOpen, FolderOpen, ListTree, FileText, Mic, Search, ArrowLeft, Users, Globe, GitBranch, Settings, Plus, Layout, Wrench, BookMarked, Quote } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store";
import type { OutlineNode } from "@/types";
import type { ScrivaConfig, FeatureKey } from "@/types/scriva";
import { defaultScrivaConfig } from "@/types/scriva";
import { getScrivaConfig, saveScrivaConfig, getBookConfig } from "@/lib/bookConfig";
import { getItem, setItem } from "@/lib/storage";
import SidebarSection from "@/components/sidebar/SidebarSection";
import SidebarConfig from "@/components/sidebar/SidebarConfig";
import ManuscriptPanel from "@/components/sidebar/ManuscriptPanel";
import FileExplorer from "@/components/sidebar/FileExplorer";
import OutlinePanel from "@/components/sidebar/OutlinePanel";
import ContextPanel from "@/components/sidebar/ContextPanel";
import VoicePanel from "@/components/sidebar/VoicePanel";
import FindPanel from "@/components/sidebar/FindPanel";
import CharactersPanel from "@/components/sidebar/CharactersPanel";
import WorldPanel from "@/components/sidebar/WorldPanel";
import NarrativePanel from "@/components/sidebar/NarrativePanel";
import RulesPanel from "@/components/sidebar/RulesPanel";
import CitationsPanel from "@/components/sidebar/CitationsPanel";

type LeftTab = "main" | "files" | "tools";

var TAB_ITEMS: { id: LeftTab; label: string; Icon: typeof Layout }[] = [
  { id: "main", label: "Main", Icon: Layout },
  { id: "files", label: "Files", Icon: FolderOpen },
  { id: "tools", label: "Tools", Icon: Wrench },
];

var FEATURE_SECTIONS: { key: FeatureKey; label: string; sectionId: string }[] = [
  { key: "characters", label: "Characters", sectionId: "characters" },
  { key: "worldBuilding", label: "World Building", sectionId: "world" },
  { key: "plotThreads", label: "Plot Threads", sectionId: "narrative" },
  { key: "narrativeState", label: "Narrative State", sectionId: "narrative" },
  { key: "citations", label: "Citations", sectionId: "citations" },
  { key: "voiceProfile", label: "Voice Profile", sectionId: "voice" },
  { key: "tensionTracking", label: "Tension Tracking", sectionId: "narrative" },
];

function GroupHeader(props: { label: string }) {
  return (
    <div
      style={{
        padding: "10px 12px 4px",
        fontFamily: "var(--font-inter), system-ui, sans-serif",
        fontSize: 9,
        fontWeight: 700,
        color: "var(--color-text-muted)",
        textTransform: "uppercase",
        letterSpacing: "1px",
        opacity: 0.7,
      }}
    >
      {props.label}
    </div>
  );
}

function tabStorageKey(bookKey: string): string {
  return "scriva-left-tab:" + bookKey;
}

function loadTab(bookKey: string): LeftTab {
  try {
    var raw = localStorage.getItem(tabStorageKey(bookKey));
    if (raw === "main" || raw === "files" || raw === "tools") return raw;
  } catch {}
  return "main";
}

function saveTab(bookKey: string, tab: LeftTab) {
  try {
    localStorage.setItem(tabStorageKey(bookKey), tab);
  } catch {}
}

export default function LeftSidebar() {
  var router = useRouter();
  var currentBook = useAppStore(function selectBook(s) { return s.editor.currentBook; });

  var bookKey = currentBook || "local";

  var storageKeyOutline = currentBook ? "scriva-outline-" + currentBook : "scriva-outline-local";
  var [outline, setOutline] = useState<OutlineNode | null>(null);
  var [backHovered, setBackHovered] = useState(false);
  var [config, setConfig] = useState<ScrivaConfig | null>(null);
  var [addSectionOpen, setAddSectionOpen] = useState(false);
  var [activeTab, setActiveTab] = useState<LeftTab>(function initTab() { return loadTab(bookKey); });

  useEffect(function loadOutline() {
    var saved = getItem<OutlineNode | null>(storageKeyOutline, null);
    setOutline(saved);
  }, [storageKeyOutline]);

  useEffect(function loadConfig() {
    var cfg = getScrivaConfig(currentBook);
    setConfig(cfg);
  }, [currentBook]);

  useEffect(function syncTab() {
    setActiveTab(loadTab(bookKey));
  }, [bookKey]);

  var handleOutlineChange = useCallback(function handleChange(node: OutlineNode) {
    setOutline(node);
    setItem(storageKeyOutline, node);
  }, [storageKeyOutline]);

  var handleChapterSelect = useCallback(function handleSelect(chapterId: string) {
    router.push("/book/" + chapterId);
  }, [router]);

  function handleConfigUpdate(next: ScrivaConfig) {
    setConfig(next);
    if (currentBook) {
      saveScrivaConfig(currentBook, next);
      var bookCfg = getBookConfig(currentBook);
      if (bookCfg) {
        window.fetch("/api/github/files", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            owner: bookCfg.owner,
            repo: bookCfg.repo,
            path: ".scriva/config.json",
            content: JSON.stringify(next, null, 2),
            message: "Update scriva config",
          }),
        }).catch(function ignore() {});
      }
    }
  }

  function isEnabled(feature: FeatureKey): boolean {
    if (!config) return false;
    return config.features[feature] === true;
  }

  function showNarrative(): boolean {
    return isEnabled("plotThreads") || isEnabled("narrativeState") || isEnabled("tensionTracking");
  }

  function disabledSections(): { key: FeatureKey; label: string }[] {
    if (!config) return [];
    var seen = new Set<string>();
    var result: { key: FeatureKey; label: string }[] = [];
    FEATURE_SECTIONS.forEach(function check(s) {
      if (!config!.features[s.key] && !seen.has(s.sectionId)) {
        seen.add(s.sectionId);
        result.push({ key: s.key, label: s.label });
      }
    });
    return result;
  }

  function handleEnableFeature(key: FeatureKey) {
    if (!config) return;
    var next = { ...config, features: { ...config.features, [key]: true } };
    handleConfigUpdate(next);
    setAddSectionOpen(false);
  }

  function handleTabChange(tab: LeftTab) {
    setActiveTab(tab);
    saveTab(bookKey, tab);
  }

  function nav(path: string) {
    router.push("/book/" + path);
  }

  var displayConfig = config || defaultScrivaConfig("fiction");

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        fontFamily: "var(--font-inter), system-ui, sans-serif",
        fontSize: 13,
      }}
    >
      <div
        style={{
          padding: "12px 16px 8px",
          display: "flex",
          alignItems: "center",
          gap: 6,
          flexShrink: 0,
        }}
      >
        <button
          onClick={function onBackClick() { router.push("/shelf"); }}
          onMouseEnter={function onEnter() { setBackHovered(true); }}
          onMouseLeave={function onLeave() { setBackHovered(false); }}
          title="Back to Shelf"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "none",
            background: "transparent",
            color: backHovered ? "var(--color-accent)" : "var(--color-text-muted)",
            cursor: "pointer",
            padding: 2,
            borderRadius: 4,
            transition: "color 150ms ease",
          }}
        >
          <ArrowLeft size={16} strokeWidth={1.5} />
        </button>
        <span
          style={{
            fontFamily: "var(--font-literata), Georgia, serif",
            fontStyle: "italic",
            fontSize: 14,
            color: "var(--color-accent)",
          }}
        >
          scriva
        </span>
      </div>

      <div
        style={{
          display: "flex",
          gap: 0,
          borderBottom: "1px solid var(--color-border)",
          flexShrink: 0,
          padding: "0 8px",
        }}
      >
        {TAB_ITEMS.map(function renderTab(t) {
          var active = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={function selectTab() { handleTabChange(t.id); }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                padding: "6px 10px",
                border: "none",
                borderBottom: active ? "2px solid var(--color-accent)" : "2px solid transparent",
                background: "transparent",
                cursor: "pointer",
                fontFamily: "var(--font-inter), system-ui, sans-serif",
                fontSize: 11,
                fontWeight: active ? 600 : 500,
                color: active ? "var(--color-accent)" : "var(--color-text-muted)",
                transition: "color 150ms, border-color 150ms",
                flex: 1,
                justifyContent: "center",
              }}
              onMouseEnter={function enter(e) { if (!active) e.currentTarget.style.color = "var(--color-text)"; }}
              onMouseLeave={function leave(e) { if (!active) e.currentTarget.style.color = "var(--color-text-muted)"; }}
            >
              <t.Icon size={13} strokeWidth={1.5} />
              {t.label}
            </button>
          );
        })}
      </div>

      <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>
        {activeTab === "main" && (
          <>
            <GroupHeader label="Config" />

            {config && (
              <SidebarConfig config={displayConfig} onUpdate={handleConfigUpdate} onOpen={function openConfig() { nav(".scriva/config.json"); }} />
            )}

            <SidebarSection id="rules" label="Rules" icon={Settings} bookKey={bookKey} onOpen={function openRules() { nav(".scriva/rules.json"); }}>
              <RulesPanel />
            </SidebarSection>

            <SidebarSection id="outline" label="Outline" icon={ListTree} bookKey={bookKey} defaultOpen={true}>
              <OutlinePanel
                outline={outline}
                onOutlineChange={handleOutlineChange}
                onChapterSelect={handleChapterSelect}
              />
            </SidebarSection>

            {isEnabled("voiceProfile") && (
              <SidebarSection id="voice" label="Voice" icon={Mic} bookKey={bookKey} onOpen={function openVoice() { nav(".scriva/voice/profile.json"); }}>
                <VoicePanel />
              </SidebarSection>
            )}

            <GroupHeader label="Manuscript" />

            <SidebarSection id="manuscript" label="Manuscript" icon={BookOpen} bookKey={bookKey} defaultOpen={true} onOpen={function openBook() { nav("book.json"); }}>
              <ManuscriptPanel />
            </SidebarSection>

            <GroupHeader label="Context" />

            {isEnabled("characters") && (
              <SidebarSection id="characters" label="Characters" icon={Users} bookKey={bookKey} onOpen={function openChars() { nav(".scriva/characters.json"); }}>
                <CharactersPanel />
              </SidebarSection>
            )}

            {isEnabled("citations") && (
              <SidebarSection id="citations" label="Citations" icon={Quote} bookKey={bookKey} onOpen={function openCites() { nav(".scriva/citations.json"); }}>
                <CitationsPanel />
              </SidebarSection>
            )}

            {isEnabled("worldBuilding") && (
              <SidebarSection id="world" label="World" icon={Globe} bookKey={bookKey} onOpen={function openWorld() { nav(".scriva/world/places.json"); }}>
                <WorldPanel />
              </SidebarSection>
            )}

            <SidebarSection id="context" label="Research" icon={FileText} bookKey={bookKey}>
              <ContextPanel />
            </SidebarSection>

            {showNarrative() && (
              <>
                <GroupHeader label="Intelligence" />

                <SidebarSection id="narrative" label="Narrative" icon={GitBranch} bookKey={bookKey} onOpen={function openNarr() { nav(".scriva/narrative/state.json"); }}>
                  <NarrativePanel />
                </SidebarSection>
              </>
            )}

            {config && disabledSections().length > 0 && (
              <div style={{ padding: "8px 12px", position: "relative" }}>
                <button
                  onClick={function toggle() { setAddSectionOpen(!addSectionOpen); }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 4,
                    width: "100%",
                    padding: "6px 0",
                    border: "1px dashed var(--color-border)",
                    borderRadius: 6,
                    background: "none",
                    color: "var(--color-text-muted)",
                    fontSize: 11,
                    fontFamily: "inherit",
                    cursor: "pointer",
                    transition: "color 150ms, border-color 150ms",
                  }}
                  onMouseEnter={function enter(e) { e.currentTarget.style.color = "var(--color-accent)"; e.currentTarget.style.borderColor = "var(--color-accent)"; }}
                  onMouseLeave={function leave(e) { e.currentTarget.style.color = "var(--color-text-muted)"; e.currentTarget.style.borderColor = "var(--color-border)"; }}
                >
                  <Plus size={12} />
                  Add Section
                </button>

                {addSectionOpen && (
                  <div style={{
                    marginTop: 4,
                    border: "1px solid var(--color-border)",
                    borderRadius: 6,
                    backgroundColor: "var(--color-surface)",
                    overflow: "hidden",
                  }}>
                    {disabledSections().map(function renderDisabled(s) {
                      return (
                        <button
                          key={s.key}
                          onClick={function enable() { handleEnableFeature(s.key); }}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            width: "100%",
                            padding: "7px 12px",
                            border: "none",
                            background: "transparent",
                            color: "var(--color-text)",
                            fontSize: 11,
                            fontFamily: "inherit",
                            cursor: "pointer",
                            textAlign: "left",
                            transition: "background 100ms",
                          }}
                          onMouseEnter={function enter(e) { e.currentTarget.style.backgroundColor = "var(--color-surface-hover)"; }}
                          onMouseLeave={function leave(e) { e.currentTarget.style.backgroundColor = "transparent"; }}
                        >
                          <Plus size={12} style={{ color: "var(--color-accent)" }} />
                          {s.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {activeTab === "files" && (
          <div style={{ padding: "4px 0" }}>
            <FileExplorer />
          </div>
        )}

        {activeTab === "tools" && (
          <div style={{ padding: "4px 0" }}>
            <FindPanel />
          </div>
        )}
      </div>
    </div>
  );
}
