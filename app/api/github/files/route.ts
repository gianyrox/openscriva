import { NextRequest, NextResponse } from "next/server";
import { getFileContent, createOrUpdateFile, deleteFile } from "@/lib/github";
import { getGithubToken } from "@/lib/keys";

export async function GET(request: NextRequest) {
  try {
    const token = getGithubToken(request);
    const { searchParams } = new URL(request.url);
    const owner = searchParams.get("owner");
    const repo = searchParams.get("repo");
    const path = searchParams.get("path");
    const branch = searchParams.get("branch") ?? undefined;

    if (!token) {
      return NextResponse.json(
        { error: "Missing GitHub token" },
        { status: 401 },
      );
    }

    if (!owner || !repo || !path) {
      return NextResponse.json(
        { error: "Missing owner, repo, or path parameter" },
        { status: 400 },
      );
    }

    const { content, sha } = await getFileContent(token, owner, repo, path, branch);

    return NextResponse.json({ content, sha, path });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const status = message.includes("not found") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const token = getGithubToken(request);

    if (!token) {
      return NextResponse.json(
        { error: "Missing GitHub token" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { owner, repo, path, content, sha, branch } = body;

    if (!owner || !repo || !path || content === undefined) {
      return NextResponse.json(
        { error: "Missing required fields: owner, repo, path, content" },
        { status: 400 },
      );
    }

    const filename = path.split("/").pop() ?? path;
    const message = body.message ?? `Update ${filename}`;

    const result = await createOrUpdateFile(
      token,
      owner,
      repo,
      path,
      content,
      message,
      sha,
      branch,
    );

    return NextResponse.json({ sha: result.sha });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    let status = 500;
    if (message.includes("Conflict")) status = 409;
    if (err instanceof Error && "status" in err) {
      const errStatus = (err as { status: number }).status;
      if (errStatus === 403 || errStatus === 409 || errStatus === 422) {
        status = errStatus;
      }
    }
    return NextResponse.json({ error: message, status }, { status });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const token = getGithubToken(request);

    if (!token) {
      return NextResponse.json(
        { error: "Missing GitHub token" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { owner, repo, path, sha, branch } = body;

    if (!owner || !repo || !path || !sha) {
      return NextResponse.json(
        { error: "Missing required fields: owner, repo, path, sha" },
        { status: 400 },
      );
    }

    const filename = path.split("/").pop() ?? path;
    await deleteFile(token, owner, repo, path, sha, `Delete ${filename}`, branch);

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const status = message.includes("not found") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
