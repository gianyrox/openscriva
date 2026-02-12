import { NextResponse } from "next/server";
import { encrypt } from "@/lib/crypto";

export async function POST(request: Request) {
  try {
    const { anthropicKey, githubToken } = await request.json();

    if (!anthropicKey || !githubToken) {
      return NextResponse.json(
        { error: "Both anthropicKey and githubToken are required" },
        { status: 400 },
      );
    }

    const payload = JSON.stringify({ anthropicKey, githubToken });
    const encrypted = encrypt(payload);

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
