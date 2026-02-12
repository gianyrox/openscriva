import { NextRequest, NextResponse } from "next/server";
import { createOctokit } from "@/lib/github";
import { getGithubToken } from "@/lib/keys";

export async function GET(request: NextRequest) {
  try {
    const token = getGithubToken(request);
    const { searchParams } = new URL(request.url);
    const owner = searchParams.get("owner");
    const repo = searchParams.get("repo");
    const path = searchParams.get("path") ?? undefined;
    const branch = searchParams.get("branch") ?? undefined;
    const perPage = parseInt(searchParams.get("per_page") ?? "20", 10);

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

    const octokit = createOctokit(token);

    const { data } = await octokit.repos.listCommits({
      owner,
      repo,
      path,
      sha: branch,
      per_page: perPage,
    });

    return NextResponse.json({
      commits: data.map(function mapCommit(c) {
        return {
          sha: c.sha,
          message: c.commit.message,
          date: c.commit.committer?.date ?? c.commit.author?.date ?? null,
          author: c.commit.author?.name ?? c.author?.login ?? "Unknown",
        };
      }),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
