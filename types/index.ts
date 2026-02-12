export interface Book {
  title: string;
  subtitle?: string;
  author: string;
  description?: string;
  coverImage?: string;
  bookDir: string;
  contextDir: string;
  imagesDir?: string;
  parts: Part[];
}

export interface Part {
  title: string;
  chapters: Chapter[];
}

export interface Chapter {
  id: string;
  file: string;
  label: string;
}

export interface OutlineNode {
  id: string;
  type: "book" | "part" | "chapter" | "section";
  title: string;
  synopsis?: string;
  status: "idea" | "draft" | "revision" | "final";
  children?: OutlineNode[];
  file?: string;
  wordCount?: number;
}

export interface BookConfig {
  repo: string;
  owner: string;
  branch: string;
  private?: boolean;
  book: Book;
}

export interface Preferences {
  keysStored: boolean;
  theme: "paper" | "study";
  defaultModel: "haiku" | "sonnet";
  autoSave: boolean;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  contexts?: ContextRef[];
}

export interface ContextRef {
  type:
    | "chapter"
    | "character"
    | "research"
    | "outline"
    | "voice"
    | "selection"
    | "book";
  key: string;
  label: string;
  tokenCount?: number;
  full?: boolean;
}

export interface DiffChange {
  type: "add" | "remove" | "equal";
  value: string;
}

export interface MarginNote {
  id: string;
  chapterId: string;
  from: number;
  to: number;
  content: string;
  author: string;
  timestamp: number;
}

export type SaveStatus = "idle" | "saving" | "saved" | "offline" | "error";

export interface EditorState {
  currentChapter?: string;
  currentBook?: string;
  saveStatus: SaveStatus;
  wordCount: number;
  isMarkdownView: boolean;
  isFocusMode: boolean;
}

export interface FileTreeNode {
  name: string;
  path: string;
  type: "file" | "dir";
  children?: FileTreeNode[];
}

export interface PanelState {
  leftOpen: boolean;
  rightOpen: boolean;
  leftTab: "book" | "explorer" | "outline" | "context" | "voice" | "find";
  rightTab: "chat";
}

export interface VoiceGuide {
  content: string;
  generatedFrom?: string[];
}
