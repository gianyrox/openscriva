"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Editor, Transforms, Range, Node } from "slate";
import { ReactEditor } from "slate-react";
import {
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Minus,
  ImageIcon,
  Footprints,
} from "lucide-react";

interface CommandItem {
  title: string;
  description: string;
  icon: React.ReactNode;
  action: (editor: any) => void;
}

function getCommandItems(): CommandItem[] {
  return [
    {
      title: "Heading 1",
      description: "Large section heading",
      icon: <Heading1 size={18} />,
      action: function runH1(editor: any) {
        Transforms.setNodes(editor, { type: "h1" } as any);
      },
    },
    {
      title: "Heading 2",
      description: "Medium section heading",
      icon: <Heading2 size={18} />,
      action: function runH2(editor: any) {
        Transforms.setNodes(editor, { type: "h2" } as any);
      },
    },
    {
      title: "Heading 3",
      description: "Small section heading",
      icon: <Heading3 size={18} />,
      action: function runH3(editor: any) {
        Transforms.setNodes(editor, { type: "h3" } as any);
      },
    },
    {
      title: "Bullet List",
      description: "Create an unordered list",
      icon: <List size={18} />,
      action: function runBullet(editor: any) {
        Transforms.setNodes(editor, { type: "ul" } as any);
      },
    },
    {
      title: "Ordered List",
      description: "Create a numbered list",
      icon: <ListOrdered size={18} />,
      action: function runOrdered(editor: any) {
        Transforms.setNodes(editor, { type: "ol" } as any);
      },
    },
    {
      title: "Quote",
      description: "Insert a blockquote",
      icon: <Quote size={18} />,
      action: function runQuote(editor: any) {
        Transforms.setNodes(editor, { type: "blockquote" } as any);
      },
    },
    {
      title: "Divider",
      description: "Insert a horizontal rule",
      icon: <Minus size={18} />,
      action: function runDivider(editor: any) {
        Transforms.insertNodes(editor, {
          type: "hr",
          children: [{ text: "" }],
        } as any);
      },
    },
    {
      title: "Image",
      description: "Insert an image from URL",
      icon: <ImageIcon size={18} />,
      action: function runImage(editor: any) {
        var url = window.prompt("Image URL:");
        if (url) {
          Transforms.insertNodes(editor, {
            type: "img",
            url: url,
            children: [{ text: "" }],
          } as any);
        }
      },
    },
    {
      title: "Footnote",
      description: "Insert a superscript footnote",
      icon: <Footprints size={18} />,
      action: function runFootnote(editor: any) {
        var marks = Editor.marks(editor);
        if ((marks as any)?.superscript) {
          Editor.removeMark(editor, "superscript");
        } else {
          Editor.addMark(editor, "superscript", true);
        }
      },
    },
  ];
}

interface SlashMenuProps {
  editor: any;
  target: Range | null;
  query: string;
  onClose: () => void;
}

function SlashMenu({ editor, target, query, onClose }: SlashMenuProps) {
  var [selectedIndex, setSelectedIndex] = useState(0);
  var menuRef = useRef<HTMLDivElement>(null);
  var allItems = getCommandItems();
  var items = allItems.filter(function filterByQuery(item) {
    return item.title.toLowerCase().includes(query.toLowerCase());
  });

  useEffect(function resetSelection() {
    setSelectedIndex(0);
  }, [query]);

  useEffect(function positionMenu() {
    if (!target || !menuRef.current) return;
    try {
      var domRange = ReactEditor.toDOMRange(editor, target);
      var rect = domRange.getBoundingClientRect();
      menuRef.current.style.top = rect.bottom + 4 + "px";
      menuRef.current.style.left = rect.left + "px";
    } catch {}
  }, [target, editor]);

  var handleKeyDown = useCallback(function onKey(e: KeyboardEvent) {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(function prev(i) {
        return (i + items.length - 1) % items.length;
      });
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(function next(i) {
        return (i + 1) % items.length;
      });
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      var item = items[selectedIndex];
      if (item && target) {
        Transforms.select(editor, target);
        Transforms.delete(editor);
        item.action(editor);
      }
      onClose();
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
      return;
    }
  }, [items, selectedIndex, editor, target, onClose]);

  useEffect(function registerKeys() {
    window.addEventListener("keydown", handleKeyDown, true);
    return function cleanup() {
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [handleKeyDown]);

  if (items.length === 0 || !target) return null;

  return (
    <div
      ref={menuRef}
      style={{
        position: "fixed",
        zIndex: 50,
        backgroundColor: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderRadius: 8,
        boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
        maxWidth: 280,
        overflow: "hidden",
        fontFamily: "var(--font-inter), system-ui, sans-serif",
      }}
    >
      {items.map(function renderItem(item, index) {
        return (
          <button
            key={item.title}
            onClick={function handleClick() {
              if (target) {
                Transforms.select(editor, target);
                Transforms.delete(editor);
                item.action(editor);
              }
              onClose();
            }}
            onMouseEnter={function handleHover() {
              setSelectedIndex(index);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              width: "100%",
              padding: "8px 12px",
              border: "none",
              cursor: "pointer",
              textAlign: "left",
              backgroundColor:
                index === selectedIndex
                  ? "var(--color-surface-hover)"
                  : "transparent",
              color: "var(--color-text)",
            }}
          >
            <span
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 28,
                height: 28,
                borderRadius: 6,
                backgroundColor: "var(--color-bg)",
                color: "var(--color-text-muted)",
                flexShrink: 0,
              }}
            >
              {item.icon}
            </span>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  lineHeight: 1.3,
                }}
              >
                {item.title}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "var(--color-text-muted)",
                  lineHeight: 1.3,
                }}
              >
                {item.description}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

export default SlashMenu;
export { getCommandItems };
export type { CommandItem };
