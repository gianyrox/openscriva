"use client";

import { useState, useEffect, useCallback } from "react";
import { Mail, Check, X } from "lucide-react";
import { useAppStore } from "@/store";

interface Invitation {
  id: number;
  repo: { full_name: string; description: string | null };
  inviter: { login: string };
  created_at: string;
}

interface InvitationBannerProps {
  onAccepted?: () => void;
}

export default function InvitationBanner({ onAccepted }: InvitationBannerProps) {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [acting, setActing] = useState<number | null>(null);
  const keysStored = useAppStore(function selectKeysStored(s) {
    return s.preferences.keysStored;
  });

  const fetchInvitations = useCallback(  function fetchInvitations() {
    if (!keysStored) return;

    fetch("/api/github/invitations")
      .then(function handleRes(res) {
        return res.json();
      })
      .then(function handleData(data) {
        if (data.invitations) {
          setInvitations(data.invitations);
        }
      })
      .catch(function noop() {});
  }, [keysStored]);

  useEffect(function loadInvitations() {
    fetchInvitations();
  }, [fetchInvitations]);

  function handleAccept(invitationId: number) {
    if (!keysStored) return;
    setActing(invitationId);

    fetch("/api/github/invitations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ invitation_id: invitationId }),
    })
      .then(function afterAccept() {
        setInvitations(function removeAccepted(prev) {
          return prev.filter(function keep(inv) {
            return inv.id !== invitationId;
          });
        });
        if (onAccepted) onAccepted();
      })
      .catch(function noop() {})
      .finally(function done() {
        setActing(null);
      });
  }

  function handleDecline(invitationId: number) {
    if (!keysStored) return;
    setActing(invitationId);

    fetch("/api/github/invitations", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ invitation_id: invitationId }),
    })
      .then(function afterDecline() {
        setInvitations(function removeDeclined(prev) {
          return prev.filter(function keep(inv) {
            return inv.id !== invitationId;
          });
        });
      })
      .catch(function noop() {})
      .finally(function done() {
        setActing(null);
      });
  }

  if (invitations.length === 0) return null;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        padding: "12px 16px",
        margin: "0 0 8px",
        borderLeft: "3px solid var(--color-accent)",
        backgroundColor: "rgba(196, 164, 105, 0.06)",
        borderRadius: "0 8px 8px 0",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontSize: 12,
          fontWeight: 600,
          color: "var(--color-accent)",
        }}
      >
        <Mail size={14} strokeWidth={1.5} />
        Pending Invitations
      </div>

      {invitations.map(function renderInvitation(inv) {
        const isActing = acting === inv.id;

        return (
          <div
            key={inv.id}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              padding: "8px 0",
              borderTop: "1px solid var(--color-border)",
            }}
          >
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
                {inv.repo.full_name}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "var(--color-text-muted)",
                  marginTop: 2,
                }}
              >
                from @{inv.inviter.login}
              </div>
            </div>

            <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
              <button
                type="button"
                onClick={function onAccept() {
                  handleAccept(inv.id);
                }}
                disabled={isActing}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "4px 10px",
                  border: "none",
                  borderRadius: 6,
                  backgroundColor: "var(--color-success)",
                  color: "#fff",
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: isActing ? "default" : "pointer",
                  opacity: isActing ? 0.5 : 1,
                  fontFamily: "inherit",
                }}
              >
                <Check size={12} strokeWidth={2} />
                Accept
              </button>
              <button
                type="button"
                onClick={function onDecline() {
                  handleDecline(inv.id);
                }}
                disabled={isActing}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "4px 10px",
                  border: "1px solid var(--color-border)",
                  borderRadius: 6,
                  backgroundColor: "transparent",
                  color: "var(--color-text-muted)",
                  fontSize: 11,
                  fontWeight: 500,
                  cursor: isActing ? "default" : "pointer",
                  opacity: isActing ? 0.5 : 1,
                  fontFamily: "inherit",
                }}
              >
                <X size={12} strokeWidth={2} />
                Decline
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
