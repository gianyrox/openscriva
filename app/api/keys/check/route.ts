import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { decrypt } from "@/lib/crypto";

export async function GET() {
  try {
    const store = await cookies();
    const cookie = store.get("scriva-keys");

    if (!cookie) {
      return NextResponse.json({ hasKeys: false, hasAnthropicKey: false, hasGithubToken: false });
    }

    const parsed = JSON.parse(decrypt(cookie.value));
    const hasAnthropicKey = Boolean(parsed.anthropicKey);
    const hasGithubToken = Boolean(parsed.githubToken);
    const hasKeys = hasAnthropicKey && hasGithubToken;

    return NextResponse.json({ hasKeys, hasAnthropicKey, hasGithubToken });
  } catch {
    return NextResponse.json({ hasKeys: false, hasAnthropicKey: false, hasGithubToken: false });
  }
}
