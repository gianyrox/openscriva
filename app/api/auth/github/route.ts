import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";

export async function GET(request: NextRequest) {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: "GITHUB_CLIENT_ID not configured" }, { status: 500 });
  }

  const state = randomBytes(32).toString("hex");
  const redirectUri = new URL("/api/auth/github/callback", request.nextUrl.origin).toString();

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    state: state,
    scope: "repo user",
  });

  const url = "https://github.com/login/oauth/authorize?" + params.toString();

  const response = NextResponse.redirect(url);
  response.cookies.set("github-oauth-state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10,
  });

  return response;
}
