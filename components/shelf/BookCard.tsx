"use client";

import { useState, useEffect } from "react";
import { GitBranch, Users, ChevronDown, ChevronRight, Shield, Plus, Loader2 } from "lucide-react";
import { useAppStore } from "@/store";

interface BookCardRepo {
  name: string;
  full_name: string;
  description: string | null;
  private: boolean;
  default_branch: string;
  updated_at: string | null;
}

interface BranchInfo {
  name: string;
  protected: boolean;
  lastAuthor?: string;
  lastAuthorAvatar?: string;
  lastUpdated?: string;
}

interface Collaborator {
  login: string;
  avatar_url: string;
  role_name: string;
}

interface BookCardProps {
  repo: BookCardRepo;
  onSelect: (repo: BookCardRepo) => void;
  onSelectBranch?: (repo: BookCardRepo, branch: string) => void;
}

function formatDate(dateString: string | null): string {
  if (!dateString) return "";
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return diffDays + " days ago";
  if (diffDays < 30) return Math.floor(diffDays / 7) + " weeks ago";

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

export default function BookCard({ repo, onSelect, onSelectBranch }: BookCardProps) {
  var [expanded, setExpanded] = useState(false);
  var [branches, setBranches] = useState<BranchInfo[]>([]);
  var [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  var [loadingDetails, setLoadingDetails] = useState(false);
  var [creatingDraft, setCreatingDraft] = useState(false);
  var [newDraftName, setNewDraftName] = useState("");
  var [showNewDraftInput, setShowNewDraftInput] = useState(false);
  var [createError, setCreateError] = useState("");
  var keysStored = useAppStore(function selectKeys(s) {
    return s.preferences.keysStored;
  });

  useEffect(function fetchDetails() {
    if (!expanded || !keysStored) return;

    var [owner, repoName] = repo.full_name.split("/");
    if (!owner || !repoName) return;

    setLoadingDetails(true);

    var branchesReq = fetch(
      "/api/github/branches?owner=" + encodeURIComponent(owner) + "&repo=" + encodeURIComponent(repoName),
    ).then(function handleRes(res) { return res.json(); });

    var collabReq = fetch(
      "/api/github/collaborators?owner=" + encodeURIComponent(owner) + "&repo=" + encodeURIComponent(repoName),
    ).then(function handleRes(res) { return res.json(); }).catch(function noop() { return { collaborators: [] }; });

    Promise.all([branchesReq, collabReq])
      .then(function handleData(results) {
        var branchData = results[0];
        var collabData = results[1];
        if (branchData.branches) setBranches(branchData.branches);
        if (collabData.collaborators) setCollaborators(collabData.collaborators);
      })
      .catch(function noop() {})
      .finally(function done() {
        setLoadingDetails(false);
      });
  }, [expanded, keysStored, repo.full_name]);

  var draftBranches = branches.filter(function isDraft(b) {
    return b.name.startsWith("scriva/");
  });
  var otherBranches = branches.filter(function isOther(b) {
    return !b.name.startsWith("scriva/") && b.name !== repo.default_branch;
  });

  function handleToggleExpand(e: React.MouseEvent) {
    e.stopPropagation();
    setExpanded(!expanded);
  }

  function refetchBranches() {
    var [owner, repoName] = repo.full_name.split("/");
    if (!owner || !repoName) return;
    fetch(
      "/api/github/branches?owner=" + encodeURIComponent(owner) + "&repo=" + encodeURIComponent(repoName),
    ).then(function handleRes(res) { return res.json(); }).then(function handleData(data) {
      if (data.branches) setBranches(data.branches);
    }).catch(function noop() {});
  }

  function handleCreateDraft() {
    var trimmed = newDraftName.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
    if (!trimmed) {
      setCreateError("Enter a name");
      return;
    }

    var branchName = "scriva/" + trimmed;
    var exists = branches.some(function check(b) { return b.name === branchName; });
    if (exists) {
      setCreateError("Branch already exists");
      return;
    }

    var [owner, repoName] = repo.full_name.split("/");
    if (!owner || !repoName) return;

    setCreatingDraft(true);
    setCreateError("");

    fetch("/api/github/branches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        owner: owner,
        repo: repoName,
        name: branchName,
        from: repo.default_branch,
      }),
    }).then(function handleRes(res) { return res.json(); }).then(function handleData(data) {
      if (data.error) {
        setCreateError(data.error);
      } else {
        setNewDraftName("");
        setShowNewDraftInput(false);
        refetchBranches();
      }
    }).catch(function handleErr() {
      setCreateError("Failed to create branch");
    }).finally(function done() {
      setCreatingDraft(false);
    });
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        backgroundColor: "var(--color-surface)",
        borderRadius: 12,
        border: "1px solid var(--color-border)",
        overflow: "hidden",
        transition: "border-color 150ms ease",
        fontFamily: "var(--font-inter), system-ui, sans-serif",
      }}
    >
      <button
        type="button"
        onClick={function handleClick() {
          onSelect(repo);
        }}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
          padding: 20,
          cursor: "pointer",
          textAlign: "left",
          width: "100%",
          border: "none",
          background: "transparent",
          fontFamily: "inherit",
          transition: "background-color 150ms ease",
        }}
        onMouseEnter={function onEnter(e) {
          e.currentTarget.style.backgroundColor = "var(--color-surface-hover)";
        }}
        onMouseLeave={function onLeave(e) {
          e.currentTarget.style.backgroundColor = "transparent";
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
          }}
        >
          <span
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: "var(--color-text)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              flex: 1,
            }}
          >
            {repo.name}
          </span>

          <span
            style={{
              fontSize: 11,
              fontWeight: 500,
              padding: "2px 8px",
              borderRadius: 9999,
              backgroundColor: repo.private
                ? "var(--color-surface-hover)"
                : "var(--color-success)",
              color: repo.private
                ? "var(--color-text-muted)"
                : "#ffffff",
              marginLeft: 8,
              flexShrink: 0,
            }}
          >
            {repo.private ? "Private" : "Public"}
          </span>
        </div>

        {repo.description && (
          <p
            style={{
              fontSize: 13,
              color: "var(--color-text-muted)",
              margin: 0,
              lineHeight: 1.4,
              overflow: "hidden",
              textOverflow: "ellipsis",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
            }}
          >
            {repo.description}
          </p>
        )}

        <span
          style={{
            fontSize: 12,
            color: "var(--color-text-muted)",
            opacity: 0.7,
            marginTop: "auto",
          }}
        >
          {formatDate(repo.updated_at)}
        </span>
      </button>

      <div
        style={{
          borderTop: "1px solid var(--color-border)",
          padding: "0 20px",
        }}
      >
        <button
          type="button"
          onClick={handleToggleExpand}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            width: "100%",
            padding: "8px 0",
            border: "none",
            background: "transparent",
            cursor: "pointer",
            fontSize: 12,
            color: "var(--color-text-muted)",
            fontFamily: "inherit",
          }}
        >
          {expanded ? (
            <ChevronDown size={12} strokeWidth={1.5} />
          ) : (
            <ChevronRight size={12} strokeWidth={1.5} />
          )}
          Branches & People
        </button>
      </div>

      {expanded && (
        <div
          style={{
            padding: "0 20px 16px",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          {loadingDetails && (
            <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>Loading...</span>
          )}

          {!loadingDetails && (
            <>
              <div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    color: "var(--color-text-muted)",
                    marginBottom: 6,
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <GitBranch size={11} strokeWidth={2} />
                  Branches
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <button
                    type="button"
                    onClick={function onPickDefault(e) {
                      e.stopPropagation();
                      if (onSelectBranch) onSelectBranch(repo, repo.default_branch);
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "4px 8px",
                      borderRadius: 4,
                      fontSize: 12,
                      color: "var(--color-text)",
                      backgroundColor: "color-mix(in srgb, var(--color-accent) 8%, transparent)",
                      border: "none",
                      cursor: "pointer",
                      fontFamily: "inherit",
                      textAlign: "left",
                      width: "100%",
                      transition: "background-color 150ms ease",
                    }}
                    onMouseEnter={function onEnter(e) {
                      e.currentTarget.style.backgroundColor = "color-mix(in srgb, var(--color-accent) 16%, transparent)";
                    }}
                    onMouseLeave={function onLeave(e) {
                      e.currentTarget.style.backgroundColor = "color-mix(in srgb, var(--color-accent) 8%, transparent)";
                    }}
                  >
                    <GitBranch size={11} strokeWidth={1.5} style={{ color: "var(--color-accent)" }} />
                    <span style={{ fontWeight: 500 }}>{repo.default_branch}</span>
                    <span style={{ fontSize: 10, color: "var(--color-text-muted)" }}>default</span>
                  </button>

                  {draftBranches.map(function renderDraft(b) {
                    return (
                      <button
                        type="button"
                        key={b.name}
                        onClick={function onPickDraft(e) {
                          e.stopPropagation();
                          if (onSelectBranch) onSelectBranch(repo, b.name);
                        }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          padding: "4px 8px",
                          borderRadius: 4,
                          fontSize: 12,
                          color: "var(--color-text)",
                          backgroundColor: "color-mix(in srgb, var(--color-success) 8%, transparent)",
                          border: "none",
                          cursor: "pointer",
                          fontFamily: "inherit",
                          textAlign: "left",
                          width: "100%",
                          transition: "background-color 150ms ease",
                        }}
                        onMouseEnter={function onEnter(e) {
                          e.currentTarget.style.backgroundColor = "color-mix(in srgb, var(--color-success) 16%, transparent)";
                        }}
                        onMouseLeave={function onLeave(e) {
                          e.currentTarget.style.backgroundColor = "color-mix(in srgb, var(--color-success) 8%, transparent)";
                        }}
                      >
                        <GitBranch size={11} strokeWidth={1.5} style={{ color: "var(--color-success)", flexShrink: 0 }} />
                        <span style={{ fontWeight: 500 }}>{b.name}</span>
                        <span style={{ fontSize: 10, color: "var(--color-text-muted)", flexShrink: 0 }}>draft</span>
                        {b.lastAuthor && (
                          <span style={{ fontSize: 10, color: "var(--color-text-muted)", marginLeft: "auto", flexShrink: 0 }}>
                            {b.lastAuthor}{b.lastUpdated ? " \u00b7 " + formatDate(b.lastUpdated) : ""}
                          </span>
                        )}
                      </button>
                    );
                  })}

                  {otherBranches.map(function renderOther(b) {
                    return (
                      <div
                        key={b.name}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          padding: "4px 8px",
                          borderRadius: 4,
                          fontSize: 12,
                          color: "var(--color-text-muted)",
                        }}
                      >
                        <GitBranch size={11} strokeWidth={1.5} />
                        <span>{b.name}</span>
                      </div>
                    );
                  })}

                  {branches.length === 0 && (
                    <span style={{ fontSize: 12, color: "var(--color-text-muted)", padding: "4px 8px" }}>
                      No branches found
                    </span>
                  )}

                  {!showNewDraftInput && (
                    <button
                      type="button"
                      onClick={function onNewDraft(e) {
                        e.stopPropagation();
                        setShowNewDraftInput(true);
                        setCreateError("");
                        setNewDraftName("");
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        padding: "4px 8px",
                        borderRadius: 4,
                        fontSize: 11,
                        fontWeight: 500,
                        color: "var(--color-accent)",
                        border: "1px dashed var(--color-border)",
                        background: "transparent",
                        cursor: "pointer",
                        fontFamily: "inherit",
                        marginTop: 2,
                        transition: "border-color 150ms ease, background 150ms ease",
                      }}
                      onMouseEnter={function onEnter(e) {
                        e.currentTarget.style.borderColor = "var(--color-accent)";
                        e.currentTarget.style.backgroundColor = "color-mix(in srgb, var(--color-accent) 6%, transparent)";
                      }}
                      onMouseLeave={function onLeave(e) {
                        e.currentTarget.style.borderColor = "var(--color-border)";
                        e.currentTarget.style.backgroundColor = "transparent";
                      }}
                    >
                      <Plus size={10} strokeWidth={2} />
                      New Draft
                    </button>
                  )}

                  {showNewDraftInput && (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 4,
                        marginTop: 2,
                        padding: "6px 8px",
                        borderRadius: 4,
                        backgroundColor: "var(--color-surface-hover)",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <span style={{ fontSize: 11, color: "var(--color-text-muted)", flexShrink: 0 }}>scriva/</span>
                        <input
                          type="text"
                          value={newDraftName}
                          onChange={function onChange(e) {
                            setNewDraftName(e.target.value);
                            setCreateError("");
                          }}
                          onKeyDown={function onKey(e) {
                            if (e.key === "Enter") handleCreateDraft();
                            if (e.key === "Escape") { setShowNewDraftInput(false); setCreateError(""); }
                          }}
                          placeholder="my-revision"
                          autoFocus
                          style={{
                            flex: 1,
                            fontSize: 12,
                            padding: "3px 6px",
                            borderRadius: 3,
                            border: "1px solid var(--color-border)",
                            backgroundColor: "var(--color-bg)",
                            color: "var(--color-text)",
                            outline: "none",
                            fontFamily: "inherit",
                            minWidth: 0,
                          }}
                        />
                        <button
                          type="button"
                          onClick={handleCreateDraft}
                          disabled={creatingDraft}
                          style={{
                            fontSize: 11,
                            fontWeight: 500,
                            padding: "3px 8px",
                            borderRadius: 3,
                            border: "none",
                            backgroundColor: "var(--color-accent)",
                            color: "#ffffff",
                            cursor: creatingDraft ? "default" : "pointer",
                            opacity: creatingDraft ? 0.7 : 1,
                            fontFamily: "inherit",
                            flexShrink: 0,
                          }}
                        >
                          {creatingDraft ? <Loader2 size={10} style={{ animation: "spin 1s linear infinite" }} /> : "Create"}
                        </button>
                        <button
                          type="button"
                          onClick={function onCancel() {
                            setShowNewDraftInput(false);
                            setCreateError("");
                          }}
                          style={{
                            fontSize: 11,
                            padding: "3px 6px",
                            borderRadius: 3,
                            border: "1px solid var(--color-border)",
                            background: "transparent",
                            color: "var(--color-text-muted)",
                            cursor: "pointer",
                            fontFamily: "inherit",
                            flexShrink: 0,
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                      {createError && (
                        <span style={{ fontSize: 10, color: "var(--color-error)" }}>{createError}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    color: "var(--color-text-muted)",
                    marginBottom: 6,
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <Users size={11} strokeWidth={2} />
                  People
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {collaborators.map(function renderCollab(c) {
                    var isAdmin = c.role_name === "admin";
                    return (
                      <div
                        key={c.login}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          padding: "4px 8px",
                          borderRadius: 4,
                          fontSize: 12,
                        }}
                      >
                        <img
                          src={c.avatar_url}
                          alt={c.login}
                          width={20}
                          height={20}
                          style={{ borderRadius: "50%", flexShrink: 0 }}
                        />
                        <span style={{ fontWeight: 500, color: "var(--color-text)" }}>{c.login}</span>
                        <span
                          style={{
                            fontSize: 10,
                            color: isAdmin ? "var(--color-accent)" : "var(--color-text-muted)",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 2,
                          }}
                        >
                          {isAdmin && <Shield size={9} strokeWidth={2} />}
                          {c.role_name}
                        </span>
                      </div>
                    );
                  })}
                  {collaborators.length === 0 && (
                    <span style={{ fontSize: 12, color: "var(--color-text-muted)", padding: "4px 8px" }}>
                      Only you
                    </span>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
