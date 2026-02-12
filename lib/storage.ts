import type { ChatMessage } from "@/types";

function isClient(): boolean {
  return typeof window !== "undefined";
}

export function getItem<T>(key: string, fallback: T): T {
  try {
    if (!isClient()) return fallback;
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function setItem(key: string, value: unknown): void {
  try {
    if (!isClient()) return;
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or unavailable */
  }
}

export function removeItem(key: string): void {
  try {
    if (!isClient()) return;
    localStorage.removeItem(key);
  } catch {
    /* storage unavailable */
  }
}

export function getChatHistory(repoKey: string): ChatMessage[] {
  return getItem<ChatMessage[]>(`scriva:chat:${repoKey}`, []);
}

export function setChatHistory(
  repoKey: string,
  messages: ChatMessage[],
): void {
  setItem(`scriva:chat:${repoKey}`, messages);
}

export function getLocalDraft(
  repoKey: string,
  chapterId: string,
): string | null {
  try {
    if (!isClient()) return null;
    return localStorage.getItem(`scriva:draft:${repoKey}:${chapterId}`);
  } catch {
    return null;
  }
}

export function setLocalDraft(
  repoKey: string,
  chapterId: string,
  content: string,
): void {
  try {
    if (!isClient()) return;
    localStorage.setItem(
      `scriva:draft:${repoKey}:${chapterId}`,
      content,
    );
  } catch {
    /* storage full or unavailable */
  }
}
