import { NextRequest, NextResponse } from "next/server";
import { Octokit } from "@octokit/rest";
import { createOrUpdateFile } from "@/lib/github";
import { createDefaultBook } from "@/lib/book";
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

    const octokit = new Octokit({ auth: token });
    const { data: user } = await octokit.users.getAuthenticated();
    const { data: repos } = await octokit.repos.listForAuthenticatedUser({
      sort: "updated",
      per_page: 30,
      affiliation: "owner,collaborator,organization_member",
    });

    return NextResponse.json({
      username: user.login,
      repos: repos.map(function mapRepo(r) {
        return {
          name: r.name,
          full_name: r.full_name,
          description: r.description,
          private: r.private,
          default_branch: r.default_branch,
          updated_at: r.updated_at,
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
    const octokit = new Octokit({ auth: token });
    const { data: user } = await octokit.users.getAuthenticated();

    const { data: repo } = await octokit.repos.createForAuthenticatedUser({
      name: body.name,
      description: body.description ?? "",
      private: body.private ?? true,
      auto_init: true,
    });

    const owner = user.login;
    const repoName = repo.name;
    const branch = repo.default_branch;
    const title = body.title ?? body.name;

    const book = createDefaultBook(title, user.login);
    const bookJson = JSON.stringify(book, null, 2);

    await createOrUpdateFile(
      token,
      owner,
      repoName,
      "book.json",
      bookJson,
      "Add book configuration",
      undefined,
      branch,
    );

    await createOrUpdateFile(
      token,
      owner,
      repoName,
      "book/prologue.md",
      "# Prologue\n\nBegin writing...\n",
      "Add prologue",
      undefined,
      branch,
    );

    await createOrUpdateFile(
      token,
      owner,
      repoName,
      "context/.gitkeep",
      "",
      "Add context directory",
      undefined,
      branch,
    );

    await createOrUpdateFile(
      token,
      owner,
      repoName,
      "README.md",
      `# ${title}\n\nWritten with [Scriva](https://openscriva.com)\n`,
      "Update README",
      undefined,
      branch,
    );

    return NextResponse.json({
      name: repo.name,
      full_name: repo.full_name,
      description: repo.description,
      private: repo.private,
      default_branch: repo.default_branch,
      updated_at: repo.updated_at,
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
    const { owner, repo } = body;

    if (!owner || !repo) {
      return NextResponse.json(
        { error: "Missing required fields: owner, repo" },
        { status: 400 },
      );
    }

    const octokit = new Octokit({ auth: token });

    const updatePayload: Record<string, unknown> = { owner, repo };
    if (body.private !== undefined) updatePayload.private = body.private;
    if (body.description !== undefined) updatePayload.description = body.description;

    const { data } = await octokit.repos.update(
      updatePayload as Parameters<typeof octokit.repos.update>[0],
    );

    return NextResponse.json({
      name: data.name,
      full_name: data.full_name,
      description: data.description,
      private: data.private,
      default_branch: data.default_branch,
      updated_at: data.updated_at,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
