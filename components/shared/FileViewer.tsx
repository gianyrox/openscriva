"use client";

import { X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface FileViewerProps {
  filename: string;
  content: string;
  onClose: () => void;
}

export default function FileViewer({ filename, content, onClose }: FileViewerProps) {
  const isMarkdown = filename.endsWith(".md") || filename.endsWith(".mdx");

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        fontFamily: "var(--font-inter), system-ui, sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 12px",
          borderBottom: "1px solid var(--color-border)",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "var(--color-text)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {filename}
        </span>
        <button
          onClick={onClose}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 24,
            height: 24,
            border: "none",
            background: "none",
            color: "var(--color-text-muted)",
            cursor: "pointer",
            borderRadius: 4,
            flexShrink: 0,
          }}
        >
          <X size={14} />
        </button>
      </div>

      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: 12,
        }}
      >
        {isMarkdown ? (
          <div
            style={{
              fontSize: 13,
              lineHeight: 1.7,
              color: "var(--color-text)",
            }}
          >
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                code: function renderCode({ children, className }) {
                  const isInline = !className;
                  if (isInline) {
                    return (
                      <code
                        style={{
                          fontFamily: "var(--font-jetbrains-mono), monospace",
                          fontSize: 12,
                          backgroundColor: "var(--color-surface-hover)",
                          padding: "1px 4px",
                          borderRadius: 3,
                        }}
                      >
                        {children}
                      </code>
                    );
                  }
                  return (
                    <pre
                      style={{
                        fontFamily: "var(--font-jetbrains-mono), monospace",
                        fontSize: 12,
                        backgroundColor: "var(--color-bg)",
                        padding: 12,
                        borderRadius: 6,
                        overflowX: "auto",
                        margin: "8px 0",
                      }}
                    >
                      <code>{children}</code>
                    </pre>
                  );
                },
                h1: function renderH1({ children }) {
                  return (
                    <h1 style={{ fontSize: 18, fontWeight: 700, margin: "16px 0 8px" }}>
                      {children}
                    </h1>
                  );
                },
                h2: function renderH2({ children }) {
                  return (
                    <h2 style={{ fontSize: 16, fontWeight: 600, margin: "14px 0 6px" }}>
                      {children}
                    </h2>
                  );
                },
                h3: function renderH3({ children }) {
                  return (
                    <h3 style={{ fontSize: 14, fontWeight: 600, margin: "12px 0 4px" }}>
                      {children}
                    </h3>
                  );
                },
                p: function renderP({ children }) {
                  return <p style={{ margin: "6px 0" }}>{children}</p>;
                },
                ul: function renderUl({ children }) {
                  return <ul style={{ margin: "6px 0", paddingLeft: 20 }}>{children}</ul>;
                },
                ol: function renderOl({ children }) {
                  return <ol style={{ margin: "6px 0", paddingLeft: 20 }}>{children}</ol>;
                },
                blockquote: function renderBlockquote({ children }) {
                  return (
                    <blockquote
                      style={{
                        margin: "8px 0",
                        paddingLeft: 12,
                        borderLeft: "3px solid var(--color-border)",
                        color: "var(--color-text-muted)",
                      }}
                    >
                      {children}
                    </blockquote>
                  );
                },
              }}
            >
              {content}
            </ReactMarkdown>
          </div>
        ) : (
          <pre
            style={{
              fontFamily: "var(--font-jetbrains-mono), monospace",
              fontSize: 12,
              lineHeight: 1.6,
              color: "var(--color-text)",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              margin: 0,
            }}
          >
            {content}
          </pre>
        )}
      </div>
    </div>
  );
}
