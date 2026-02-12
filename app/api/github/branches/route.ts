import { NextRequest, NextResponse } from "next/server";
import { listBranches, createBranch } from "@/lib/github";
import { getGithubToken } from "@/lib/keys";

export async function GET(request: NextRequest) {
  try {
    const token = getGithubToken(request);
    const { searchParams } = new URL(request.url);
    const owner = searchParams.get("owner");
    const repo = searchParams.get("repo");

    if (!token) {
      return NextResponse.json(
        { error: "Missing GitHub token" },
        { status: 401 },
      );
    }

    if (!owner || !repo) {
      return NextResponse.json(
        { error: "Missing owner or repo parameter" },
        { status: 400 },
      );
    }

    const branches = await listBranches(token, owner, repo);

    return NextResponse.json({ branches });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = getGithubToken(request);

    if (!token) {
      return NextResponse.json(
        { error: "Missing GitHub token" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { owner, repo, name, from } = body;

    if (!owner || !repo || !name || !from) {
      return NextResponse.json(
        { error: "Missing required fields: owner, repo, name, from" },
        { status: 400 },
      );
    }

    await createBranch(token, owner, repo, name, from);

    return NextResponse.json({ name });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const status = message.includes("already exists") ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
