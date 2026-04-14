import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { decrypt, encrypt } from "@/lib/crypto";

export async function GET() {
  try {
    const store = await cookies();
    const cookie = store.get("scriva-keys");

    if (!cookie) {
      return NextResponse.json({ hasKeys: false, hasAnthropicKey: false, hasGithubToken: false });
    }

    const decrypted = decrypt(cookie.value);
    const parsed = JSON.parse(decrypted);
    const hasAnthropicKey = Boolean(parsed.anthropicKey);
    const hasGithubToken = Boolean(parsed.githubToken);
    const hasKeys = hasAnthropicKey && hasGithubToken;

    const response = NextResponse.json({ hasKeys, hasAnthropicKey, hasGithubToken });

    // Sliding refresh: re-issue the cookie with a fresh 365-day expiry.
    const reEncrypted = encrypt(JSON.stringify(parsed));
    response.cookies.set("scriva-keys", reEncrypted, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });

    return response;
  } catch {
    return NextResponse.json({ hasKeys: false, hasAnthropicKey: false, hasGithubToken: false });
  }
}
