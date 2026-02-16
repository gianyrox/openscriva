import { NextRequest, NextResponse } from "next/server";
import { Octokit } from "@octokit/rest";
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

export async function PATCH(request: NextRequest) {
  try {
    const token = getGithubToken(request);

    if (!token) {
      return NextResponse.json(
        { error: "Missing GitHub token" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { owner, repo, base, head } = body;

    if (!owner || !repo || !base || !head) {
      return NextResponse.json(
        { error: "Missing required fields: owner, repo, base, head" },
        { status: 400 },
      );
    }

    const octokit = new Octokit({ auth: token });

    try {
      const { data } = await octokit.repos.merge({
        owner,
        repo,
        base,
        head,
      });

      return NextResponse.json({
        merged: true,
        sha: data.sha,
        message: data.commit?.message ?? "Merged",
      });
    } catch (mergeErr: unknown) {
      if (
        mergeErr instanceof Error &&
        "status" in mergeErr &&
        (mergeErr as { status: number }).status === 409
      ) {
        let conflictFiles: string[] = [];
        try {
          const comparison = await octokit.repos.compareCommits({
            owner,
            repo,
            base,
            head,
          });
          conflictFiles = (comparison.data.files ?? []).map(function getFilename(f) {
            return f.filename;
          });
        } catch {}

        return NextResponse.json(
          {
            merged: false,
            conflicts: true,
            conflictFiles: conflictFiles,
            error: "Merge conflict",
          },
          { status: 409 },
        );
      }

      if (
        mergeErr instanceof Error &&
        "status" in mergeErr &&
        (mergeErr as { status: number }).status === 204
      ) {
        return NextResponse.json({
          merged: true,
          message: "already up to date",
        });
      }

      throw mergeErr;
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
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
    const { owner, repo, draftBranch, baseBranch } = body;

    if (!owner || !repo || !draftBranch || !baseBranch) {
      return NextResponse.json(
        { error: "Missing required fields: owner, repo, draftBranch, baseBranch" },
        { status: 400 },
      );
    }

    const octokit = new Octokit({ auth: token });

    const { data: baseRef } = await octokit.git.getRef({
      owner,
      repo,
      ref: "heads/" + baseBranch,
    });
    const baseSha = baseRef.object.sha;

    await octokit.git.updateRef({
      owner,
      repo,
      ref: "heads/" + draftBranch,
      sha: baseSha,
      force: true,
    });

    return NextResponse.json({
      reset: true,
      sha: baseSha,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
