import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { decrypt } from "./crypto";

function getKeys(): { anthropicKey: string; githubToken: string } | null {
  try {
    const store = cookies();
    const cookie = store.get("scriva-keys");
    if (!cookie) return null;
    return JSON.parse(decrypt(cookie.value));
  } catch {
    return null;
  }
}

export function getAnthropicKey(request: NextRequest): string | null {
  const keys = getKeys();
  if (keys?.anthropicKey) return keys.anthropicKey;
  return request.headers.get("x-anthropic-key");
}

export function getGithubToken(request: NextRequest): string | null {
  const keys = getKeys();
  if (keys?.githubToken) return keys.githubToken;
  return request.headers.get("x-github-token");
}
