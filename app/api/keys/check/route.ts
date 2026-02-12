import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { decrypt } from "@/lib/crypto";

export async function GET() {
  try {
    const store = cookies();
    const cookie = store.get("scriva-keys");

    if (!cookie) {
      return NextResponse.json({ hasKeys: false });
    }

    const parsed = JSON.parse(decrypt(cookie.value));
    const hasKeys = Boolean(parsed.anthropicKey && parsed.githubToken);

    return NextResponse.json({ hasKeys });
  } catch {
    return NextResponse.json({ hasKeys: false });
  }
}
