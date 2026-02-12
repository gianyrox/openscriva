"use client";

import { useEffect, useRef, useCallback } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Highlight from "@tiptap/extension-highlight";
import Typography from "@tiptap/extension-typography";
import Image from "@tiptap/extension-image";
import Superscript from "@tiptap/extension-superscript";
import TiptapLink from "@tiptap/extension-link";
import TextStyle from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Underline from "@tiptap/extension-underline";
import { Markdown } from "tiptap-markdown";
import { useAppStore } from "@/store";
import { SlashCommands, suggestion } from "./SlashCommand";

interface TiptapEditorProps {
  initialContent: string;
  onContentChange: (markdown: string) => void;
  onEditor?: (editor: Editor | null) => void;
  editable?: boolean;
}

export default function TiptapEditor({
  initialContent,
  onContentChange,
  onEditor,
  editable = true,
}: TiptapEditorProps) {
  const setWordCount = useAppStore(function selectSetWordCount(s) {
    return s.setWordCount;
  });

  const onContentChangeRef = useRef(onContentChange);
  onContentChangeRef.current = onContentChange;

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Placeholder.configure({
        placeholder: "Begin writing...",
      }),
      Highlight.configure({ multicolor: true }),
      Typography,
      Image.configure({
        inline: false,
        allowBase64: true,
      }),
      Superscript,
      Markdown.configure({
        html: true,
        transformPastedText: true,
        transformCopiedText: true,
      }),
      SlashCommands.configure({
        suggestion,
      }),
      TiptapLink.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "tiptap-link",
        },
      }),
      TextStyle,
      Color,
      Underline,
    ],
    content: initialContent,
    editable,
    onUpdate: function handleUpdate({ editor: ed }) {
      const md = ed.storage.markdown.getMarkdown();
      const text = ed.state.doc.textContent;
      const words = text.split(/\s+/).filter(Boolean).length;
      setWordCount(words);
      onContentChangeRef.current(md);
    },
    editorProps: {
      attributes: {
        class: "tiptap-editor",
      },
    },
  });

  useEffect(function notifyEditorReady() {
    if (onEditor) {
      onEditor(editor);
    }
  }, [editor, onEditor]);

  useEffect(function syncEditable() {
    if (editor) {
      editor.setEditable(editable);
    }
  }, [editor, editable]);

  useEffect(function countInitialWords() {
    if (editor && !editor.isDestroyed) {
      const text = editor.state.doc.textContent;
      const words = text.split(/\s+/).filter(Boolean).length;
      setWordCount(words);
    }
  }, [editor, setWordCount]);

  return (
    <div
      style={{
        fontFamily: "var(--font-literata), Georgia, serif",
        fontSize: 18,
        lineHeight: 1.8,
        backgroundColor: "var(--color-bg)",
        color: "var(--color-text)",
        maxWidth: 680,
        margin: "0 auto",
        padding: "3rem 2rem 6rem",
        minHeight: "100%",
      }}
    >
      <EditorContent editor={editor} />
    </div>
  );
}

export type { TiptapEditorProps };
