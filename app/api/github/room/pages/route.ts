import { NextRequest, NextResponse } from "next/server";
import { Octokit } from "@octokit/rest";
import { getGithubToken } from "@/lib/keys";
import { createOrUpdateFile } from "@/lib/github";
import {
  findUserRoom,
  forkUserRoom,
  ensureRoomManifest,
  appendRoomProject,
  slugify,
  sleep,
  UPSTREAM_OWNER,
  UPSTREAM_REPO,
} from "@/lib/room";

export async function POST(request: NextRequest) {
  try {
    const token = await getGithubToken(request);
    if (!token) {
      return NextResponse.json({ error: "Missing GitHub token" }, { status: 401 });
    }

    const body = await request.json().catch(function fallback() { return {}; });
    const title: string =
      typeof body?.title === "string" && body.title.trim().length > 0
        ? body.title.trim()
        : "Untitled " + new Date().toISOString().slice(0, 16).replace("T", " ");

    const octokit = new Octokit({ auth: token });
    const { data: user } = await octokit.users.getAuthenticated();

    var room = await findUserRoom(octokit, user.login);
    if (!room) {
      const forked = await forkUserRoom(octokit, user.login);
      if (!forked) {
        return NextResponse.json(
          { error: "Could not create a writing room fork (all candidate names taken)" },
          { status: 409 },
        );
      }
      room = forked;
      await sleep(2000);
      try {
        await octokit.repos.update({ owner: room.owner, repo: room.repo, private: true });
      } catch {}
      try {
        await octokit.activity.starRepoForAuthenticatedUser({ owner: UPSTREAM_OWNER, repo: UPSTREAM_REPO });
      } catch {}
      await sleep(1000);
    }

    await ensureRoomManifest(token, room);

    const createdAt = new Date().toISOString();
    const datePrefix = createdAt.slice(0, 10);
    const slug = datePrefix + "-" + slugify(title);
    const projectPath = "pages/" + slug + ".md";

    const content =
      "---\n" +
      "form: page\n" +
      "title: " + title + "\n" +
      "createdAt: " + createdAt + "\n" +
      "---\n\n" +
      "# " + title + "\n\n";

    await createOrUpdateFile(
      token,
      room.owner,
      room.repo,
      projectPath,
      content,
      "Create page: " + title,
      undefined,
      room.default_branch,
    );

    await appendRoomProject(token, room, {
      id: slug,
      container: "pages",
      path: projectPath,
      form: "page",
      title: title,
      createdAt: createdAt,
    });

    return NextResponse.json({
      owner: room.owner,
      repo: room.repo,
      branch: room.default_branch,
      projectPath: projectPath,
      title: title,
      slug: slug,
    });
  } catch (err: unknown) {
    var status = 500;
    if (err && typeof err === "object" && "status" in err) {
      const s = (err as { status: number }).status;
      if (typeof s === "number") status = s;
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("POST /api/github/room/pages error:", status, message);
    return NextResponse.json({ error: message }, { status });
  }
}
