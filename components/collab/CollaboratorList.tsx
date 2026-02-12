"use client";

import { useState, useEffect, useCallback } from "react";
import { Trash2, Shield, User } from "lucide-react";
import { useAppStore } from "@/store";

interface Collaborator {
  login: string;
  avatar_url: string;
  role_name: string;
  permissions: Record<string, boolean>;
}

interface CollaboratorListProps {
  owner: string;
  repo: string;
}

export default function CollaboratorList({ owner, repo }: CollaboratorListProps) {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<string | null>(null);
  const keysStored = useAppStore(function selectKeysStored(s) {
    return s.preferences.keysStored;
  });

  const fetchCollaborators = useCallback(  function fetchCollaborators() {
    if (!keysStored) return;
    setLoading(true);

    fetch(`/api/github/collaborators?owner=${owner}&repo=${repo}`)
      .then(function handleRes(res) {
        return res.json();
      })
      .then(function handleData(data) {
        if (data.collaborators) {
          setCollaborators(data.collaborators);
        }
      })
      .catch(function noop() {})
      .finally(function done() {
        setLoading(false);
      });
  }, [keysStored, owner, repo]);

  useEffect(function loadCollaborators() {
    fetchCollaborators();
  }, [fetchCollaborators]);

  function handleRemove(username: string) {
    if (!keysStored) return;
    setRemoving(username);

    fetch("/api/github/collaborators", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ owner, repo, username }),
    })
      .then(function afterRemove() {
        setCollaborators(function removeUser(prev) {
          return prev.filter(function keep(c) {
            return c.login !== username;
          });
        });
      })
      .catch(function noop() {})
      .finally(function done() {
        setRemoving(null);
      });
  }

  if (loading) {
    return (
      <div
        style={{
          padding: 24,
          color: "var(--color-text-muted)",
          fontSize: 13,
          textAlign: "center",
        }}
      >
        Loading collaborators...
      </div>
    );
  }

  if (collaborators.length === 0) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 8,
          padding: 24,
          color: "var(--color-text-muted)",
          textAlign: "center",
        }}
      >
        <User size={24} strokeWidth={1} style={{ opacity: 0.5 }} />
        <span style={{ fontSize: 13 }}>No collaborators yet</span>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {collaborators.map(function renderCollaborator(collab) {
        const isOwner = collab.role_name === "admin" || collab.permissions?.admin;
        const isRemoving = removing === collab.login;

        return (
          <div
            key={collab.login}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "10px 12px",
              borderRadius: 8,
              transition: "background-color 150ms ease",
            }}
            onMouseEnter={function onEnter(e) {
              e.currentTarget.style.backgroundColor = "var(--color-surface-hover)";
            }}
            onMouseLeave={function onLeave(e) {
              e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            <img
              src={collab.avatar_url}
              alt={collab.login}
              width={32}
              height={32}
              style={{
                borderRadius: "50%",
                flexShrink: 0,
              }}
            />

            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: "var(--color-text)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {collab.login}
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  fontSize: 11,
                  color: "var(--color-text-muted)",
                  marginTop: 1,
                }}
              >
                {isOwner && <Shield size={10} strokeWidth={2} />}
                {collab.role_name ?? "collaborator"}
              </div>
            </div>

            {!isOwner && (
              <button
                type="button"
                onClick={function onRemove() {
                  handleRemove(collab.login);
                }}
                disabled={isRemoving}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: 6,
                  border: "none",
                  borderRadius: 6,
                  background: "transparent",
                  color: "var(--color-text-muted)",
                  cursor: isRemoving ? "default" : "pointer",
                  opacity: isRemoving ? 0.4 : 1,
                  transition: "color 150ms ease",
                }}
                onMouseEnter={function onEnter(e) {
                  e.currentTarget.style.color = "var(--color-error)";
                }}
                onMouseLeave={function onLeave(e) {
                  e.currentTarget.style.color = "var(--color-text-muted)";
                }}
              >
                <Trash2 size={14} strokeWidth={1.5} />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
