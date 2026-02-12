"use client";

import {
  useState,
  useEffect,
  useCallback,
  useLayoutEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
} from "react";
import { createRoot } from "react-dom/client";
import { Extension } from "@tiptap/core";
import { ReactRenderer } from "@tiptap/react";
import Suggestion, { type SuggestionOptions } from "@tiptap/suggestion";
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
import type { Editor, Range } from "@tiptap/core";

interface CommandItem {
  title: string;
  description: string;
  icon: React.ReactNode;
  command: (props: { editor: Editor; range: Range }) => void;
}

function getCommandItems(): CommandItem[] {
  return [
    {
      title: "Heading 1",
      description: "Large section heading",
      icon: <Heading1 size={18} />,
      command: function runH1({ editor, range }) {
        editor.chain().focus().deleteRange(range).setNode("heading", { level: 1 }).run();
      },
    },
    {
      title: "Heading 2",
      description: "Medium section heading",
      icon: <Heading2 size={18} />,
      command: function runH2({ editor, range }) {
        editor.chain().focus().deleteRange(range).setNode("heading", { level: 2 }).run();
      },
    },
    {
      title: "Heading 3",
      description: "Small section heading",
      icon: <Heading3 size={18} />,
      command: function runH3({ editor, range }) {
        editor.chain().focus().deleteRange(range).setNode("heading", { level: 3 }).run();
      },
    },
    {
      title: "Bullet List",
      description: "Create an unordered list",
      icon: <List size={18} />,
      command: function runBullet({ editor, range }) {
        editor.chain().focus().deleteRange(range).toggleBulletList().run();
      },
    },
    {
      title: "Ordered List",
      description: "Create a numbered list",
      icon: <ListOrdered size={18} />,
      command: function runOrdered({ editor, range }) {
        editor.chain().focus().deleteRange(range).toggleOrderedList().run();
      },
    },
    {
      title: "Quote",
      description: "Insert a blockquote",
      icon: <Quote size={18} />,
      command: function runQuote({ editor, range }) {
        editor.chain().focus().deleteRange(range).toggleBlockquote().run();
      },
    },
    {
      title: "Divider",
      description: "Insert a horizontal rule",
      icon: <Minus size={18} />,
      command: function runDivider({ editor, range }) {
        editor.chain().focus().deleteRange(range).setHorizontalRule().run();
      },
    },
    {
      title: "Image",
      description: "Insert an image from URL",
      icon: <ImageIcon size={18} />,
      command: function runImage({ editor, range }) {
        const url = window.prompt("Image URL:");
        if (url) {
          editor.chain().focus().deleteRange(range).setImage({ src: url }).run();
        }
      },
    },
    {
      title: "Footnote",
      description: "Insert a superscript footnote",
      icon: <Footprints size={18} />,
      command: function runFootnote({ editor, range }) {
        editor.chain().focus().deleteRange(range).toggleSuperscript().run();
      },
    },
  ];
}

interface CommandListProps {
  items: CommandItem[];
  command: (item: CommandItem) => void;
}

interface CommandListRef {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

const CommandList = forwardRef<CommandListRef, CommandListProps>(
  function CommandList({ items, command }, ref) {
    const [selectedIndex, setSelectedIndex] = useState(0);

    useEffect(function resetOnItemsChange() {
      setSelectedIndex(0);
    }, [items]);

    useImperativeHandle(ref, function exposeKeyHandler() {
      return {
        onKeyDown: function handleKeyDown({ event }: { event: KeyboardEvent }) {
          if (event.key === "ArrowUp") {
            setSelectedIndex(function prevIndex(i) {
              return (i + items.length - 1) % items.length;
            });
            return true;
          }
          if (event.key === "ArrowDown") {
            setSelectedIndex(function nextIndex(i) {
              return (i + 1) % items.length;
            });
            return true;
          }
          if (event.key === "Enter") {
            const item = items[selectedIndex];
            if (item) {
              command(item);
            }
            return true;
          }
          return false;
        },
      };
    }, [items, selectedIndex, command]);

    if (items.length === 0) {
      return null;
    }

    return (
      <div
        style={{
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
                command(item);
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
  },
);

export const suggestion: Omit<SuggestionOptions, "editor"> = {
  items: function getItems({ query }: { query: string }) {
    return getCommandItems().filter(function filterByQuery(item) {
      return item.title.toLowerCase().includes(query.toLowerCase());
    });
  },
  render: function renderSuggestion() {
    let renderer: ReactRenderer<CommandListRef> | null = null;
    let popup: HTMLDivElement | null = null;

    return {
      onStart: function handleStart(props: any) {
        renderer = new ReactRenderer(CommandList, {
          props,
          editor: props.editor,
        });

        popup = document.createElement("div");
        popup.style.position = "absolute";
        popup.style.zIndex = "50";
        document.body.appendChild(popup);
        popup.appendChild(renderer.element);

        const { clientRect } = props;
        if (clientRect) {
          const rect = clientRect();
          if (rect && popup) {
            popup.style.left = `${rect.left}px`;
            popup.style.top = `${rect.bottom + 4}px`;
          }
        }
      },
      onUpdate: function handleUpdate(props: any) {
        if (renderer) {
          renderer.updateProps(props);
        }

        const { clientRect } = props;
        if (clientRect && popup) {
          const rect = clientRect();
          if (rect) {
            popup.style.left = `${rect.left}px`;
            popup.style.top = `${rect.bottom + 4}px`;
          }
        }
      },
      onKeyDown: function handleKeyDown(props: any) {
        if (props.event.key === "Escape") {
          if (popup) {
            popup.remove();
            popup = null;
          }
          if (renderer) {
            renderer.destroy();
            renderer = null;
          }
          return true;
        }
        if (renderer?.ref) {
          return renderer.ref.onKeyDown(props);
        }
        return false;
      },
      onExit: function handleExit() {
        if (popup) {
          popup.remove();
          popup = null;
        }
        if (renderer) {
          renderer.destroy();
          renderer = null;
        }
      },
    };
  },
  char: "/",
  startOfLine: true,
};

export const SlashCommands = Extension.create({
  name: "slashCommands",

  addOptions() {
    return {
      suggestion: {
        char: "/",
        startOfLine: true,
        command: function executeCommand({
          editor,
          range,
          props,
        }: {
          editor: Editor;
          range: Range;
          props: CommandItem;
        }) {
          props.command({ editor, range });
        },
      } as Omit<SuggestionOptions, "editor">,
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ];
  },
});
