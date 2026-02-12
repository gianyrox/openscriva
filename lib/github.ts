import { Octokit } from "@octokit/rest";

export function createOctokit(token: string): Octokit {
  return new Octokit({ auth: token });
}

export async function getRepoContents(
  token: string,
  owner: string,
  repo: string,
  path: string,
  branch?: string,
): Promise<unknown> {
  const octokit = createOctokit(token);

  try {
    const { data } = await octokit.repos.getContent({
      owner,
      repo,
      path,
      ref: branch,
    });

    if (Array.isArray(data)) {
      return data.map(function mapEntry(entry) {
        return {
          name: entry.name,
          path: entry.path,
          type: entry.type,
          size: entry.size,
          sha: entry.sha,
        };
      });
    }

    if (data.type === "file" && "content" in data) {
      return {
        name: data.name,
        path: data.path,
        type: data.type,
        size: data.size,
        sha: data.sha,
        content: Buffer.from(data.content, "base64").toString("utf-8"),
        encoding: data.encoding,
      };
    }

    return data;
  } catch (err: unknown) {
    if (err instanceof Error && "status" in err && (err as { status: number }).status === 404) {
      throw new Error(`Path not found: ${path}`);
    }
    throw new Error(
      `Failed to get contents of ${path}: ${err instanceof Error ? err.message : "Unknown error"}`,
    );
  }
}

export async function getFileContent(
  token: string,
  owner: string,
  repo: string,
  path: string,
  branch?: string,
): Promise<{ content: string; sha: string }> {
  const octokit = createOctokit(token);

  try {
    const { data } = await octokit.repos.getContent({
      owner,
      repo,
      path,
      ref: branch,
    });

    if (Array.isArray(data) || data.type !== "file" || !("content" in data)) {
      throw new Error(`Path is not a file: ${path}`);
    }

    return {
      content: Buffer.from(data.content, "base64").toString("utf-8"),
      sha: data.sha,
    };
  } catch (err: unknown) {
    if (err instanceof Error && err.message.startsWith("Path is not a file")) {
      throw err;
    }
    if (err instanceof Error && "status" in err && (err as { status: number }).status === 404) {
      throw new Error(`File not found: ${path}`);
    }
    throw new Error(
      `Failed to read file ${path}: ${err instanceof Error ? err.message : "Unknown error"}`,
    );
  }
}

export async function createOrUpdateFile(
  token: string,
  owner: string,
  repo: string,
  path: string,
  content: string,
  message: string,
  sha?: string,
  branch?: string,
): Promise<{ sha: string }> {
  const octokit = createOctokit(token);

  try {
    const { data } = await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path,
      message,
      content: Buffer.from(content).toString("base64"),
      sha,
      branch,
    });

    return { sha: data.content?.sha ?? "" };
  } catch (err: unknown) {
    if (err instanceof Error && "status" in err && (err as { status: number }).status === 409) {
      throw new Error(
        `Conflict updating ${path}: file was modified elsewhere. Fetch the latest version and try again.`,
      );
    }
    throw new Error(
      `Failed to save ${path}: ${err instanceof Error ? err.message : "Unknown error"}`,
    );
  }
}

export async function deleteFile(
  token: string,
  owner: string,
  repo: string,
  path: string,
  sha: string,
  message: string,
  branch?: string,
): Promise<void> {
  const octokit = createOctokit(token);

  try {
    await octokit.repos.deleteFile({
      owner,
      repo,
      path,
      message,
      sha,
      branch,
    });
  } catch (err: unknown) {
    if (err instanceof Error && "status" in err && (err as { status: number }).status === 404) {
      throw new Error(`File not found for deletion: ${path}`);
    }
    throw new Error(
      `Failed to delete ${path}: ${err instanceof Error ? err.message : "Unknown error"}`,
    );
  }
}

export async function listBranches(
  token: string,
  owner: string,
  repo: string,
): Promise<{ name: string; protected: boolean }[]> {
  const octokit = createOctokit(token);

  try {
    const { data } = await octokit.repos.listBranches({
      owner,
      repo,
      per_page: 100,
    });

    return data.map(function mapBranch(b) {
      return {
        name: b.name,
        protected: b.protected,
      };
    });
  } catch (err: unknown) {
    throw new Error(
      `Failed to list branches: ${err instanceof Error ? err.message : "Unknown error"}`,
    );
  }
}

export async function createBranch(
  token: string,
  owner: string,
  repo: string,
  branchName: string,
  fromBranch: string,
): Promise<void> {
  const octokit = createOctokit(token);

  try {
    const { data: ref } = await octokit.git.getRef({
      owner,
      repo,
      ref: `heads/${fromBranch}`,
    });

    await octokit.git.createRef({
      owner,
      repo,
      ref: `refs/heads/${branchName}`,
      sha: ref.object.sha,
    });
  } catch (err: unknown) {
    if (err instanceof Error && "status" in err && (err as { status: number }).status === 422) {
      throw new Error(`Branch "${branchName}" already exists`);
    }
    throw new Error(
      `Failed to create branch "${branchName}": ${err instanceof Error ? err.message : "Unknown error"}`,
    );
  }
}

export async function getRepoTree(
  token: string,
  owner: string,
  repo: string,
  branch?: string,
): Promise<string[]> {
  const octokit = createOctokit(token);

  try {
    const ref = branch ?? "main";
    const { data } = await octokit.git.getTree({
      owner,
      repo,
      tree_sha: ref,
      recursive: "1",
    });

    return data.tree
      .filter(function isBlob(item) {
        return item.type === "blob" && item.path != null;
      })
      .map(function getPath(item) {
        return item.path as string;
      });
  } catch (err: unknown) {
    throw new Error(
      `Failed to get repo tree: ${err instanceof Error ? err.message : "Unknown error"}`,
    );
  }
}
