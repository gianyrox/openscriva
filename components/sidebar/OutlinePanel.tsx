"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from "@dnd-kit/core";
import type { DragStartEvent, DragEndEvent } from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ChevronRight,
  GripVertical,
  Plus,
  Pencil,
  Trash2,
  Sparkles,
  CircleDot,
} from "lucide-react";
import type { OutlineNode } from "@/types";
import {
  findNode,
  updateNode,
  addChild,
  removeNode,
  reorderChildren,
  getParentId,
  generateId,
} from "@/lib/outline";

interface OutlinePanelProps {
  outline: OutlineNode | null;
  onOutlineChange: (node: OutlineNode) => void;
  onChapterSelect: (chapterId: string) => void;
}

interface ContextMenuState {
  x: number;
  y: number;
  nodeId: string;
}

const STATUS_COLORS: Record<OutlineNode["status"], string> = {
  idea: "var(--color-text-muted)",
  draft: "#5b9bd5",
  revision: "#d4a843",
  final: "#6ab04c",
};

const STATUS_LABELS: Record<OutlineNode["status"], string> = {
  idea: "Idea",
  draft: "Draft",
  revision: "Revision",
  final: "Final",
};

function StatusBadge({ status }: { status: OutlineNode["status"] }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 3,
        fontSize: 10,
        fontWeight: 500,
        color: STATUS_COLORS[status],
        padding: "1px 5px",
        borderRadius: 3,
        backgroundColor: `color-mix(in srgb, ${STATUS_COLORS[status]} 12%, transparent)`,
        lineHeight: 1.4,
        flexShrink: 0,
      }}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

interface SortableNodeProps {
  node: OutlineNode;
  depth: number;
  expanded: Record<string, boolean>;
  onToggle: (id: string) => void;
  onSelect: (id: string) => void;
  onContextMenu: (e: React.MouseEvent, nodeId: string) => void;
  activeId: string | null;
}

function SortableNode({
  node,
  depth,
  expanded,
  onToggle,
  onSelect,
  onContextMenu,
  activeId,
}: SortableNodeProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: node.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const hasChildren = node.children && node.children.length > 0;
  const isExpanded = expanded[node.id] !== false;
  const childIds = (node.children || []).map(function getId(c) {
    return c.id;
  });

  return (
    <div ref={setNodeRef} style={style}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 2,
          padding: "4px 8px 4px " + (8 + depth * 16) + "px",
          cursor: node.type === "chapter" ? "pointer" : "default",
          userSelect: "none",
          borderRadius: 4,
          margin: "0 4px",
          transition: "background 100ms ease",
        }}
        onClick={function handleClick() {
          if (node.type === "chapter") {
            onSelect(node.id);
          } else if (hasChildren) {
            onToggle(node.id);
          }
        }}
        onContextMenu={function handleCtx(e) {
          e.preventDefault();
          onContextMenu(e, node.id);
        }}
        onMouseEnter={function handleEnter(e) {
          e.currentTarget.style.backgroundColor = "var(--color-surface-hover)";
        }}
        onMouseLeave={function handleLeave(e) {
          e.currentTarget.style.backgroundColor = "transparent";
        }}
      >
        <span
          {...attributes}
          {...listeners}
          style={{
            display: "flex",
            alignItems: "center",
            cursor: "grab",
            color: "var(--color-text-muted)",
            flexShrink: 0,
            padding: "2px 0",
          }}
        >
          <GripVertical size={12} />
        </span>

        <button
          onClick={function handleToggle(e) {
            e.stopPropagation();
            if (hasChildren) onToggle(node.id);
          }}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 16,
            height: 16,
            border: "none",
            background: "none",
            cursor: hasChildren ? "pointer" : "default",
            color: "var(--color-text-muted)",
            padding: 0,
            flexShrink: 0,
            transform: hasChildren && isExpanded ? "rotate(90deg)" : "rotate(0deg)",
            transition: "transform 150ms ease",
            visibility: hasChildren ? "visible" : "hidden",
          }}
        >
          <ChevronRight size={12} />
        </button>

        <span
          style={{
            flex: 1,
            fontSize: node.type === "book" ? 13 : 12,
            fontWeight: node.type === "book" || node.type === "part" ? 600 : 400,
            color: "var(--color-text)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            paddingLeft: 2,
          }}
        >
          {node.title}
        </span>

        <StatusBadge status={node.status} />

        {node.wordCount != null && node.wordCount > 0 && (
          <span
            style={{
              fontSize: 10,
              color: "var(--color-text-muted)",
              flexShrink: 0,
              marginLeft: 4,
            }}
          >
            {node.wordCount.toLocaleString()}w
          </span>
        )}
      </div>

      {hasChildren && isExpanded && (
        <SortableContext
          items={childIds}
          strategy={verticalListSortingStrategy}
        >
          {node.children!.map(function renderChild(child) {
            return (
              <SortableNode
                key={child.id}
                node={child}
                depth={depth + 1}
                expanded={expanded}
                onToggle={onToggle}
                onSelect={onSelect}
                onContextMenu={onContextMenu}
                activeId={activeId}
              />
            );
          })}
        </SortableContext>
      )}
    </div>
  );
}

function DragPreview({ node }: { node: OutlineNode }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 12px",
        backgroundColor: "var(--color-surface)",
        border: "1px solid var(--color-accent)",
        borderRadius: 6,
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        fontSize: 12,
        color: "var(--color-text)",
        maxWidth: 220,
      }}
    >
      <GripVertical size={12} style={{ color: "var(--color-text-muted)" }} />
      <span
        style={{
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {node.title}
      </span>
      <StatusBadge status={node.status} />
    </div>
  );
}

export default function OutlinePanel({
  outline,
  onOutlineChange,
  onChapterSelect,
}: OutlinePanelProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [activeId, setActiveId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [statusMenuId, setStatusMenuId] = useState<string | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  useEffect(function handleClickOutside() {
    function handler(e: MouseEvent) {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
        setStatusMenuId(null);
      }
    }
    document.addEventListener("mousedown", handler);
    return function cleanup() {
      document.removeEventListener("mousedown", handler);
    };
  }, []);

  useEffect(function focusEditInput() {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

  function handleToggle(id: string) {
    setExpanded(function toggle(prev) {
      return { ...prev, [id]: prev[id] === false ? true : false };
    });
  }

  function handleContextMenu(e: React.MouseEvent, nodeId: string) {
    setContextMenu({ x: e.clientX, y: e.clientY, nodeId });
    setStatusMenuId(null);
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    if (!outline) return;

    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeNodeId = String(active.id);
    const overNodeId = String(over.id);

    const parentOfActive = getParentId(outline, activeNodeId);
    const parentOfOver = getParentId(outline, overNodeId);

    if (parentOfActive && parentOfActive === parentOfOver) {
      const parent = findNode(outline, parentOfActive);
      if (parent && parent.children) {
        const oldIndex = parent.children.findIndex(function findOld(c) {
          return c.id === activeNodeId;
        });
        const newIndex = parent.children.findIndex(function findNew(c) {
          return c.id === overNodeId;
        });

        if (oldIndex !== -1 && newIndex !== -1) {
          const updated = reorderChildren(outline, parentOfActive, oldIndex, newIndex);
          onOutlineChange(updated);
        }
      }
    }
  }

  function handleEditTitle(nodeId: string) {
    if (!outline) return;
    const node = findNode(outline, nodeId);
    if (node) {
      setEditingId(nodeId);
      setEditTitle(node.title);
    }
    setContextMenu(null);
  }

  function handleSaveTitle() {
    if (!outline || !editingId || !editTitle.trim()) return;
    const updated = updateNode(outline, editingId, { title: editTitle.trim() });
    onOutlineChange(updated);
    setEditingId(null);
    setEditTitle("");
  }

  function handleSetStatus(nodeId: string, status: OutlineNode["status"]) {
    if (!outline) return;
    const updated = updateNode(outline, nodeId, { status });
    onOutlineChange(updated);
    setContextMenu(null);
    setStatusMenuId(null);
  }

  function handleDelete(nodeId: string) {
    if (!outline) return;
    const updated = removeNode(outline, nodeId);
    onOutlineChange(updated);
    setContextMenu(null);
  }

  function handleGenerateDraft(nodeId: string) {
    setContextMenu(null);
    const node = outline ? findNode(outline, nodeId) : null;
    const title = node ? node.title : "this section";
    alert("Generate Draft for \"" + title + "\" — AI generation coming soon.");
  }

  const handleAddNode = useCallback(function handleAdd() {
    if (!outline) return;

    let targetParentId = outline.id;
    if (outline.children && outline.children.length > 0) {
      const lastChild = outline.children[outline.children.length - 1];
      if (lastChild.type === "part") {
        targetParentId = lastChild.id;
      }
    }

    const newNode: OutlineNode = {
      id: generateId(),
      type: "chapter",
      title: "New Chapter",
      status: "idea",
      children: [],
    };

    const updated = addChild(outline, targetParentId, newNode);
    onOutlineChange(updated);

    setEditingId(newNode.id);
    setEditTitle(newNode.title);
  }, [outline, onOutlineChange]);

  if (!outline) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          gap: 12,
          color: "var(--color-text-muted)",
          padding: 24,
          textAlign: "center",
          fontFamily: "var(--font-inter), system-ui, sans-serif",
          fontSize: 13,
        }}
      >
        No outline loaded
      </div>
    );
  }

  const activeNode = activeId ? findNode(outline, activeId) : null;
  const rootChildIds = (outline.children || []).map(function getId(c) {
    return c.id;
  });

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        fontFamily: "var(--font-inter), system-ui, sans-serif",
        fontSize: 12,
        position: "relative",
      }}
    >
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div style={{ flex: 1, overflowY: "auto", padding: "4px 0" }}>
          <SortableContext
            items={rootChildIds}
            strategy={verticalListSortingStrategy}
          >
            <div
              style={{
                padding: "6px 12px",
                fontWeight: 600,
                fontSize: 13,
                color: "var(--color-text)",
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
              onContextMenu={function handleRootCtx(e) {
                e.preventDefault();
                handleContextMenu(e, outline.id);
              }}
            >
              {outline.title}
              <StatusBadge status={outline.status} />
            </div>

            {(outline.children || []).map(function renderChild(child) {
              return (
                <SortableNode
                  key={child.id}
                  node={child}
                  depth={1}
                  expanded={expanded}
                  onToggle={handleToggle}
                  onSelect={function handleSelect(id) {
                    onChapterSelect(id);
                  }}
                  onContextMenu={handleContextMenu}
                  activeId={activeId}
                />
              );
            })}
          </SortableContext>
        </div>

        <DragOverlay>
          {activeNode ? <DragPreview node={activeNode} /> : null}
        </DragOverlay>
      </DndContext>

      <div
        style={{
          borderTop: "1px solid var(--color-border)",
          padding: 8,
          flexShrink: 0,
        }}
      >
        <button
          onClick={handleAddNode}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            width: "100%",
            padding: "6px 0",
            border: "1px dashed var(--color-border)",
            borderRadius: 6,
            background: "none",
            color: "var(--color-text-muted)",
            fontSize: 12,
            fontFamily: "inherit",
            cursor: "pointer",
            transition: "color 150ms, border-color 150ms",
          }}
          onMouseEnter={function handleEnter(e) {
            e.currentTarget.style.color = "var(--color-accent)";
            e.currentTarget.style.borderColor = "var(--color-accent)";
          }}
          onMouseLeave={function handleLeave(e) {
            e.currentTarget.style.color = "var(--color-text-muted)";
            e.currentTarget.style.borderColor = "var(--color-border)";
          }}
        >
          <Plus size={14} />
          Add Chapter
        </button>
      </div>

      {contextMenu && (
        <div
          ref={contextMenuRef}
          style={{
            position: "fixed",
            top: contextMenu.y,
            left: contextMenu.x,
            backgroundColor: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: 8,
            boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
            padding: 4,
            zIndex: 9999,
            minWidth: 160,
            fontSize: 12,
          }}
        >
          <button
            onClick={function handleEdit() {
              handleEditTitle(contextMenu.nodeId);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              width: "100%",
              padding: "6px 10px",
              border: "none",
              background: "none",
              color: "var(--color-text)",
              fontSize: 12,
              fontFamily: "inherit",
              cursor: "pointer",
              borderRadius: 4,
              textAlign: "left",
            }}
            onMouseEnter={function handleEnter(e) {
              e.currentTarget.style.backgroundColor = "var(--color-surface-hover)";
            }}
            onMouseLeave={function handleLeave(e) {
              e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            <Pencil size={13} />
            Edit Title
          </button>

          <div style={{ position: "relative" }}>
            <button
              onClick={function handleStatusToggle() {
                setStatusMenuId(function toggle(prev) {
                  return prev === contextMenu.nodeId ? null : contextMenu.nodeId;
                });
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                width: "100%",
                padding: "6px 10px",
                border: "none",
                background: "none",
                color: "var(--color-text)",
                fontSize: 12,
                fontFamily: "inherit",
                cursor: "pointer",
                borderRadius: 4,
                textAlign: "left",
              }}
              onMouseEnter={function handleEnter(e) {
                e.currentTarget.style.backgroundColor = "var(--color-surface-hover)";
              }}
              onMouseLeave={function handleLeave(e) {
                e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              <CircleDot size={13} />
              Set Status
            </button>

            {statusMenuId === contextMenu.nodeId && (
              <div
                style={{
                  position: "absolute",
                  left: "100%",
                  top: 0,
                  backgroundColor: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 8,
                  boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
                  padding: 4,
                  minWidth: 120,
                  zIndex: 10000,
                }}
              >
                {(["idea", "draft", "revision", "final"] as OutlineNode["status"][]).map(
                  function renderStatus(s) {
                    return (
                      <button
                        key={s}
                        onClick={function handleSet() {
                          handleSetStatus(contextMenu.nodeId, s);
                        }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          width: "100%",
                          padding: "5px 10px",
                          border: "none",
                          background: "none",
                          color: STATUS_COLORS[s],
                          fontSize: 12,
                          fontFamily: "inherit",
                          cursor: "pointer",
                          borderRadius: 4,
                          textAlign: "left",
                        }}
                        onMouseEnter={function handleEnter(e) {
                          e.currentTarget.style.backgroundColor = "var(--color-surface-hover)";
                        }}
                        onMouseLeave={function handleLeave(e) {
                          e.currentTarget.style.backgroundColor = "transparent";
                        }}
                      >
                        <span
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            backgroundColor: STATUS_COLORS[s],
                            flexShrink: 0,
                          }}
                        />
                        {STATUS_LABELS[s]}
                      </button>
                    );
                  },
                )}
              </div>
            )}
          </div>

          <button
            onClick={function handleGenerate() {
              handleGenerateDraft(contextMenu.nodeId);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              width: "100%",
              padding: "6px 10px",
              border: "none",
              background: "none",
              color: "var(--color-accent)",
              fontSize: 12,
              fontFamily: "inherit",
              cursor: "pointer",
              borderRadius: 4,
              textAlign: "left",
            }}
            onMouseEnter={function handleEnter(e) {
              e.currentTarget.style.backgroundColor = "var(--color-surface-hover)";
            }}
            onMouseLeave={function handleLeave(e) {
              e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            <Sparkles size={13} />
            Generate Draft
          </button>

          <div
            style={{
              height: 1,
              backgroundColor: "var(--color-border)",
              margin: "4px 0",
            }}
          />

          <button
            onClick={function handleDel() {
              handleDelete(contextMenu.nodeId);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              width: "100%",
              padding: "6px 10px",
              border: "none",
              background: "none",
              color: "#d9534f",
              fontSize: 12,
              fontFamily: "inherit",
              cursor: "pointer",
              borderRadius: 4,
              textAlign: "left",
            }}
            onMouseEnter={function handleEnter(e) {
              e.currentTarget.style.backgroundColor = "var(--color-surface-hover)";
            }}
            onMouseLeave={function handleLeave(e) {
              e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            <Trash2 size={13} />
            Delete
          </button>
        </div>
      )}

      {editingId && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(0,0,0,0.3)",
            zIndex: 10000,
          }}
          onClick={function handleBackdrop(e) {
            if (e.target === e.currentTarget) {
              setEditingId(null);
              setEditTitle("");
            }
          }}
        >
          <div
            style={{
              backgroundColor: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: 8,
              padding: 16,
              width: 280,
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text)" }}>
              Edit Title
            </span>
            <input
              ref={editInputRef}
              type="text"
              value={editTitle}
              onChange={function handleChange(e) {
                setEditTitle(e.target.value);
              }}
              onKeyDown={function handleKey(e) {
                if (e.key === "Enter") handleSaveTitle();
                if (e.key === "Escape") {
                  setEditingId(null);
                  setEditTitle("");
                }
              }}
              style={{
                fontSize: 13,
                padding: "6px 10px",
                borderRadius: 6,
                border: "1px solid var(--color-border)",
                backgroundColor: "var(--color-bg)",
                color: "var(--color-text)",
                outline: "none",
                fontFamily: "inherit",
              }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}>
              <button
                onClick={function handleCancel() {
                  setEditingId(null);
                  setEditTitle("");
                }}
                style={{
                  fontSize: 12,
                  padding: "5px 12px",
                  borderRadius: 5,
                  border: "1px solid var(--color-border)",
                  background: "none",
                  color: "var(--color-text-muted)",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTitle}
                style={{
                  fontSize: 12,
                  padding: "5px 12px",
                  borderRadius: 5,
                  border: "none",
                  backgroundColor: "var(--color-accent)",
                  color: "#fff",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
