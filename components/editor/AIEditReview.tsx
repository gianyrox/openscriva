"use client";

import { useState, useMemo } from "react";
import { ArrowLeft, Check, X, FileText, ChevronDown, ChevronRight, Plus, Minus } from "lucide-react";
import { useAppStore } from "@/store";
import type { AIEdit } from "@/types";

interface AIEditReviewProps {
  onClose: () => void;
  onApplyEdits?: (accepted: AIEdit[]) => void;
}

function groupEditsByFile(edits: AIEdit[]): Record<string, AIEdit[]> {
  var groups: Record<string, AIEdit[]> = {};
  for (var i = 0; i < edits.length; i++) {
    var filePath = edits[i].filePath;
    if (!groups[filePath]) groups[filePath] = [];
    groups[filePath].push(edits[i]);
  }
  return groups;
}

function getFileName(path: string): string {
  return path.split("/").pop() || path;
}

function DiffBlock({ edit, onAccept, onReject }: { edit: AIEdit; onAccept: () => void; onReject: () => void }) {
  if (edit.status === "accepted") {
    return (
      <div style={{ padding: "8px 12px", fontSize: 12, color: "var(--color-success)", fontStyle: "italic" }}>
        Change accepted
      </div>
    );
  }
  if (edit.status === "rejected") {
    return (
      <div style={{ padding: "8px 12px", fontSize: 12, color: "var(--color-text-muted)", fontStyle: "italic" }}>
        Change rejected
      </div>
    );
  }

  return (
    <div
      style={{
        border: "1px solid var(--color-border)",
        borderRadius: 6,
        overflow: "hidden",
        marginBottom: 8,
      }}
    >
      {edit.original && (
        <div
          style={{
            padding: "6px 12px",
            fontSize: 12,
            fontFamily: "var(--font-jetbrains-mono), monospace",
            lineHeight: 1.6,
            backgroundColor: "color-mix(in srgb, var(--color-error) 8%, transparent)",
            borderLeft: "3px solid var(--color-error)",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "var(--color-error)", fontSize: 10, fontWeight: 600, marginBottom: 2, fontFamily: "var(--font-inter), system-ui, sans-serif" }}>
            <Minus size={10} /> ORIGINAL
          </span>
          <div style={{ color: "var(--color-text)", opacity: 0.7, textDecoration: "line-through" }}>{edit.original}</div>
        </div>
      )}
      <div
        style={{
          padding: "6px 12px",
          fontSize: 12,
          fontFamily: "var(--font-jetbrains-mono), monospace",
          lineHeight: 1.6,
          backgroundColor: "color-mix(in srgb, var(--color-success) 8%, transparent)",
          borderLeft: "3px solid var(--color-success)",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "var(--color-success)", fontSize: 10, fontWeight: 600, marginBottom: 2, fontFamily: "var(--font-inter), system-ui, sans-serif" }}>
          <Plus size={10} /> SUGGESTED
        </span>
        <div style={{ color: "var(--color-text)" }}>{edit.suggested}</div>
      </div>
      <div
        style={{
          display: "flex",
          gap: 6,
          padding: "6px 12px",
          borderTop: "1px solid var(--color-border)",
          backgroundColor: "var(--color-surface)",
        }}
      >
        <button
          onClick={onAccept}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            padding: "4px 12px",
            fontSize: 11,
            fontFamily: "inherit",
            fontWeight: 600,
            border: "none",
            borderRadius: 4,
            backgroundColor: "color-mix(in srgb, var(--color-success) 15%, transparent)",
            color: "var(--color-success)",
            cursor: "pointer",
          }}
        >
          <Check size={12} /> Accept
        </button>
        <button
          onClick={onReject}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            padding: "4px 12px",
            fontSize: 11,
            fontFamily: "inherit",
            fontWeight: 600,
            border: "none",
            borderRadius: 4,
            backgroundColor: "color-mix(in srgb, var(--color-error) 15%, transparent)",
            color: "var(--color-error)",
            cursor: "pointer",
          }}
        >
          <X size={12} /> Reject
        </button>
      </div>
    </div>
  );
}

export default function AIEditReview({ onClose, onApplyEdits }: AIEditReviewProps) {
  var edits = useAppStore(function selectEdits(s) { return s.pendingAIEdits; });
  var updateStatus = useAppStore(function selectUpdate(s) { return s.updateAIEditStatus; });
  var clearEdits = useAppStore(function selectClear(s) { return s.clearAIEdits; });
  var setPendingAIEdits = useAppStore(function selectSet(s) { return s.setPendingAIEdits; });

  var grouped = useMemo(function group() { return groupEditsByFile(edits); }, [edits]);
  var filePaths = Object.keys(grouped);
  var [selectedFile, setSelectedFile] = useState(filePaths[0] || "");
  var [expandedFiles, setExpandedFiles] = useState<Record<string, boolean>>({});

  var pendingCount = edits.filter(function f(e) { return e.status === "pending"; }).length;
  var acceptedCount = edits.filter(function f(e) { return e.status === "accepted"; }).length;
  var rejectedCount = edits.filter(function f(e) { return e.status === "rejected"; }).length;

  function handleAcceptEdit(id: string) {
    updateStatus(id, "accepted");
  }

  function handleRejectEdit(id: string) {
    updateStatus(id, "rejected");
  }

  function handleAcceptAllInFile(filePath: string) {
    var fileEdits = grouped[filePath] || [];
    for (var i = 0; i < fileEdits.length; i++) {
      if (fileEdits[i].status === "pending") {
        updateStatus(fileEdits[i].id, "accepted");
      }
    }
  }

  function handleRejectAllInFile(filePath: string) {
    var fileEdits = grouped[filePath] || [];
    for (var i = 0; i < fileEdits.length; i++) {
      if (fileEdits[i].status === "pending") {
        updateStatus(fileEdits[i].id, "rejected");
      }
    }
  }

  function handleAcceptAll() {
    for (var i = 0; i < edits.length; i++) {
      if (edits[i].status === "pending") {
        updateStatus(edits[i].id, "accepted");
      }
    }
  }

  function handleRejectAll() {
    for (var i = 0; i < edits.length; i++) {
      if (edits[i].status === "pending") {
        updateStatus(edits[i].id, "rejected");
      }
    }
  }

  function handleDone() {
    var accepted = edits.filter(function f(e) { return e.status === "accepted"; });
    if (onApplyEdits && accepted.length > 0) {
      onApplyEdits(accepted);
    }
    clearEdits();
    onClose();
  }

  function toggleFileExpanded(path: string) {
    setExpandedFiles(function prev(p) {
      return { ...p, [path]: !p[path] };
    });
  }

  var selectedEdits = grouped[selectedFile] || [];
  var selectedPending = selectedEdits.filter(function f(e) { return e.status === "pending"; }).length;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        fontFamily: "var(--font-inter), system-ui, sans-serif",
        backgroundColor: "var(--color-bg)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "12px 20px",
          borderBottom: "1px solid var(--color-border)",
          backgroundColor: "var(--color-surface)",
          flexShrink: 0,
        }}
      >
        <button
          onClick={onClose}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            border: "none",
            background: "none",
            color: "var(--color-text-muted)",
            fontSize: 12,
            cursor: "pointer",
            padding: "4px 0",
            fontFamily: "inherit",
          }}
        >
          <ArrowLeft size={14} strokeWidth={1.5} />
          Back to editor
        </button>

        <div style={{ flex: 1 }} />

        <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 11 }}>
          <span style={{ color: "var(--color-text-muted)" }}>
            {pendingCount} pending
          </span>
          <span style={{ color: "var(--color-success)" }}>
            {acceptedCount} accepted
          </span>
          <span style={{ color: "var(--color-error)" }}>
            {rejectedCount} rejected
          </span>
        </div>

        {pendingCount > 0 && (
          <div style={{ display: "flex", gap: 6 }}>
            <button
              onClick={handleAcceptAll}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                padding: "4px 12px",
                fontSize: 11,
                fontFamily: "inherit",
                fontWeight: 600,
                border: "none",
                borderRadius: 4,
                backgroundColor: "var(--color-success)",
                color: "#fff",
                cursor: "pointer",
              }}
            >
              <Check size={12} /> Accept All
            </button>
            <button
              onClick={handleRejectAll}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                padding: "4px 12px",
                fontSize: 11,
                fontFamily: "inherit",
                fontWeight: 600,
                border: "none",
                borderRadius: 4,
                backgroundColor: "var(--color-error)",
                color: "#fff",
                cursor: "pointer",
              }}
            >
              <X size={12} /> Reject All
            </button>
          </div>
        )}

        {pendingCount === 0 && (
          <button
            onClick={handleDone}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: "6px 16px",
              fontSize: 12,
              fontFamily: "inherit",
              fontWeight: 600,
              border: "none",
              borderRadius: 6,
              backgroundColor: "var(--color-accent)",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            <Check size={14} /> Done
          </button>
        )}
      </div>

      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        <div
          style={{
            width: 260,
            borderRight: "1px solid var(--color-border)",
            overflowY: "auto",
            flexShrink: 0,
            backgroundColor: "var(--color-surface)",
          }}
        >
          <div
            style={{
              padding: "10px 12px",
              fontSize: 10,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: "var(--color-text-muted)",
              borderBottom: "1px solid var(--color-border)",
            }}
          >
            Changed Files ({filePaths.length})
          </div>
          {filePaths.map(function renderFile(path) {
            var fileEdits = grouped[path];
            var filePending = fileEdits.filter(function f(e) { return e.status === "pending"; }).length;
            var isSelected = path === selectedFile;
            return (
              <button
                key={path}
                onClick={function select() { setSelectedFile(path); }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  width: "100%",
                  padding: "8px 12px",
                  fontSize: 12,
                  fontFamily: "inherit",
                  border: "none",
                  borderLeft: isSelected ? "3px solid var(--color-accent)" : "3px solid transparent",
                  backgroundColor: isSelected ? "color-mix(in srgb, var(--color-accent) 8%, transparent)" : "transparent",
                  color: "var(--color-text)",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <FileText size={13} style={{ color: "var(--color-text-muted)", flexShrink: 0 }} />
                <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: isSelected ? 600 : 400 }}>
                  {getFileName(path)}
                </span>
                {filePending > 0 && (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      minWidth: 18,
                      height: 18,
                      borderRadius: 9,
                      backgroundColor: "var(--color-accent)",
                      color: "#fff",
                      fontSize: 10,
                      fontWeight: 600,
                      padding: "0 5px",
                      flexShrink: 0,
                    }}
                  >
                    {filePending}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div style={{ flex: 1, overflowY: "auto" }}>
          {selectedFile ? (
            <div style={{ maxWidth: 800, margin: "0 auto", padding: "20px 24px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 16,
                }}
              >
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "var(--color-text)" }}>
                    {selectedFile}
                  </h3>
                  <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 2 }}>
                    {selectedEdits.length} edit{selectedEdits.length !== 1 ? "s" : ""}, {selectedPending} pending
                  </div>
                </div>
                {selectedPending > 0 && (
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      onClick={function acceptFile() { handleAcceptAllInFile(selectedFile); }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 3,
                        padding: "4px 10px",
                        fontSize: 11,
                        fontFamily: "inherit",
                        fontWeight: 500,
                        border: "1px solid var(--color-success)",
                        borderRadius: 4,
                        backgroundColor: "color-mix(in srgb, var(--color-success) 10%, transparent)",
                        color: "var(--color-success)",
                        cursor: "pointer",
                      }}
                    >
                      <Check size={11} /> Accept File
                    </button>
                    <button
                      onClick={function rejectFile() { handleRejectAllInFile(selectedFile); }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 3,
                        padding: "4px 10px",
                        fontSize: 11,
                        fontFamily: "inherit",
                        fontWeight: 500,
                        border: "1px solid var(--color-error)",
                        borderRadius: 4,
                        backgroundColor: "color-mix(in srgb, var(--color-error) 10%, transparent)",
                        color: "var(--color-error)",
                        cursor: "pointer",
                      }}
                    >
                      <X size={11} /> Reject File
                    </button>
                  </div>
                )}
              </div>

              {selectedEdits.map(function renderEdit(edit) {
                return (
                  <DiffBlock
                    key={edit.id}
                    edit={edit}
                    onAccept={function accept() { handleAcceptEdit(edit.id); }}
                    onReject={function reject() { handleRejectEdit(edit.id); }}
                  />
                );
              })}
            </div>
          ) : (
            <div
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--color-text-muted)",
                fontSize: 13,
              }}
            >
              Select a file from the sidebar to review changes.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
