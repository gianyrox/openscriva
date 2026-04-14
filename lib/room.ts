import { Octokit } from "@octokit/rest";
import { createOrUpdateFile, getFileContent } from "@/lib/github";
import type { RoomManifest, RoomProject } from "@/types";

export const UPSTREAM_OWNER = "gianyrox";
export const UPSTREAM_REPO = "openscriva";

export interface RoomRef {
  owner: string;
  repo: string;
  default_branch: string;
}

/**
 * Try to find an existing fork of gianyrox/openscriva on the authenticated user's
 * account by probing candidate repo names.
 */
export async function findUserRoom(
  octokit: Octokit,
  username: string,
): Promise<RoomRef | null> {
  var candidates: string[] = ["openscriva"];
  for (var i = 2; i <= 9; i++) {
    candidates.push("openscriva-" + i);
  }

  for (var j = 0; j < candidates.length; j++) {
    var name = candidates[j];
    try {
      var res = await octokit.repos.get({ owner: username, repo: name });
      var parent = (res.data as { parent?: { full_name?: string } }).parent;
      if (parent && parent.full_name === UPSTREAM_OWNER + "/" + UPSTREAM_REPO) {
        return {
          owner: username,
          repo: res.data.name,
          default_branch: res.data.default_branch,
        };
      }
    } catch (err: unknown) {
      var status = err && typeof err === "object" && "status" in err ? (err as { status: number }).status : 0;
      if (status === 404) continue;
      // ignore other errors and continue probing
    }
  }

  return null;
}

/**
 * Fork gianyrox/openscriva onto the authenticated user's account. Handles
 * name collisions by retrying with openscriva-2, -3, ..., -9.
 */
export async function forkUserRoom(
  octokit: Octokit,
  username: string,
): Promise<RoomRef | null> {
  var names: string[] = ["openscriva"];
  for (var i = 2; i <= 9; i++) {
    names.push("openscriva-" + i);
  }

  for (var j = 0; j < names.length; j++) {
    var name = names[j];
    try {
      var res = await octokit.repos.createFork({
        owner: UPSTREAM_OWNER,
        repo: UPSTREAM_REPO,
        name: name,
        default_branch_only: true,
      });
      return {
        owner: username,
        repo: res.data.name,
        default_branch: res.data.default_branch ?? "main",
      };
    } catch (err: unknown) {
      var status = err && typeof err === "object" && "status" in err ? (err as { status: number }).status : 0;
      if (status === 422) {
        // name taken — try next
        continue;
      }
      throw err;
    }
  }

  return null;
}

export async function readRoomManifest(
  token: string,
  room: RoomRef,
): Promise<RoomManifest | null> {
  try {
    var file = await getFileContent(token, room.owner, room.repo, "room.json", room.default_branch);
    return JSON.parse(file.content) as RoomManifest;
  } catch {
    return null;
  }
}

export async function writeRoomManifest(
  token: string,
  room: RoomRef,
  manifest: RoomManifest,
  message: string,
): Promise<void> {
  await createOrUpdateFile(
    token,
    room.owner,
    room.repo,
    "room.json",
    JSON.stringify(manifest, null, 2),
    message,
    undefined,
    room.default_branch,
  );
}

export async function ensureRoomManifest(
  token: string,
  room: RoomRef,
): Promise<RoomManifest> {
  var existing = await readRoomManifest(token, room);
  if (existing) return existing;

  var manifest: RoomManifest = {
    version: 1,
    createdAt: new Date().toISOString(),
    upstream: UPSTREAM_OWNER + "/" + UPSTREAM_REPO,
    projects: [],
  };

  await writeRoomManifest(token, room, manifest, "Initialize room.json");
  return manifest;
}

export async function appendRoomProject(
  token: string,
  room: RoomRef,
  project: RoomProject,
): Promise<RoomManifest> {
  var manifest = await readRoomManifest(token, room);
  if (!manifest) {
    manifest = {
      version: 1,
      createdAt: new Date().toISOString(),
      upstream: UPSTREAM_OWNER + "/" + UPSTREAM_REPO,
      projects: [],
    };
  }
  manifest.projects.push(project);
  await writeRoomManifest(token, room, manifest, "Add project: " + project.title);
  return manifest;
}

export function slugify(input: string, maxLen: number = 60): string {
  var s = (input || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  if (!s) s = "untitled";
  if (s.length > maxLen) s = s.slice(0, maxLen).replace(/-+$/g, "");
  return s;
}

export function sleep(ms: number): Promise<void> {
  return new Promise(function resolver(resolve) {
    setTimeout(resolve, ms);
  });
}
