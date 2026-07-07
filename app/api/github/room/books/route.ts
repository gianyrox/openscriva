import { NextRequest, NextResponse } from "next/server";
import { Octokit } from "@octokit/rest";
import { getGithubToken } from "@/lib/keys";
import { createOrUpdateFile } from "@/lib/github";
import { createDefaultBook } from "@/lib/book";
import { scaffoldFromTemplate } from "@/lib/scaffold";
import { getTemplate } from "@/lib/templates";
import type { Book } from "@/types";
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

    // Optional template. When present, the book skeleton, chapters, and the
    // `.scriva/` mind are all seeded from templates/<id>/template.json instead
    // of the single blank ch-01.md. An unknown id is a hard error so a typo
    // doesn't silently fall back to a blank room.
    const templateId: string | null =
      typeof body?.templateId === "string" && body.templateId.trim().length > 0
        ? body.templateId.trim()
        : null;
    const template = templateId ? getTemplate(templateId) : null;
    if (templateId && !template) {
      return NextResponse.json({ error: "Unknown template: " + templateId }, { status: 400 });
    }

    const title: string =
      typeof body?.title === "string" && body.title.trim().length > 0
        ? body.title.trim()
        : template
          ? template.book.title
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

    // Build book.json — from the template when one was chosen, else the blank
    // single-chapter default. Either way bookDir/contextDir are pinned to this
    // project's folder before write.
    var book: Book;
    if (template) {
      book = {
        title,
        author: user.login,
        genre: template.book.genre,
        logline: template.book.logline,
        themes: template.book.themes,
        targetWordCount: template.book.targetWordCount,
        language: template.book.language,
        bookDir: projectPath + "/book",
        contextDir: projectPath + "/context",
        parts: template.book.parts,
      };
    } else {
      book = createDefaultBook(title, user.login);
      book.bookDir = projectPath + "/book";
      book.contextDir = projectPath + "/context";
    }
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

    // Chapter files: every template chapter (with its seed body) when templated,
    // otherwise the one blank ch-01.md.
    if (template) {
      for (const chapter of template.chapters) {
        await createOrUpdateFile(
          token,
          room.owner,
          room.repo,
          projectPath + "/book/" + chapter.file,
          chapter.content,
          "Add " + chapter.label + " for " + title,
          undefined,
          room.default_branch,
        );
      }
    } else {
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
    }

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

    // Seed the `.scriva/` mind from the template. Blank rooms scaffold their
    // mind lazily elsewhere, so this only runs for the templated path.
    if (template) {
      try {
        await scaffoldFromTemplate(template, {
          token,
          owner: room.owner,
          repo: room.repo,
          branch: room.default_branch,
        });
      } catch (scaffoldErr) {
        // A mind that fails to seed shouldn't sink the whole book create — the
        // book and chapters are already on disk and usable.
        console.error("scaffoldFromTemplate failed for", templateId, scaffoldErr);
      }
    }

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
      templateId: template ? template.id : null,
      // Full book skeleton so the client can build a BookConfig with the real
      // parts/chapters (a template has many; a blank book has one).
      book: book,
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
