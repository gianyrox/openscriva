"use client";

import { useEffect, useRef, useMemo, useCallback } from "react";
import {
  Plate,
  PlateContent,
  PlateElement,
  PlateLeaf,
  usePlateEditor,
  createPlateEditor,
  createPlatePlugin,
} from "platejs/react";
import {
  BoldPlugin,
  ItalicPlugin,
  StrikethroughPlugin,
  UnderlinePlugin,
  CodePlugin,
  SuperscriptPlugin,
  HighlightPlugin,
  H1Plugin,
  H2Plugin,
  H3Plugin,
  BlockquotePlugin,
  HorizontalRulePlugin,
} from "@platejs/basic-nodes/react";
import { ListPlugin } from "@platejs/list/react";
import { LinkPlugin } from "@platejs/link/react";
import { ImagePlugin } from "@platejs/media/react";
import { MarkdownPlugin } from "@platejs/markdown";
import {
  AutoformatPlugin,
  autoformatSmartQuotes,
  autoformatPunctuation,
} from "@platejs/autoformat";
import remarkGfm from "remark-gfm";
import { useAppStore } from "@/store";
import CodeBlockElement from "./elements/CodeBlockElement";
import CodeLineElement from "./elements/CodeLineElement";

function BoldLeaf(props: any) {
  return <PlateLeaf {...props} as="strong" />;
}

function ItalicLeaf(props: any) {
  return <PlateLeaf {...props} as="em" />;
}

function StrikethroughLeaf(props: any) {
  return <PlateLeaf {...props} as="s" />;
}

function UnderlineLeaf(props: any) {
  return <PlateLeaf {...props} as="u" />;
}

function CodeLeaf(props: any) {
  return (
    <PlateLeaf
      {...props}
      as="code"
      style={{
        backgroundColor: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderRadius: 3,
        padding: "1px 4px",
        fontFamily: "var(--font-jetbrains-mono), monospace",
        fontSize: "0.85em",
      }}
    />
  );
}

function SuperscriptLeaf(props: any) {
  return <PlateLeaf {...props} as="sup" />;
}

function HighlightLeaf(props: any) {
  return (
    <PlateLeaf
      {...props}
      as="mark"
      style={{
        backgroundColor: "color-mix(in srgb, var(--color-accent) 20%, transparent)",
        borderRadius: 2,
        padding: "1px 2px",
      }}
    />
  );
}

function suggestStyle(element: any): Record<string, any> {
  if (element?._suggestionOriginal) {
    return {
      textDecoration: "line-through",
      opacity: 0.45,
      borderLeft: "3px solid var(--color-error, #e53e3e)",
      paddingLeft: 12,
      backgroundColor: "color-mix(in srgb, var(--color-error, #e53e3e) 5%, transparent)",
      borderRadius: 4,
    };
  }
  if (element?._suggestion) {
    return {
      borderLeft: "3px solid var(--color-success, #38a169)",
      paddingLeft: 12,
      backgroundColor: "color-mix(in srgb, var(--color-success, #38a169) 5%, transparent)",
      borderRadius: 4,
    };
  }
  return {};
}

function H1Element(props: any) {
  return (
    <PlateElement
      {...props}
      as="h1"
      style={{
        fontSize: "1.8em",
        fontWeight: 700,
        lineHeight: 1.3,
        margin: "1em 0 0.4em",
        ...suggestStyle(props.element),
      }}
    />
  );
}

function H2Element(props: any) {
  return (
    <PlateElement
      {...props}
      as="h2"
      style={{
        fontSize: "1.4em",
        fontWeight: 600,
        lineHeight: 1.35,
        margin: "0.9em 0 0.3em",
        ...suggestStyle(props.element),
      }}
    />
  );
}

function H3Element(props: any) {
  return (
    <PlateElement
      {...props}
      as="h3"
      style={{
        fontSize: "1.15em",
        fontWeight: 600,
        lineHeight: 1.4,
        margin: "0.8em 0 0.25em",
        ...suggestStyle(props.element),
      }}
    />
  );
}

function BlockquoteElement(props: any) {
  var extra = suggestStyle(props.element);
  var hasSuggest = props.element?._suggestion || props.element?._suggestionOriginal;
  return (
    <PlateElement
      {...props}
      as="blockquote"
      style={{
        borderLeft: hasSuggest ? undefined : "3px solid var(--color-accent)",
        paddingLeft: "1em",
        marginLeft: 0,
        marginRight: 0,
        fontStyle: "italic",
        color: "var(--color-text-muted)",
        ...extra,
      }}
    />
  );
}

function HrElement(props: any) {
  return (
    <PlateElement {...props}>
      <hr
        contentEditable={false}
        style={{
          border: "none",
          borderTop: "1px solid var(--color-border)",
          margin: "1.5em 0",
        }}
      />
      {props.children}
    </PlateElement>
  );
}

function LinkElement(props: any) {
  return (
    <PlateElement
      {...props}
      as="a"
      style={{
        color: "var(--color-accent)",
        textDecoration: "underline",
        textUnderlineOffset: "2px",
        cursor: "pointer",
      }}
    />
  );
}

function ImageElement(props: any) {
  var element = props.element;
  return (
    <PlateElement {...props}>
      <img
        src={element.url}
        alt=""
        contentEditable={false}
        style={{
          maxWidth: "100%",
          borderRadius: 4,
          margin: "0.5em 0",
        }}
      />
      {props.children}
    </PlateElement>
  );
}

function TableElement(props: any) {
  return (
    <PlateElement
      {...props}
      as="table"
      style={{
        borderCollapse: "collapse",
        width: "100%",
        margin: "1em 0",
        fontSize: "0.9em",
        ...suggestStyle(props.element),
      }}
    />
  );
}

function TableRowElement(props: any) {
  return <PlateElement {...props} as="tr" />;
}

function TableCellElement(props: any) {
  return (
    <PlateElement
      {...props}
      as="td"
      style={{
        border: "1px solid var(--color-border)",
        padding: "8px 12px",
        textAlign: "left",
      }}
    />
  );
}

function TableHeaderElement(props: any) {
  return (
    <PlateElement
      {...props}
      as="th"
      style={{
        border: "1px solid var(--color-border)",
        padding: "8px 12px",
        fontWeight: 600,
        backgroundColor: "var(--color-surface)",
        textAlign: "left",
      }}
    />
  );
}

function ParagraphElement(props: any) {
  var element = props.element;
  var indent = element.indent || 0;
  var listStyleType = element.listStyleType;

  if (listStyleType) {
    return (
      <PlateElement
        {...props}
        as="li"
        style={{
          listStyleType: listStyleType,
          marginLeft: indent * 24,
          display: "list-item",
          ...suggestStyle(element),
        }}
      />
    );
  }

  return <PlateElement {...props} as="p" style={suggestStyle(element)} />;
}

var ParagraphPlugin = createPlatePlugin({
  key: "p",
  node: {
    isElement: true,
    type: "p",
    component: ParagraphElement,
  },
});

var CustomTablePlugin = createPlatePlugin({
  key: "table",
  node: { isElement: true, type: "table", component: TableElement },
});

var TableRowPlugin = createPlatePlugin({
  key: "tr",
  node: { isElement: true, type: "tr", component: TableRowElement },
});

var TableCellPlugin = createPlatePlugin({
  key: "td",
  node: { isElement: true, type: "td", component: TableCellElement },
});

var TableHeaderPlugin = createPlatePlugin({
  key: "th",
  node: { isElement: true, type: "th", component: TableHeaderElement },
});

var CodeBlockPlugin = createPlatePlugin({
  key: "code_block",
  node: {
    isElement: true,
    type: "code_block",
    component: CodeBlockElement,
  },
});

var CodeLinePlugin = createPlatePlugin({
  key: "code_line",
  node: {
    isElement: true,
    type: "code_line",
    component: CodeLineElement,
  },
});

var allPlugins = [
  BoldPlugin.withComponent(BoldLeaf),
  ItalicPlugin.withComponent(ItalicLeaf),
  StrikethroughPlugin.withComponent(StrikethroughLeaf),
  UnderlinePlugin.withComponent(UnderlineLeaf),
  CodePlugin.withComponent(CodeLeaf),
  SuperscriptPlugin.withComponent(SuperscriptLeaf),
  HighlightPlugin.withComponent(HighlightLeaf),
  H1Plugin.withComponent(H1Element),
  H2Plugin.withComponent(H2Element),
  H3Plugin.withComponent(H3Element),
  BlockquotePlugin.withComponent(BlockquoteElement),
  HorizontalRulePlugin.withComponent(HrElement),
  CustomTablePlugin,
  TableRowPlugin,
  TableCellPlugin,
  TableHeaderPlugin,
  CodeBlockPlugin,
  CodeLinePlugin,
  ParagraphPlugin,
  ListPlugin,
  LinkPlugin.configure({ options: { forceSubmit: true } }).withComponent(LinkElement),
  ImagePlugin.withComponent(ImageElement),
  MarkdownPlugin.configure({ options: { remarkPlugins: [remarkGfm] } }),
  AutoformatPlugin.configure({
    options: {
      rules: [...autoformatSmartQuotes, ...autoformatPunctuation],
    },
  }),
];

interface PlateEditorProps {
  initialContent: string;
  onContentChange: (markdown: string) => void;
  onEditor?: (editor: any) => void;
  editable?: boolean;
  children?: React.ReactNode;
}

function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

function extractAllText(nodes: any[]): string {
  var result = "";
  for (var node of nodes) {
    if (node.text !== undefined) {
      result += node.text;
    }
    if (node.children) {
      result += extractAllText(node.children);
    }
  }
  return result;
}

export default function PlateEditor({
  initialContent,
  onContentChange,
  onEditor,
  editable = true,
  children,
}: PlateEditorProps) {
  var setWordCount = useAppStore(function selectSetWordCount(s) {
    return s.setWordCount;
  });

  var onContentChangeRef = useRef(onContentChange);
  onContentChangeRef.current = onContentChange;

  var initialValue = useMemo(function deserializeInitial() {
    if (!initialContent) {
      return [{ type: "p", children: [{ text: "" }] }];
    }
    try {
      var tempEditor = createPlateEditor({ plugins: allPlugins });
      var value = tempEditor.api.markdown.deserialize(initialContent);
      if (value && value.length > 0) return value;
    } catch {}
    return [{ type: "p", children: [{ text: "" }] }];
  }, [initialContent]);

  var editor = usePlateEditor({
    plugins: allPlugins,
    value: initialValue,
  });

  useEffect(function notifyEditorReady() {
    if (onEditor) {
      onEditor(editor);
    }
  }, [editor, onEditor]);

  useEffect(function countInitialWords() {
    var text = extractAllText(editor.children);
    setWordCount(countWords(text));
  }, [editor, setWordCount]);

  var handleChange = useCallback(function onChange() {
    try {
      var md = editor.api.markdown.serialize();
      var text = extractAllText(editor.children);
      setWordCount(countWords(text));
      onContentChangeRef.current(md);
    } catch {}
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
      <Plate editor={editor} onChange={handleChange}>
        <PlateContent
          readOnly={!editable}
          placeholder="Begin writing..."
          style={{
            outline: "none",
            minHeight: 200,
          }}
        />
        {children}
      </Plate>
    </div>
  );
}

export { allPlugins };
