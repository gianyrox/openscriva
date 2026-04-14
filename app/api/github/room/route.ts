import { NextRequest, NextResponse } from "next/server";
import { Octokit } from "@octokit/rest";
import { getGithubToken } from "@/lib/keys";
import {
  findUserRoom,
  forkUserRoom,
  ensureRoomManifest,
  readRoomManifest,
  sleep,
  UPSTREAM_OWNER,
  UPSTREAM_REPO,
} from "@/lib/room";

export async function GET(request: NextRequest) {
  try {
    const token = await getGithubToken(request);
    if (!token) {
      return NextResponse.json({ error: "Missing GitHub token" }, { status: 401 });
    }

    const octokit = new Octokit({ auth: token });
    const { data: user } = await octokit.users.getAuthenticated();

    const room = await findUserRoom(octokit, user.login);
    if (!room) {
      return NextResponse.json({ error: "no room" }, { status: 404 });
    }

    const manifest = await readRoomManifest(token, room);
    return NextResponse.json({
      owner: room.owner,
      repo: room.repo,
      default_branch: room.default_branch,
      projects: manifest ? manifest.projects : [],
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = await getGithubToken(request);
    if (!token) {
      return NextResponse.json({ error: "Missing GitHub token" }, { status: 401 });
    }

    const octokit = new Octokit({ auth: token });
    const { data: user } = await octokit.users.getAuthenticated();

    var room = await findUserRoom(octokit, user.login);
    var created = false;

    if (!room) {
      const forked = await forkUserRoom(octokit, user.login);
      if (!forked) {
        return NextResponse.json(
          { error: "Could not create a writing room fork (all candidate names taken)" },
          { status: 409 },
        );
      }
      room = forked;
      created = true;

      // Forks may need a moment to propagate before we can patch them.
      await sleep(2000);

      try {
        await octokit.repos.update({
          owner: room.owner,
          repo: room.repo,
          private: true,
        });
      } catch (patchErr: unknown) {
        console.warn(
          "[room POST] failed to patch fork private:",
          patchErr instanceof Error ? patchErr.message : patchErr,
        );
      }

      // Best-effort: star the upstream repo on behalf of the user.
      try {
        await octokit.activity.starRepoForAuthenticatedUser({
          owner: UPSTREAM_OWNER,
          repo: UPSTREAM_REPO,
        });
      } catch {}
    }

    // Ensure room.json exists. If we just forked we give propagation a beat.
    if (created) {
      await sleep(1000);
    }

    var manifest;
    try {
      manifest = await ensureRoomManifest(token, room);
    } catch (ensureErr: unknown) {
      // If the fork is still propagating, wait and retry once.
      await sleep(2000);
      try {
        manifest = await ensureRoomManifest(token, room);
      } catch (retryErr: unknown) {
        console.warn(
          "[room POST] ensureRoomManifest failed:",
          retryErr instanceof Error ? retryErr.message : retryErr,
        );
        manifest = { version: 1 as const, createdAt: new Date().toISOString(), upstream: UPSTREAM_OWNER + "/" + UPSTREAM_REPO, projects: [] };
      }
    }

    return NextResponse.json({
      owner: room.owner,
      repo: room.repo,
      default_branch: room.default_branch,
      projects: manifest.projects,
    });
  } catch (err: unknown) {
    var status = 500;
    if (err && typeof err === "object" && "status" in err) {
      const s = (err as { status: number }).status;
      if (typeof s === "number") status = s;
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("POST /api/github/room error:", status, message);
    return NextResponse.json({ error: message }, { status });
  }
}
