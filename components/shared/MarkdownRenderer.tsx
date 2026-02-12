"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";

interface MarkdownRendererProps {
  content: string;
  className?: string;
  onClick?: (paragraphIndex: number) => void;
}

export default function MarkdownRenderer({
  content,
  className,
  onClick,
}: MarkdownRendererProps) {
  let paragraphIndex = -1;

  const components: Components = {
    h1: function H1({ children }) {
      return (
        <h1
          style={{
            fontFamily: "var(--font-literata), Georgia, serif",
            fontSize: 28,
            fontWeight: 700,
            lineHeight: 1.3,
            marginTop: "2rem",
            marginBottom: "1rem",
            color: "var(--color-text)",
          }}
        >
          {children}
        </h1>
      );
    },
    h2: function H2({ children }) {
      return (
        <h2
          style={{
            fontFamily: "var(--font-literata), Georgia, serif",
            fontSize: 22,
            fontWeight: 600,
            lineHeight: 1.35,
            marginTop: "1.8rem",
            marginBottom: "0.8rem",
            color: "var(--color-text)",
          }}
        >
          {children}
        </h2>
      );
    },
    h3: function H3({ children }) {
      return (
        <h3
          style={{
            fontFamily: "var(--font-literata), Georgia, serif",
            fontSize: 18,
            fontWeight: 600,
            lineHeight: 1.4,
            marginTop: "1.5rem",
            marginBottom: "0.6rem",
            color: "var(--color-text)",
          }}
        >
          {children}
        </h3>
      );
    },
    p: function P({ children }) {
      paragraphIndex++;
      const idx = paragraphIndex;
      return (
        <p
          onClick={
            onClick
              ? function handleClick() {
                  onClick(idx);
                }
              : undefined
          }
          style={{
            fontFamily: "var(--font-literata), Georgia, serif",
            fontSize: 18,
            lineHeight: 1.9,
            marginBottom: "1.2rem",
            color: "var(--color-text)",
            cursor: onClick ? "pointer" : "default",
            transition: "background-color 150ms ease",
            borderRadius: 4,
            padding: onClick ? "2px 4px" : undefined,
            margin: onClick ? "-2px -4px 1.2rem" : undefined,
          }}
          onMouseEnter={
            onClick
              ? function handleEnter(e) {
                  e.currentTarget.style.backgroundColor =
                    "var(--color-surface)";
                }
              : undefined
          }
          onMouseLeave={
            onClick
              ? function handleLeave(e) {
                  e.currentTarget.style.backgroundColor = "transparent";
                }
              : undefined
          }
        >
          {children}
        </p>
      );
    },
    blockquote: function Blockquote({ children }) {
      return (
        <blockquote
          style={{
            borderLeft: "3px solid var(--color-accent)",
            paddingLeft: "1.2rem",
            fontStyle: "italic",
            color: "var(--color-text-muted)",
            margin: "1.2rem 0",
            fontFamily: "var(--font-literata), Georgia, serif",
            fontSize: 18,
            lineHeight: 1.9,
          }}
        >
          {children}
        </blockquote>
      );
    },
    img: function Img({ src, alt }) {
      return (
        <figure
          style={{
            margin: "2rem auto",
            textAlign: "center",
            maxWidth: "100%",
          }}
        >
          <img
            src={src}
            alt={alt || ""}
            style={{
              maxWidth: "100%",
              borderRadius: 8,
              display: "block",
              margin: "0 auto",
            }}
          />
          {alt && (
            <figcaption
              style={{
                marginTop: "0.5rem",
                fontSize: 14,
                color: "var(--color-text-muted)",
                fontFamily: "var(--font-inter), system-ui, sans-serif",
                fontStyle: "italic",
              }}
            >
              {alt}
            </figcaption>
          )}
        </figure>
      );
    },
    code: function Code({ className: codeClass, children }) {
      const isBlock = codeClass && codeClass.startsWith("language-");
      if (isBlock) {
        return (
          <pre
            style={{
              backgroundColor: "var(--color-surface)",
              borderRadius: 8,
              padding: "1rem",
              overflowX: "auto",
              margin: "1.2rem 0",
            }}
          >
            <code
              style={{
                fontFamily: "var(--font-jetbrains-mono), monospace",
                fontSize: 14,
                lineHeight: 1.6,
                color: "var(--color-text)",
              }}
            >
              {children}
            </code>
          </pre>
        );
      }
      return (
        <code
          style={{
            backgroundColor: "var(--color-surface)",
            padding: "2px 6px",
            borderRadius: 4,
            fontFamily: "var(--font-jetbrains-mono), monospace",
            fontSize: "0.9em",
          }}
        >
          {children}
        </code>
      );
    },
    pre: function Pre({ children }) {
      return <>{children}</>;
    },
    a: function Anchor({ href, children }) {
      const isFootnoteRef =
        typeof href === "string" && href.startsWith("#user-content-fn-");
      const isFootnoteBack =
        typeof href === "string" && href.startsWith("#user-content-fnref-");

      if (isFootnoteRef) {
        const noteId = href.replace("#user-content-fn-", "");
        return (
          <sup>
            <a
              href={href}
              id={"user-content-fnref-" + noteId}
              style={{
                color: "var(--color-accent)",
                textDecoration: "none",
                fontSize: 13,
                fontFamily: "var(--font-inter), system-ui, sans-serif",
              }}
            >
              {children}
            </a>
          </sup>
        );
      }

      if (isFootnoteBack) {
        return (
          <a
            href={href}
            style={{
              color: "var(--color-accent)",
              textDecoration: "none",
              fontSize: 12,
            }}
          >
            {children}
          </a>
        );
      }

      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: "var(--color-accent)",
            textDecoration: "none",
            transition: "text-decoration 150ms ease",
          }}
          onMouseEnter={function handleEnter(e) {
            e.currentTarget.style.textDecoration = "underline";
          }}
          onMouseLeave={function handleLeave(e) {
            e.currentTarget.style.textDecoration = "none";
          }}
        >
          {children}
        </a>
      );
    },
    ul: function UL({ children }) {
      return (
        <ul
          style={{
            paddingLeft: "1.5rem",
            marginBottom: "1rem",
            fontFamily: "var(--font-literata), Georgia, serif",
            fontSize: 18,
            lineHeight: 1.9,
          }}
        >
          {children}
        </ul>
      );
    },
    ol: function OL({ children }) {
      return (
        <ol
          style={{
            paddingLeft: "1.5rem",
            marginBottom: "1rem",
            fontFamily: "var(--font-literata), Georgia, serif",
            fontSize: 18,
            lineHeight: 1.9,
          }}
        >
          {children}
        </ol>
      );
    },
    li: function LI({ children }) {
      return (
        <li style={{ marginBottom: "0.3rem" }}>{children}</li>
      );
    },
    hr: function HR() {
      return (
        <div
          style={{
            textAlign: "center",
            margin: "2.5rem 0",
            color: "var(--color-text-muted)",
            fontSize: 18,
            letterSpacing: "0.5em",
          }}
        >
          · · ·
        </div>
      );
    },
    section: function Section({ children, ...props }) {
      const dataFootnotes = (props as Record<string, unknown>)[
        "data-footnotes"
      ];
      if (dataFootnotes) {
        return (
          <section
            style={{
              marginTop: "3rem",
              paddingTop: "1.5rem",
              borderTop: "1px solid var(--color-border)",
              fontSize: 14,
              fontFamily: "var(--font-inter), system-ui, sans-serif",
              color: "var(--color-text-muted)",
              lineHeight: 1.7,
            }}
          >
            <h4
              style={{
                fontSize: 13,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                marginBottom: "0.8rem",
                color: "var(--color-text-muted)",
              }}
            >
              Notes
            </h4>
            {children}
          </section>
        );
      }
      return <section>{children}</section>;
    },
  };

  return (
    <div className={className}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
