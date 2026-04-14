import { NextRequest, NextResponse } from "next/server";
import { Octokit } from "@octokit/rest";
import { getGithubToken } from "@/lib/keys";
import { createOrUpdateFile } from "@/lib/github";
import { createDefaultBook } from "@/lib/book";
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
        : "Untitled Book";
    const description: string =
      typeof body?.description === "string" ? body.description.trim() : "";

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
    const slug = slugify(title);
    const projectPath = "books/" + slug;

    const book = createDefaultBook(title, user.login);
    book.bookDir = projectPath + "/book";
    book.contextDir = projectPath + "/context";
    if (description) {
      book.description = description;
    }
    const bookJson = JSON.stringify(book, null, 2);

    await createOrUpdateFile(
      token,
      room.owner,
      room.repo,
      projectPath + "/book.json",
      bookJson,
      "Add book configuration: " + title,
      undefined,
      room.default_branch,
    );

    await createOrUpdateFile(
      token,
      room.owner,
      room.repo,
      projectPath + "/book/ch-01.md",
      "# Chapter 1\n\nBegin writing...\n",
      "Add chapter 1 for " + title,
      undefined,
      room.default_branch,
    );

    await createOrUpdateFile(
      token,
      room.owner,
      room.repo,
      projectPath + "/context/.gitkeep",
      "",
      "Add context directory for " + title,
      undefined,
      room.default_branch,
    );

    await appendRoomProject(token, room, {
      id: slug,
      container: "books",
      path: projectPath,
      form: "book",
      title: title,
      createdAt: createdAt,
    });

    return NextResponse.json({
      name: room.repo,
      full_name: room.owner + "/" + room.repo,
      description: description || null,
      private: true,
      default_branch: room.default_branch,
      updated_at: createdAt,
      projectPath: projectPath,
      slug: slug,
      title: title,
    });
  } catch (err: unknown) {
    var status = 500;
    if (err && typeof err === "object" && "status" in err) {
      const s = (err as { status: number }).status;
      if (typeof s === "number") status = s;
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("POST /api/github/room/books error:", status, message);
    return NextResponse.json({ error: message }, { status });
  }
}
