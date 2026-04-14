import { NextRequest, NextResponse } from "next/server";
import { Octokit } from "@octokit/rest";
import { getGithubToken } from "@/lib/keys";

export async function GET(request: NextRequest) {
  try {
    const token = await getGithubToken(request);
    const { searchParams } = new URL(request.url);
    const owner = searchParams.get("owner");
    const repo = searchParams.get("repo");
    const base = searchParams.get("base");
    const head = searchParams.get("head");

    if (!token) {
      return NextResponse.json(
        { error: "Missing GitHub token" },
        { status: 401 },
      );
    }

    if (!owner || !repo || !base || !head) {
      return NextResponse.json(
        { error: "Missing required params: owner, repo, base, head" },
        { status: 400 },
      );
    }

    const octokit = new Octokit({ auth: token });

    const { data } = await octokit.repos.compareCommits({
      owner,
      repo,
      base,
      head,
    });

    return NextResponse.json({
      ahead_by: data.ahead_by,
      behind_by: data.behind_by,
      status: data.status,
      total_commits: data.total_commits,
      files: (data.files ?? []).map(function mapFile(f) {
        return {
          filename: f.filename,
          status: f.status,
          additions: f.additions,
          deletions: f.deletions,
          changes: f.changes,
          patch: f.patch ?? null,
        };
      }),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
