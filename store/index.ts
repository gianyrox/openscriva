import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  SaveStatus,
  Preferences,
  PanelState,
  EditorState,
  MergeConflict,
} from "@/types";

interface ReviewPR {
  number: number;
  title: string;
  body: string | null;
  state: string;
  user: { login: string };
  head: { ref: string };
  base: { ref: string };
  created_at: string;
  changed_files: number;
  merged?: boolean;
}

interface AppState {
  editor: EditorState;
  panels: PanelState;
  preferences: Preferences;
  mergeConflicts: MergeConflict[];
  reviewPR: ReviewPR | null;

  setChapter: (chapterId: string | undefined) => void;
  setBook: (bookId: string | undefined) => void;
  setDraftBranch: (branch: string | undefined) => void;
  setSaveStatus: (status: SaveStatus) => void;
  setWordCount: (count: number) => void;
  setMergeConflicts: (conflicts: MergeConflict[]) => void;
  setReviewPR: (pr: ReviewPR | null) => void;
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
          draftBranch: undefined,
          saveStatus: "idle",
          wordCount: 0,
          isMarkdownView: false,
          isFocusMode: false,
        },

        mergeConflicts: [],
        reviewPR: null,

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

        setDraftBranch: function setDraftBranch(branch) {
          set(function updateDraftBranch(state) {
            return {
              editor: { ...state.editor, draftBranch: branch },
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

        setMergeConflicts: function setMergeConflicts(conflicts) {
          set({ mergeConflicts: conflicts });
        },

        setReviewPR: function setReviewPR(pr) {
          set({ reviewPR: pr });
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
          editor: { currentBook: state.editor.currentBook, draftBranch: state.editor.draftBranch },
        };
      },
      merge: function mergeState(persisted: unknown, current: AppState): AppState {
        const p = persisted as Partial<AppState> | undefined;
        if (!p) return current;
        return {
          ...current,
          panels: { ...current.panels, ...(p.panels ?? {}) },
          preferences: { ...current.preferences, ...(p.preferences ?? {}) },
          editor: {
            ...current.editor,
            currentBook: p.editor?.currentBook ?? current.editor.currentBook,
            draftBranch: p.editor?.draftBranch ?? current.editor.draftBranch,
          },
        };
      },
    },
  ),
);
