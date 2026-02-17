import { NextResponse } from "next/server";
import { storeAnthropicKey } from "@/lib/keys";

export async function POST(request: Request) {
  try {
    const { anthropicKey } = await request.json();

    if (!anthropicKey) {
      return NextResponse.json(
        { error: "anthropicKey is required" },
        { status: 400 },
      );
    }

    const encrypted = await storeAnthropicKey(anthropicKey);

    const response = NextResponse.json({ ok: true });
    response.cookies.set("scriva-keys", encrypted, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });

    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
