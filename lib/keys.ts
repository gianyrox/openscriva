import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { decrypt, encrypt } from "./crypto";

async function getKeys(): Promise<Record<string, string> | null> {
  try {
    const store = await cookies();
    const cookie = store.get("scriva-keys");
    if (!cookie) return null;
    return JSON.parse(decrypt(cookie.value));
  } catch {
    return null;
  }
}

export async function getAnthropicKey(request: NextRequest): Promise<string | null> {
  const keys = await getKeys();
  if (keys?.anthropicKey) return keys.anthropicKey;
  return request.headers.get("x-anthropic-key");
}

export async function getGithubToken(request: NextRequest): Promise<string | null> {
  const keys = await getKeys();
  if (keys?.githubToken) return keys.githubToken;
  return null;
}

export async function hasGithubToken(): Promise<boolean> {
  const keys = await getKeys();
  return Boolean(keys?.githubToken);
}

export async function storeAnthropicKey(key: string): Promise<string> {
  const store = await cookies();
  var existing: Record<string, string> = {};
  const cookie = store.get("scriva-keys");
  if (cookie) {
    try {
      existing = JSON.parse(decrypt(cookie.value));
    } catch {}
  }
  existing.anthropicKey = key;
  return encrypt(JSON.stringify(existing));
}
