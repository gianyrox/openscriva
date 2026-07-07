import { test } from "node:test";
import assert from "node:assert/strict";
import {
  markdownToHtml,
  manuscriptToBodyHtml,
  buildPrintableDocument,
  PDF_PRINT_CSS,
} from "./exportHtml.ts";

// --- markdownToHtml element matrix (§7 ship-blocker #2: export fidelity) ---

test("markdownToHtml renders each heading level", function () {
  assert.match(markdownToHtml("# Title"), /<h1>Title<\/h1>/);
  assert.match(markdownToHtml("## Section"), /<h2>Section<\/h2>/);
  assert.match(markdownToHtml("### Sub"), /<h3>Sub<\/h3>/);
});

test("markdownToHtml does not let # eat ### ", function () {
  const out = markdownToHtml("### Deep");
  assert.match(out, /<h3>Deep<\/h3>/);
  assert.doesNotMatch(out, /<h1>/);
});

test("markdownToHtml renders bold and italic", function () {
  assert.match(markdownToHtml("**bold**"), /<strong>bold<\/strong>/);
  assert.match(markdownToHtml("*italic*"), /<em>italic<\/em>/);
});

test("markdownToHtml renders inline code", function () {
  assert.match(markdownToHtml("use `npm test` here"), /<code>npm test<\/code>/);
});

test("markdownToHtml renders links and images", function () {
  assert.match(
    markdownToHtml("[text](https://example.com)"),
    /<a href="https:\/\/example\.com">text<\/a>/,
  );
  assert.match(
    markdownToHtml("![alt](https://img.test/x.png)"),
    /<img src="https:\/\/img\.test\/x\.png" alt="alt" \/>/,
  );
});

test("markdownToHtml renders images without treating them as links", function () {
  const out = markdownToHtml("![cover](https://img.test/c.png)");
  assert.match(out, /<img /);
  assert.doesNotMatch(out, /<a /);
});

test("markdownToHtml renders blockquote and horizontal rule", function () {
  assert.match(markdownToHtml("> quoted"), /<blockquote><p>quoted<\/p><\/blockquote>/);
  assert.match(markdownToHtml("---"), /<hr \/>/);
});

test("markdownToHtml wraps consecutive list items in a single ul", function () {
  const out = markdownToHtml("- one\n- two");
  assert.match(out, /<ul>/);
  assert.match(out, /<li>one<\/li>/);
  assert.match(out, /<li>two<\/li>/);
  assert.equal((out.match(/<ul>/g) || []).length, 1);
});

test("markdownToHtml wraps plain prose lines in a paragraph", function () {
  const out = markdownToHtml("Just a sentence.");
  assert.match(out, /<p>\nJust a sentence\.\n<\/p>/);
});

test("markdownToHtml closes an open paragraph at a blank line", function () {
  const out = markdownToHtml("Line one.\n\n## Next");
  assert.match(out, /<\/p>/);
  assert.match(out, /<h2>Next<\/h2>/);
});

// --- manuscriptToBodyHtml ---

test("manuscriptToBodyHtml emits a title page with book meta", function () {
  const out = manuscriptToBodyHtml(
    { title: "My Book", subtitle: "A Tale", author: "Jane Doe" },
    [],
  );
  assert.match(out, /class="title-page"/);
  assert.match(out, /<h1 class="book-title">My Book<\/h1>/);
  assert.match(out, /A Tale/);
  assert.match(out, /by Jane Doe/);
});

test("manuscriptToBodyHtml omits the title page when book is null", function () {
  const out = manuscriptToBodyHtml(null, [{ title: "Ch1", content: "Hi." }]);
  assert.doesNotMatch(out, /title-page/);
  assert.match(out, /class="chapter"/);
});

test("manuscriptToBodyHtml wraps each chapter and renders its markdown", function () {
  const out = manuscriptToBodyHtml(null, [
    { title: "One", content: "**strong** words" },
    { title: "Two", content: "plain" },
  ]);
  assert.equal((out.match(/class="chapter"/g) || []).length, 2);
  assert.match(out, /<h2>One<\/h2>/);
  assert.match(out, /<strong>strong<\/strong>/);
});

test("manuscriptToBodyHtml escapes HTML-special chars in metadata and titles", function () {
  const out = manuscriptToBodyHtml({ title: "A & B <x>" }, [
    { title: "C > D", content: "body" },
  ]);
  assert.match(out, /A &amp; B &lt;x&gt;/);
  assert.match(out, /C &gt; D/);
  assert.doesNotMatch(out, /<x>/);
});

// --- buildPrintableDocument (used by both puppeteer + browser-print fallback) ---

test("buildPrintableDocument produces a complete HTML document", function () {
  const doc = buildPrintableDocument("<p>hi</p>", { title: "T" });
  assert.match(doc, /^<!DOCTYPE html>/);
  assert.match(doc, /<html>/);
  assert.match(doc, /<title>T<\/title>/);
  assert.match(doc, /<p>hi<\/p>/);
  assert.ok(doc.includes(PDF_PRINT_CSS.trim().slice(0, 20)));
});

test("buildPrintableDocument escapes the title and falls back to a default", function () {
  assert.match(buildPrintableDocument("x", { title: "a<b>" }), /<title>a&lt;b&gt;<\/title>/);
  assert.match(buildPrintableDocument("x"), /<title>Manuscript<\/title>/);
});

test("buildPrintableDocument body matches manuscriptToBodyHtml (server + fallback parity)", function () {
  // The Puppeteer path and the browser-print fallback must render identical
  // documents. Both wrap the same manuscriptToBodyHtml output.
  const body = manuscriptToBodyHtml({ title: "Parity" }, [
    { title: "Ch", content: "text" },
  ]);
  const doc = buildPrintableDocument(body, { title: "Parity" });
  assert.ok(doc.includes(body));
});
