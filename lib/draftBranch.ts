var DRAFT_BRANCH_PREFIX = "scriva/draft";

export function getDraftBranchName(customName?: string): string {
  if (customName) {
    return DRAFT_BRANCH_PREFIX + "-" + customName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }
  var now = new Date();
  var y = now.getFullYear();
  var mo = String(now.getMonth() + 1).padStart(2, "0");
  var d = String(now.getDate()).padStart(2, "0");
  var h = String(now.getHours()).padStart(2, "0");
  var mi = String(now.getMinutes()).padStart(2, "0");
  return DRAFT_BRANCH_PREFIX + "-" + y + mo + d + "-" + h + mi;
}

export function isScrivaDraftBranch(name: string): boolean {
  return name.startsWith(DRAFT_BRANCH_PREFIX);
}

export async function ensureDraftBranch(
  owner: string,
  repo: string,
  baseBranch: string,
  customName?: string,
): Promise<string> {
  var listRes = await fetch(
    "/api/github/branches?owner=" + encodeURIComponent(owner) + "&repo=" + encodeURIComponent(repo),
  );
  var listData = await listRes.json();

  if (listData.branches) {
    var existing = listData.branches.find(function findDraft(b: { name: string }) {
      return isScrivaDraftBranch(b.name);
    });
    if (existing) return existing.name;

    var legacy = listData.branches.find(function findLegacy(b: { name: string }) {
      return b.name === "scriva/drafts";
    });
    if (legacy) return legacy.name;
  }

  var branchName = getDraftBranchName(customName);

  var createRes = await fetch("/api/github/branches", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      owner: owner,
      repo: repo,
      name: branchName,
      from: baseBranch,
    }),
  });

  var createData = await createRes.json();

  if (createData.error && !createData.error.includes("already exists")) {
    throw new Error(createData.error);
  }

  return branchName;
}

export async function syncDraftFromMain(
  owner: string,
  repo: string,
  baseBranch: string,
  draftBranch: string,
): Promise<{ merged: boolean; conflicts: boolean; conflictFiles?: string[] }> {
  const res = await fetch("/api/github/branches", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      owner: owner,
      repo: repo,
      base: draftBranch,
      head: baseBranch,
    }),
  });

  const data = await res.json();

  if (res.ok && data.merged) {
    return { merged: true, conflicts: false };
  }

  if (res.status === 409 || data.conflicts) {
    return {
      merged: false,
      conflicts: true,
      conflictFiles: data.conflictFiles ?? [],
    };
  }

  if (data.message === "already up to date") {
    return { merged: true, conflicts: false };
  }

  throw new Error(data.error ?? "Failed to sync from main");
}

export async function compareBranches(
  owner: string,
  repo: string,
  baseBranch: string,
  draftBranch: string,
): Promise<{
  ahead_by: number;
  behind_by: number;
  status: string;
  files: { filename: string; status: string; patch?: string }[];
}> {
  const res = await fetch(
    "/api/github/compare?owner=" + encodeURIComponent(owner) +
    "&repo=" + encodeURIComponent(repo) +
    "&base=" + encodeURIComponent(baseBranch) +
    "&head=" + encodeURIComponent(draftBranch),
  );

  if (!res.ok) {
    throw new Error("Failed to compare branches");
  }

  return res.json();
}

export async function resetDraftBranch(
  owner: string,
  repo: string,
  baseBranch: string,
  draftBranch: string,
): Promise<string> {
  const res = await fetch("/api/github/branches", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      owner: owner,
      repo: repo,
      draftBranch: draftBranch,
      baseBranch: baseBranch,
    }),
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error ?? "Failed to reset draft branch");
  }

  return draftBranch;
}

export async function findOpenDraftPR(
  owner: string,
  repo: string,
  draftBranch: string,
): Promise<{
  number: number;
  title: string;
  body: string | null;
  state: string;
  user: { login: string };
  head: { ref: string };
  base: { ref: string };
  created_at: string;
  changed_files: number;
  html_url?: string;
} | null> {
  const res = await fetch(
    "/api/github/pulls?owner=" + encodeURIComponent(owner) +
    "&repo=" + encodeURIComponent(repo) +
    "&state=open",
  );

  if (!res.ok) return null;

  const data = await res.json();

  if (!data.pulls) return null;

  const match = data.pulls.find(function findDraftPR(pr: { head: { ref: string } }) {
    return pr.head.ref === draftBranch;
  });

  return match ?? null;
}

export async function createDraftPR(
  owner: string,
  repo: string,
  draftBranch: string,
  baseBranch: string,
  title: string,
): Promise<{ number: number; html_url: string }> {
  const res = await fetch("/api/github/pulls", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      owner: owner,
      repo: repo,
      title: title,
      body: "Auto-created by Scriva. Merges draft changes into " + baseBranch + ".",
      head: draftBranch,
      base: baseBranch,
    }),
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error ?? "Failed to create pull request");
  }

  return res.json();
}
