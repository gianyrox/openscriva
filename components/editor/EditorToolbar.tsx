"use client";

import { useAppStore } from "@/store";
import { Editor, Element } from "slate";
import {
  Bold,
  Italic,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  Quote,
  List,
  ListOrdered,
  Minus,
  Code,
  ImageIcon,
  Code2,
} from "lucide-react";

interface EditorToolbarProps {
  editor: any | null;
}

interface ToolbarButtonProps {
  icon: React.ReactNode;
  isActive?: boolean;
  onClick: () => void;
  title: string;
}

function ToolbarButton({ icon, isActive, onClick, title }: ToolbarButtonProps) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 28,
        height: 28,
        borderRadius: 4,
        border: "none",
        cursor: "pointer",
        backgroundColor: isActive ? "var(--color-accent)" : "transparent",
        color: isActive ? "#ffffff" : "var(--color-text-muted)",
        padding: 0,
        transition: "background-color 150ms ease",
      }}
      onMouseEnter={function handleEnter(e) {
        if (!isActive) {
          e.currentTarget.style.backgroundColor = "var(--color-surface-hover)";
        }
      }}
      onMouseLeave={function handleLeave(e) {
        if (!isActive) {
          e.currentTarget.style.backgroundColor = "transparent";
        }
      }}
    >
      {icon}
    </button>
  );
}

function isMarkActive(editor: any, mark: string): boolean {
  try {
    var marks = Editor.marks(editor);
    return !!(marks as any)?.[mark];
  } catch {
    return false;
  }
}

function isBlockActive(editor: any, type: string): boolean {
  try {
    var nodes = Array.from(
      Editor.nodes(editor, {
        match: function matchBlock(n: any) {
          return !Editor.isEditor(n) && Element.isElement(n) && (n as any).type === type;
        },
      })
    );
    return nodes.length > 0;
  } catch {
    return false;
  }
}

function toggleMark(editor: any, mark: string) {
  try {
    var marks = Editor.marks(editor);
    if ((marks as any)?.[mark]) {
      Editor.removeMark(editor, mark);
    } else {
      Editor.addMark(editor, mark, true);
    }
  } catch {}
}

function toggleBlock(editor: any, type: string) {
  try {
    var isActive = isBlockActive(editor, type);
    var { Transforms } = require("slate");
    if (isActive) {
      Transforms.setNodes(editor, { type: "p" } as any);
    } else {
      Transforms.setNodes(editor, { type } as any);
    }
  } catch {}
}

export default function EditorToolbar({ editor }: EditorToolbarProps) {
  var isMarkdownView = useAppStore(function selectMarkdownView(s) {
    return s.editor.isMarkdownView;
  });
  var toggleMarkdownView = useAppStore(function selectToggleMd(s) {
    return s.toggleMarkdownView;
  });

  function handleImage() {
    if (!editor) return;
    var url = window.prompt("Image URL:");
    if (url) {
      try {
        var { Transforms } = require("slate");
        Transforms.insertNodes(editor, {
          type: "img",
          url: url,
          children: [{ text: "" }],
        } as any);
      } catch {}
    }
  }

  if (!editor) {
    return null;
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: 2,
        padding: "4px 8px",
        backgroundColor: "var(--color-surface)",
        borderBottom: "1px solid var(--color-border)",
        fontFamily: "var(--font-inter), system-ui, sans-serif",
      }}
    >
      <ToolbarButton
        icon={<Bold size={15} />}
        isActive={isMarkActive(editor, "bold")}
        onClick={function clickBold() { toggleMark(editor, "bold"); }}
        title="Bold"
      />
      <ToolbarButton
        icon={<Italic size={15} />}
        isActive={isMarkActive(editor, "italic")}
        onClick={function clickItalic() { toggleMark(editor, "italic"); }}
        title="Italic"
      />
      <ToolbarButton
        icon={<Strikethrough size={15} />}
        isActive={isMarkActive(editor, "strikethrough")}
        onClick={function clickStrike() { toggleMark(editor, "strikethrough"); }}
        title="Strikethrough"
      />

      <div
        style={{
          width: 1,
          height: 16,
          backgroundColor: "var(--color-border)",
          margin: "0 4px",
        }}
      />

      <ToolbarButton
        icon={<Heading1 size={15} />}
        isActive={isBlockActive(editor, "h1")}
        onClick={function clickH1() { toggleBlock(editor, "h1"); }}
        title="Heading 1"
      />
      <ToolbarButton
        icon={<Heading2 size={15} />}
        isActive={isBlockActive(editor, "h2")}
        onClick={function clickH2() { toggleBlock(editor, "h2"); }}
        title="Heading 2"
      />
      <ToolbarButton
        icon={<Heading3 size={15} />}
        isActive={isBlockActive(editor, "h3")}
        onClick={function clickH3() { toggleBlock(editor, "h3"); }}
        title="Heading 3"
      />

      <div
        style={{
          width: 1,
          height: 16,
          backgroundColor: "var(--color-border)",
          margin: "0 4px",
        }}
      />

      <ToolbarButton
        icon={<Quote size={15} />}
        isActive={isBlockActive(editor, "blockquote")}
        onClick={function clickQuote() { toggleBlock(editor, "blockquote"); }}
        title="Quote"
      />
      <ToolbarButton
        icon={<List size={15} />}
        isActive={isBlockActive(editor, "ul")}
        onClick={function clickBullet() { toggleBlock(editor, "ul"); }}
        title="Bullet List"
      />
      <ToolbarButton
        icon={<ListOrdered size={15} />}
        isActive={isBlockActive(editor, "ol")}
        onClick={function clickOrdered() { toggleBlock(editor, "ol"); }}
        title="Ordered List"
      />
      <ToolbarButton
        icon={<Minus size={15} />}
        isActive={false}
        onClick={function clickHr() {
          try {
            var { Transforms } = require("slate");
            Transforms.insertNodes(editor, {
              type: "hr",
              children: [{ text: "" }],
            } as any);
          } catch {}
        }}
        title="Horizontal Rule"
      />
      <ToolbarButton
        icon={<Code size={15} />}
        isActive={isMarkActive(editor, "code")}
        onClick={function clickCode() { toggleMark(editor, "code"); }}
        title="Code"
      />
      <ToolbarButton
        icon={<ImageIcon size={15} />}
        isActive={false}
        onClick={handleImage}
        title="Image"
      />

      <div style={{ flex: 1 }} />

      <ToolbarButton
        icon={<Code2 size={15} />}
        isActive={isMarkdownView}
        onClick={toggleMarkdownView}
        title="Markdown View"
      />
    </div>
  );
}
