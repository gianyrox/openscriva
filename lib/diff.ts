import { diffWords } from "diff";
import type { DiffChange } from "@/types";

export function computeDiff(oldText: string, newText: string): DiffChange[] {
  const result = diffWords(oldText, newText);
  return result.map(function mapChange(change) {
    if (change.added) {
      return { type: "add", value: change.value };
    }
    if (change.removed) {
      return { type: "remove", value: change.value };
    }
    return { type: "equal", value: change.value };
  });
}

export function applyChanges(
  original: string,
  changes: DiffChange[],
  accepted: boolean[],
): string {
  let result = "";
  for (let i = 0; i < changes.length; i++) {
    const change = changes[i];
    if (change.type === "equal") {
      result += change.value;
    } else if (change.type === "add") {
      if (accepted[i]) {
        result += change.value;
      }
    } else if (change.type === "remove") {
      if (!accepted[i]) {
        result += change.value;
      }
    }
  }
  return result;
}
