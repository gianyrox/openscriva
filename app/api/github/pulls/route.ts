import { NextRequest, NextResponse } from "next/server";
import { Octokit } from "@octokit/rest";
import { getGithubToken } from "@/lib/keys";

export async function GET(request: NextRequest) {
  try {
    const token = getGithubToken(request);

    if (!token) {
      return NextResponse.json(
        { error: "Missing GitHub token" },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);
    const owner = searchParams.get("owner");
    const repo = searchParams.get("repo");
    const state = (searchParams.get("state") ?? "open") as "open" | "closed" | "all";

    if (!owner || !repo) {
      return NextResponse.json(
        { error: "Missing required params: owner, repo" },
        { status: 400 },
      );
    }

    const octokit = new Octokit({ auth: token });
    const { data } = await octokit.pulls.list({
      owner,
      repo,
      state,
      per_page: 50,
      sort: "updated",
      direction: "desc",
    });

    return NextResponse.json({
      pulls: data.map(function mapPull(pr) {
        return {
          number: pr.number,
          title: pr.title,
          body: pr.body,
          state: pr.state,
          user: { login: pr.user?.login ?? "unknown" },
          head: { ref: pr.head.ref },
          base: { ref: pr.base.ref },
          created_at: pr.created_at,
          changed_files: (pr as Record<string, unknown>).changed_files ?? 0,
        };
      }),
    });
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
    const { owner, repo, title, body: prBody, head, base } = body;

    if (!owner || !repo || !title || !head || !base) {
      return NextResponse.json(
        { error: "Missing required fields: owner, repo, title, head, base" },
        { status: 400 },
      );
    }

    const octokit = new Octokit({ auth: token });
    const { data } = await octokit.pulls.create({
      owner,
      repo,
      title,
      body: prBody ?? "",
      head,
      base,
    });

    return NextResponse.json({
      number: data.number,
      html_url: data.html_url,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
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
    const { owner, repo, pull_number, action, message, body: commentBody } = body;

    if (!owner || !repo || !pull_number || !action) {
      return NextResponse.json(
        { error: "Missing required fields: owner, repo, pull_number, action" },
        { status: 400 },
      );
    }

    const octokit = new Octokit({ auth: token });

    if (action === "merge") {
      const { data } = await octokit.pulls.merge({
        owner,
        repo,
        pull_number,
        commit_message: message ?? undefined,
      });

      return NextResponse.json({
        merged: data.merged,
        message: data.message,
      });
    }

    if (action === "comment") {
      const { data } = await octokit.issues.createComment({
        owner,
        repo,
        issue_number: pull_number,
        body: commentBody ?? message ?? "",
      });

      return NextResponse.json({
        comment_id: data.id,
      });
    }

    if (action === "close") {
      const { data } = await octokit.pulls.update({
        owner,
        repo,
        pull_number,
        state: "closed",
      });

      return NextResponse.json({
        state: data.state,
      });
    }

    return NextResponse.json(
      { error: `Unknown action: ${action}` },
      { status: 400 },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
