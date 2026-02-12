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

    if (!owner || !repo) {
      return NextResponse.json(
        { error: "Missing required params: owner, repo" },
        { status: 400 },
      );
    }

    const octokit = new Octokit({ auth: token });
    const { data } = await octokit.repos.listCollaborators({
      owner,
      repo,
      per_page: 100,
    });

    return NextResponse.json({
      collaborators: data.map(function mapCollaborator(c) {
        return {
          login: c.login,
          avatar_url: c.avatar_url,
          role_name: c.role_name,
          permissions: c.permissions,
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
    const { owner, repo, username } = body;

    if (!owner || !repo || !username) {
      return NextResponse.json(
        { error: "Missing required fields: owner, repo, username" },
        { status: 400 },
      );
    }

    const octokit = new Octokit({ auth: token });

    try {
      const { data, status } = await octokit.repos.addCollaborator({
        owner,
        repo,
        username,
        permission: "push",
      });

      if ((status as number) === 204) {
        return NextResponse.json({ already_collaborator: true });
      }

      return NextResponse.json({ invitation_id: data.id });
    } catch (innerErr: unknown) {
      if (
        innerErr instanceof Error &&
        "status" in innerErr &&
        (innerErr as { status: number }).status === 404
      ) {
        return NextResponse.json(
          { error: `User "${username}" not found` },
          { status: 404 },
        );
      }
      throw innerErr;
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
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
    const { owner, repo, username } = body;

    if (!owner || !repo || !username) {
      return NextResponse.json(
        { error: "Missing required fields: owner, repo, username" },
        { status: 400 },
      );
    }

    const octokit = new Octokit({ auth: token });

    await octokit.repos.removeCollaborator({
      owner,
      repo,
      username,
    });

    return NextResponse.json({ removed: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
