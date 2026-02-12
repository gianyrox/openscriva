import type { SaveStatus } from "@/types";
import { createOrUpdateFile } from "@/lib/github";

interface AutoSaveConfig {
  token: string;
  owner: string;
  repo: string;
  branch: string;
  onStatusChange: (status: SaveStatus) => void;
}

interface PendingSave {
  path: string;
  content: string;
  sha?: string;
}

interface AutoSaver {
  save: (path: string, content: string, sha?: string) => void;
  destroy: () => void;
}

export function createAutoSaver(config: AutoSaveConfig): AutoSaver {
  const pending: Map<string, PendingSave> = new Map();
  const offlineQueue: Map<string, PendingSave> = new Map();
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;
  let destroyed = false;

  function handleOnline() {
    isOnline = true;
    if (offlineQueue.size > 0) {
      offlineQueue.forEach(function requeueOffline(entry, key) {
        pending.set(key, entry);
      });
      offlineQueue.clear();
      scheduleFlush();
    }
  }

  function handleOffline() {
    isOnline = false;
    config.onStatusChange("offline");
  }

  if (typeof window !== "undefined") {
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
  }

  function generateCommitMessage(path: string): string {
    const filename = path.split("/").pop() ?? path;
    return `Update ${filename}`;
  }

  function scheduleFlush() {
    if (debounceTimer !== null) {
      clearTimeout(debounceTimer);
    }
    debounceTimer = setTimeout(function onDebounce() {
      flush();
    }, 5000);
  }

  async function flush() {
    if (destroyed || pending.size === 0) return;

    const entries = Array.from(pending.entries());
    pending.clear();

    config.onStatusChange("saving");

    for (const [, entry] of entries) {
      try {
        if (!isOnline) {
          offlineQueue.set(entry.path, entry);
          config.onStatusChange("offline");
          continue;
        }

        await createOrUpdateFile(
          config.token,
          config.owner,
          config.repo,
          entry.path,
          entry.content,
          generateCommitMessage(entry.path),
          entry.sha,
          config.branch,
        );
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "";

        if (message.includes("Failed to fetch") || message.includes("NetworkError") || message.includes("network")) {
          offlineQueue.set(entry.path, entry);
          config.onStatusChange("offline");
          continue;
        }

        if (message.includes("Conflict")) {
          config.onStatusChange("error");
          return;
        }

        config.onStatusChange("error");
        return;
      }
    }

    if (offlineQueue.size === 0 && !destroyed) {
      config.onStatusChange("saved");
    }
  }

  function save(path: string, content: string, sha?: string) {
    if (destroyed) return;

    pending.set(path, { path, content, sha });

    if (!isOnline) {
      offlineQueue.set(path, { path, content, sha });
      config.onStatusChange("offline");
      return;
    }

    scheduleFlush();
  }

  function destroy() {
    destroyed = true;

    if (debounceTimer !== null) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }

    if (pending.size > 0) {
      flush();
    }

    if (typeof window !== "undefined") {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    }
  }

  return { save, destroy };
}
