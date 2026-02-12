import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  SaveStatus,
  Preferences,
  PanelState,
  EditorState,
} from "@/types";

interface AppState {
  editor: EditorState;
  panels: PanelState;
  preferences: Preferences;

  setChapter: (chapterId: string | undefined) => void;
  setBook: (bookId: string | undefined) => void;
  setSaveStatus: (status: SaveStatus) => void;
  setWordCount: (count: number) => void;
  toggleMarkdownView: () => void;
  toggleFocusMode: () => void;
  toggleLeftPanel: () => void;
  toggleRightPanel: () => void;
  setLeftTab: (tab: PanelState["leftTab"]) => void;
  setRightTab: (tab: PanelState["rightTab"]) => void;
  updatePreferences: (prefs: Partial<Preferences>) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    function storeInitializer(set) {
      return {
        editor: {
          currentChapter: undefined,
          currentBook: undefined,
          saveStatus: "idle",
          wordCount: 0,
          isMarkdownView: false,
          isFocusMode: false,
        },

        panels: {
          leftOpen: true,
          rightOpen: true,
          leftTab: "book",
          rightTab: "chat",
        },

        preferences: {
          keysStored: false,
          theme: "paper",
          defaultModel: "sonnet",
          autoSave: true,
        },

        setChapter: function setChapter(chapterId) {
          set(function updateChapter(state) {
            return {
              editor: { ...state.editor, currentChapter: chapterId },
            };
          });
        },

        setBook: function setBook(bookId) {
          set(function updateBook(state) {
            return {
              editor: { ...state.editor, currentBook: bookId },
            };
          });
        },

        setSaveStatus: function setSaveStatus(status) {
          set(function updateSaveStatus(state) {
            return {
              editor: { ...state.editor, saveStatus: status },
            };
          });
        },

        setWordCount: function setWordCount(count) {
          set(function updateWordCount(state) {
            return {
              editor: { ...state.editor, wordCount: count },
            };
          });
        },

        toggleMarkdownView: function toggleMarkdownView() {
          set(function updateMarkdownView(state) {
            return {
              editor: {
                ...state.editor,
                isMarkdownView: !state.editor.isMarkdownView,
              },
            };
          });
        },

        toggleFocusMode: function toggleFocusMode() {
          set(function updateFocusMode(state) {
            return {
              editor: {
                ...state.editor,
                isFocusMode: !state.editor.isFocusMode,
              },
            };
          });
        },

        toggleLeftPanel: function toggleLeftPanel() {
          set(function updateLeftPanel(state) {
            return {
              panels: {
                ...state.panels,
                leftOpen: !state.panels.leftOpen,
              },
            };
          });
        },

        toggleRightPanel: function toggleRightPanel() {
          set(function updateRightPanel(state) {
            return {
              panels: {
                ...state.panels,
                rightOpen: !state.panels.rightOpen,
              },
            };
          });
        },

        setLeftTab: function setLeftTab(tab) {
          set(function updateLeftTab(state) {
            return {
              panels: { ...state.panels, leftTab: tab },
            };
          });
        },

        setRightTab: function setRightTab(tab) {
          set(function updateRightTab(state) {
            return {
              panels: { ...state.panels, rightTab: tab },
            };
          });
        },

        updatePreferences: function updatePreferences(prefs) {
          set(function applyPreferences(state) {
            return {
              preferences: { ...state.preferences, ...prefs },
            };
          });
        },
      };
    },
    {
      name: "scriva-store",
      partialize: function partialize(state) {
        return {
          panels: state.panels,
          preferences: state.preferences,
          editor: { currentBook: state.editor.currentBook },
        };
      },
      merge: function mergeState(persisted: unknown, current: AppState): AppState {
        const p = persisted as Partial<AppState> | undefined;
        if (!p) return current;
        return {
          ...current,
          panels: { ...current.panels, ...(p.panels ?? {}) },
          preferences: { ...current.preferences, ...(p.preferences ?? {}) },
          editor: { ...current.editor, currentBook: p.editor?.currentBook ?? current.editor.currentBook },
        };
      },
    },
  ),
);
