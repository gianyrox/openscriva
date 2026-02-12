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

    const octokit = new Octokit({ auth: token });
    const { data } = await octokit.repos.listInvitationsForAuthenticatedUser({
      per_page: 50,
    });

    return NextResponse.json({
      invitations: data.map(function mapInvitation(inv) {
        return {
          id: inv.id,
          repo: {
            full_name: inv.repository.full_name,
            description: inv.repository.description,
          },
          inviter: {
            login: inv.inviter?.login ?? "unknown",
          },
          created_at: inv.created_at,
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
    const { invitation_id } = body;

    if (!invitation_id) {
      return NextResponse.json(
        { error: "Missing required field: invitation_id" },
        { status: 400 },
      );
    }

    const octokit = new Octokit({ auth: token });

    await octokit.repos.acceptInvitationForAuthenticatedUser({
      invitation_id,
    });

    return NextResponse.json({ accepted: true });
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
    const { invitation_id } = body;

    if (!invitation_id) {
      return NextResponse.json(
        { error: "Missing required field: invitation_id" },
        { status: 400 },
      );
    }

    const octokit = new Octokit({ auth: token });

    await octokit.repos.declineInvitationForAuthenticatedUser({
      invitation_id,
    });

    return NextResponse.json({ declined: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
