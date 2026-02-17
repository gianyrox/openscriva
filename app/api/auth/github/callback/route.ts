import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { encrypt, decrypt } from "@/lib/crypto";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");

  if (!code || !state) {
    return NextResponse.redirect(new URL("/setup?github=error&reason=missing_params", request.nextUrl.origin));
  }

  const store = await cookies();
  const savedState = store.get("github-oauth-state")?.value;

  if (!savedState || savedState !== state) {
    return NextResponse.redirect(new URL("/setup?github=error&reason=invalid_state", request.nextUrl.origin));
  }

  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL("/setup?github=error&reason=server_config", request.nextUrl.origin));
  }

  try {
    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
      }),
    });

    const tokenData = await tokenRes.json();

    if (tokenData.error || !tokenData.access_token) {
      return NextResponse.redirect(
        new URL("/setup?github=error&reason=" + encodeURIComponent(tokenData.error || "token_exchange_failed"), request.nextUrl.origin),
      );
    }

    const accessToken = tokenData.access_token as string;

    const userRes = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: "Bearer " + accessToken,
        Accept: "application/vnd.github.v3+json",
      },
    });

    if (!userRes.ok) {
      return NextResponse.redirect(new URL("/setup?github=error&reason=user_fetch_failed", request.nextUrl.origin));
    }

    const userData = await userRes.json();
    const username = userData.login as string;

    var existing: Record<string, string> = {};
    const existingCookie = store.get("scriva-keys");
    if (existingCookie) {
      try {
        existing = JSON.parse(decrypt(existingCookie.value));
      } catch {}
    }

    existing.githubToken = accessToken;
    const encrypted = encrypt(JSON.stringify(existing));

    const redirectUrl = new URL(
      "/setup?github=connected&username=" + encodeURIComponent(username),
      request.nextUrl.origin,
    );

    const response = NextResponse.redirect(redirectUrl);

    response.cookies.set("scriva-keys", encrypted, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });

    response.cookies.set("github-oauth-state", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });

    return response;
  } catch {
    return NextResponse.redirect(new URL("/setup?github=error&reason=unknown", request.nextUrl.origin));
  }
}
