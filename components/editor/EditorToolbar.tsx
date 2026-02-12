"use client";

import type { Editor } from "@tiptap/react";
import { useAppStore } from "@/store";
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
  editor: Editor | null;
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

export default function EditorToolbar({ editor }: EditorToolbarProps) {
  const isMarkdownView = useAppStore(function selectMarkdownView(s) {
    return s.editor.isMarkdownView;
  });
  const toggleMarkdownView = useAppStore(function selectToggleMd(s) {
    return s.toggleMarkdownView;
  });

  function handleImage() {
    if (!editor) return;
    const url = window.prompt("Image URL:");
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
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
        isActive={editor.isActive("bold")}
        onClick={function toggleBold() {
          editor.chain().focus().toggleBold().run();
        }}
        title="Bold"
      />
      <ToolbarButton
        icon={<Italic size={15} />}
        isActive={editor.isActive("italic")}
        onClick={function toggleItalic() {
          editor.chain().focus().toggleItalic().run();
        }}
        title="Italic"
      />
      <ToolbarButton
        icon={<Strikethrough size={15} />}
        isActive={editor.isActive("strike")}
        onClick={function toggleStrike() {
          editor.chain().focus().toggleStrike().run();
        }}
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
        isActive={editor.isActive("heading", { level: 1 })}
        onClick={function toggleH1() {
          editor.chain().focus().toggleHeading({ level: 1 }).run();
        }}
        title="Heading 1"
      />
      <ToolbarButton
        icon={<Heading2 size={15} />}
        isActive={editor.isActive("heading", { level: 2 })}
        onClick={function toggleH2() {
          editor.chain().focus().toggleHeading({ level: 2 }).run();
        }}
        title="Heading 2"
      />
      <ToolbarButton
        icon={<Heading3 size={15} />}
        isActive={editor.isActive("heading", { level: 3 })}
        onClick={function toggleH3() {
          editor.chain().focus().toggleHeading({ level: 3 }).run();
        }}
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
        isActive={editor.isActive("blockquote")}
        onClick={function toggleQuote() {
          editor.chain().focus().toggleBlockquote().run();
        }}
        title="Quote"
      />
      <ToolbarButton
        icon={<List size={15} />}
        isActive={editor.isActive("bulletList")}
        onClick={function toggleBullet() {
          editor.chain().focus().toggleBulletList().run();
        }}
        title="Bullet List"
      />
      <ToolbarButton
        icon={<ListOrdered size={15} />}
        isActive={editor.isActive("orderedList")}
        onClick={function toggleOrdered() {
          editor.chain().focus().toggleOrderedList().run();
        }}
        title="Ordered List"
      />
      <ToolbarButton
        icon={<Minus size={15} />}
        isActive={false}
        onClick={function insertHr() {
          editor.chain().focus().setHorizontalRule().run();
        }}
        title="Horizontal Rule"
      />
      <ToolbarButton
        icon={<Code size={15} />}
        isActive={editor.isActive("code")}
        onClick={function toggleCode() {
          editor.chain().focus().toggleCode().run();
        }}
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
