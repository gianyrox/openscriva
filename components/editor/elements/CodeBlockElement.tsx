"use client";

import { useState, useEffect, useRef } from "react";
import { PlateElement } from "platejs/react";

function MermaidPreview({ code }: { code: string }) {
  var containerRef = useRef<HTMLDivElement>(null);
  var [svg, setSvg] = useState<string | null>(null);
  var [error, setError] = useState<string | null>(null);
  var idRef = useRef("mermaid-" + Math.random().toString(36).slice(2, 10));

  useEffect(function renderDiagram() {
    var cancelled = false;

    async function run() {
      try {
        var mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: "neutral",
          fontFamily: "var(--font-inter), system-ui, sans-serif",
          fontSize: 13,
        });
        var result = await mermaid.render(idRef.current, code);
        if (!cancelled) {
          setSvg(result.svg);
          setError(null);
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message || "Failed to render diagram");
          setSvg(null);
        }
      }
    }

    run();
    return function cleanup() {
      cancelled = true;
    };
  }, [code]);

  if (error) {
    return (
      <div
        style={{
          padding: "12px 16px",
          backgroundColor: "color-mix(in srgb, var(--color-error) 8%, transparent)",
          border: "1px solid color-mix(in srgb, var(--color-error) 25%, transparent)",
          borderRadius: 6,
          fontSize: 12,
          fontFamily: "var(--font-inter), system-ui, sans-serif",
          color: "var(--color-error)",
        }}
      >
        Mermaid error: {error}
      </div>
    );
  }

  if (!svg) {
    return (
      <div
        style={{
          padding: "24px",
          textAlign: "center",
          color: "var(--color-text-muted)",
          fontSize: 13,
          fontFamily: "var(--font-inter), system-ui, sans-serif",
        }}
      >
        Rendering diagram...
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      dangerouslySetInnerHTML={{ __html: svg }}
      style={{
        display: "flex",
        justifyContent: "center",
        padding: "16px 0",
        overflow: "auto",
      }}
    />
  );
}

function extractCodeText(children: any[]): string {
  var lines: string[] = [];
  for (var child of children) {
    if (child.type === "code_line" && child.children) {
      var lineText = child.children
        .map(function getText(c: any) { return c.text || ""; })
        .join("");
      lines.push(lineText);
    }
  }
  return lines.join("\n");
}

export default function CodeBlockElement(props: any) {
  var element = props.element;
  var lang = element.lang || "";
  var isMermaid = lang === "mermaid";
  var code = extractCodeText(element.children || []);

  if (isMermaid) {
    return (
      <PlateElement {...props} as="div">
        <div contentEditable={false} style={{ userSelect: "none" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 12px",
              backgroundColor: "var(--color-surface)",
              borderRadius: "6px 6px 0 0",
              border: "1px solid var(--color-border)",
              borderBottom: "none",
              fontFamily: "var(--font-inter), system-ui, sans-serif",
              fontSize: 11,
              color: "var(--color-text-muted)",
              fontWeight: 500,
              letterSpacing: "0.02em",
              textTransform: "uppercase",
            }}
          >
            mermaid
          </div>
          <div
            style={{
              backgroundColor: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: "0 0 6px 6px",
              padding: "8px",
              marginBottom: "1em",
            }}
          >
            <MermaidPreview code={code} />
          </div>
        </div>
        <div style={{ display: "none" }}>{props.children}</div>
      </PlateElement>
    );
  }

  return (
    <PlateElement {...props} as="div">
      <div
        style={{
          position: "relative",
        }}
      >
        {lang && (
          <div
            style={{
              position: "absolute",
              top: 6,
              right: 10,
              fontSize: 10,
              fontFamily: "var(--font-inter), system-ui, sans-serif",
              color: "var(--color-text-muted)",
              opacity: 0.6,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              userSelect: "none",
            }}
            contentEditable={false}
          >
            {lang}
          </div>
        )}
        <pre
          style={{
            backgroundColor: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: 6,
            padding: "14px 16px",
            margin: "0.5em 0 1em",
            fontFamily: "var(--font-jetbrains-mono), monospace",
            fontSize: 14,
            lineHeight: 1.6,
            overflowX: "auto",
            whiteSpace: "pre",
          }}
        >
          <code>{props.children}</code>
        </pre>
      </div>
    </PlateElement>
  );
}
