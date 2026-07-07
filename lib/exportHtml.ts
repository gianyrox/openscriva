// Shared HTML rendering for manuscript exports (EPUB + PDF).
//
// This is the single source of truth for turning a book's markdown chapters
// into export-ready HTML. Both the EPUB route (`/api/export/epub`) and the PDF
// path (`/api/export/pdf` + the browser-print fallback in PublishPanel) render
// through these functions, so PDF and EPUB stay in sync and gain the same
// inline fidelity (bold, italic, links, images) from one place.
//
// Pure module: no React, no Next, no Node built-ins — safe to import on both
// the server (route handlers) and the client (PublishPanel fallback).

export interface ExportBookMeta {
  title: string;
  author?: string;
  subtitle?: string;
  description?: string;
  coverImage?: string;
}

export interface ExportChapter {
  title: string;
  content: string; // markdown source
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Convert a markdown chapter body into HTML. Handles the block and inline
// elements the editor supports and that survive the markdown round-trip:
// headings, bold, italic, inline code, images, links, blockquote, hr, lists,
// and paragraphs. Kept intentionally dependency-free for portability.
export function markdownToHtml(md: string): string {
  let html = md;

  // Block: headings (deepest first so `###` is not eaten by `#`).
  html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>");
  html = html.replace(/^## (.+)$/gm, "<h2>$1</h2>");
  html = html.replace(/^# (.+)$/gm, "<h1>$1</h1>");

  // Inline: images before links (image syntax is a superset of link syntax).
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" />');
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  // Inline: emphasis + code.
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");

  // Block: blockquote, hr, list items.
  html = html.replace(/^> (.+)$/gm, "<blockquote><p>$1</p></blockquote>");
  html = html.replace(/^---$/gm, "<hr />");
  html = html.replace(/^- (.+)$/gm, "<li>$1</li>");
  html = html.replace(/(<li>.*<\/li>\n?)+/g, function wrapUl(match) {
    return "<ul>" + match + "</ul>";
  });

  // Wrap loose text lines in paragraphs; leave already-tagged blocks alone.
  const lines = html.split("\n");
  const result: string[] = [];
  let inParagraph = false;

  function closeParagraph() {
    if (inParagraph) {
      result.push("</p>");
      inParagraph = false;
    }
  }

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === "") {
      closeParagraph();
    } else if (
      trimmed.startsWith("<h") ||
      trimmed.startsWith("<blockquote") ||
      trimmed.startsWith("<hr") ||
      trimmed.startsWith("<ul") ||
      trimmed.startsWith("<li") ||
      trimmed.startsWith("<img")
    ) {
      closeParagraph();
      result.push(trimmed);
    } else {
      if (!inParagraph) {
        result.push("<p>");
        inParagraph = true;
      }
      result.push(trimmed);
    }
  }
  closeParagraph();

  return result.join("\n");
}

// Build the inner <body> HTML for a whole manuscript: an optional title page
// followed by one page-broken section per chapter. Used for PDF (server render
// and browser-print fallback) so both produce identical layout.
export function manuscriptToBodyHtml(
  book: ExportBookMeta | null,
  chapters: ExportChapter[],
): string {
  const parts: string[] = [];

  if (book) {
    parts.push('<div class="title-page">');
    parts.push('<h1 class="book-title">' + escapeHtml(book.title) + "</h1>");
    if (book.subtitle) {
      parts.push('<p class="book-subtitle">' + escapeHtml(book.subtitle) + "</p>");
    }
    if (book.author) {
      parts.push('<p class="book-author">by ' + escapeHtml(book.author) + "</p>");
    }
    parts.push("</div>");
  }

  for (const ch of chapters) {
    parts.push('<div class="chapter">');
    parts.push("<h2>" + escapeHtml(ch.title) + "</h2>");
    parts.push(markdownToHtml(ch.content));
    parts.push("</div>");
  }

  return parts.join("\n");
}

// Print stylesheet for PDF output (A5 book layout, Literata serif).
export const PDF_PRINT_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Literata:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400&display=swap');
  body {
    font-family: 'Literata', Georgia, 'Times New Roman', serif;
    font-size: 12pt;
    line-height: 1.8;
    color: #2C2C2C;
    max-width: 100%;
    margin: 0;
    padding: 0;
  }
  h1 { font-size: 24pt; font-weight: 800; text-align: center; margin-top: 3rem; margin-bottom: 1.5rem; page-break-after: avoid; }
  h2 { font-size: 18pt; font-weight: 700; margin-top: 2rem; margin-bottom: 1rem; page-break-after: avoid; }
  h3 { font-size: 14pt; font-weight: 600; margin-top: 1.5rem; margin-bottom: 0.8rem; page-break-after: avoid; }
  p { margin-bottom: 1rem; text-indent: 1.5em; orphans: 3; widows: 3; }
  p:first-child { text-indent: 0; }
  blockquote {
    border-left: 2pt solid #B8860B;
    padding-left: 1rem;
    font-style: italic;
    color: #555;
    margin: 1rem 0;
  }
  img { max-width: 100%; display: block; margin: 1.5rem auto; page-break-inside: avoid; }
  hr { border: none; text-align: center; margin: 2rem 0; }
  hr::after { content: '· · ·'; color: #999; letter-spacing: 0.5em; }
  .title-page { text-align: center; margin-bottom: 4rem; page-break-after: always; }
  .book-title { font-size: 36pt; font-weight: 800; margin-top: 6rem; }
  .book-subtitle { font-size: 18pt; font-style: italic; color: #666; }
  .book-author { font-size: 12pt; color: #999; letter-spacing: 0.05em; }
  .chapter { page-break-before: always; }
  .chapter:first-child { page-break-before: auto; }
  code { font-family: monospace; font-size: 0.9em; background: #f5f5f5; padding: 1px 4px; border-radius: 2px; }
  pre { background: #f5f5f5; padding: 0.8rem; border-radius: 4px; overflow-x: auto; }
  a { color: #B8860B; text-decoration: none; }
  figure { margin: 1.5rem auto; text-align: center; }
  figcaption { font-size: 10pt; color: #666; font-style: italic; margin-top: 0.5rem; }
`;

// Reading stylesheet for EPUB output (screen-oriented serif).
export const EPUB_CSS = `
  body {
    font-family: 'Literata', Georgia, 'Times New Roman', serif;
    font-size: 18px;
    line-height: 1.9;
    color: #2C2C2C;
    max-width: 100%;
  }
  h1 { font-size: 28px; font-weight: 700; margin-top: 2rem; margin-bottom: 1rem; }
  h2 { font-size: 22px; font-weight: 600; margin-top: 1.8rem; margin-bottom: 0.8rem; }
  h3 { font-size: 18px; font-weight: 600; margin-top: 1.5rem; margin-bottom: 0.6rem; }
  p { margin-bottom: 1.2rem; text-indent: 1.5em; }
  p:first-child { text-indent: 0; }
  blockquote {
    border-left: 3px solid #B8860B;
    padding-left: 1.2rem;
    font-style: italic;
    color: #6B6B6B;
    margin: 1.2rem 0;
  }
  img { max-width: 100%; display: block; margin: 1.5rem auto; }
  hr { border: none; text-align: center; margin: 2rem 0; }
  hr::after { content: '· · ·'; color: #6B6B6B; letter-spacing: 0.5em; }
  code { font-family: monospace; font-size: 0.9em; background: #f0f0f0; padding: 2px 6px; border-radius: 3px; }
  a { color: #B8860B; text-decoration: none; }
`;

// Wrap manuscript body HTML into a complete, self-contained HTML document.
// Puppeteer renders this to PDF server-side; the browser-print fallback loads
// the exact same document into a hidden iframe and prints it. Same input,
// same output — the fallback is a real substitute, not a downgrade.
export function buildPrintableDocument(
  bodyHtml: string,
  opts?: { title?: string },
): string {
  const title = opts?.title ? escapeHtml(opts.title) : "Manuscript";
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>${title}</title>
<style>${PDF_PRINT_CSS}</style>
</head>
<body>
${bodyHtml}
</body>
</html>`;
}
