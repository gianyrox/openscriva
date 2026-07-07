import { test } from "node:test";
import assert from "node:assert/strict";
import { countWords, extractTitle, stripMarkdown } from "./markdown.ts";

test("countWords counts whitespace-separated tokens", function () {
  assert.equal(countWords("one two three"), 3);
  assert.equal(countWords("  spaced   out \n words "), 3);
  assert.equal(countWords(""), 0);
});

test("extractTitle returns the first H1", function () {
  assert.equal(extractTitle("# The Title\n\nbody"), "The Title");
  assert.equal(extractTitle("no heading here"), null);
});

test("extractTitle ignores deeper headings", function () {
  assert.equal(extractTitle("## Not a title"), null);
});

test("stripMarkdown removes formatting for word-count/plain views", function () {
  assert.equal(stripMarkdown("# Heading"), "Heading");
  assert.equal(stripMarkdown("**bold** and *italic*"), "bold and italic");
  assert.equal(stripMarkdown("~~struck~~"), "struck");
  assert.equal(stripMarkdown("a [link](http://x.com) here"), "a link here");
});

test("stripMarkdown drops images and list/quote markers", function () {
  assert.equal(stripMarkdown("![alt](http://x.com/i.png)").trim(), "");
  assert.equal(stripMarkdown("- item").trim(), "item");
  assert.equal(stripMarkdown("> quote").trim(), "quote");
});
