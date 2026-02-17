import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";

export async function GET(request: NextRequest) {
  const appSlug = process.env.GITHUB_APP_SLUG;
  if (!appSlug) {
    return NextResponse.json({ error: "GITHUB_APP_SLUG not configured" }, { status: 500 });
  }

  const state = randomBytes(32).toString("hex");

  const url = "https://github.com/apps/" + appSlug + "/installations/new?state=" + state;

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
