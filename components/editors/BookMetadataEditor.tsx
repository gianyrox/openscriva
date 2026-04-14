"use client";

import { BookOpen } from "lucide-react";
import EditorShell from "@/components/editors/EditorShell";
import type { Book, Part } from "@/types";
import type { MatterSection } from "@/types/scriva";

function FieldGroup(props: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <h3 style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.5px" }}>
        {props.label}
      </h3>
      {props.children}
    </div>
  );
}

function Field(props: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: "block", fontSize: 11, fontWeight: 500, color: "var(--color-text-muted)", marginBottom: 4 }}>
        {props.label}
      </label>
      {props.children}
    </div>
  );
}

var inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 12px",
  fontSize: 13,
  border: "1px solid var(--color-border)",
  borderRadius: 6,
  backgroundColor: "var(--color-bg)",
  color: "var(--color-text)",
  fontFamily: "var(--font-inter), system-ui, sans-serif",
  outline: "none",
};

var textareaStyle: React.CSSProperties = {
  ...inputStyle,
  minHeight: 80,
  resize: "vertical" as const,
};

function TagInput(props: { value: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      var val = e.currentTarget.value.trim();
      if (val && props.value.indexOf(val) === -1) {
        props.onChange([...props.value, val]);
      }
      e.currentTarget.value = "";
    }
  }

  function removeTag(idx: number) {
    props.onChange(props.value.filter(function f(_, i) { return i !== idx; }));
  }

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: props.value.length > 0 ? 6 : 0 }}>
        {props.value.map(function renderTag(tag, i) {
          return (
            <span key={tag + i} style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "2px 8px",
              fontSize: 11,
              borderRadius: 4,
              backgroundColor: "color-mix(in srgb, var(--color-accent) 12%, transparent)",
              color: "var(--color-accent)",
            }}>
              {tag}
              <button
                onClick={function remove() { removeTag(i); }}
                style={{ border: "none", background: "none", color: "inherit", cursor: "pointer", padding: 0, fontSize: 13, lineHeight: 1 }}
              >
                x
              </button>
            </span>
          );
        })}
      </div>
      <input
        type="text"
        onKeyDown={handleKeyDown}
        placeholder={props.placeholder || "Type and press Enter..."}
        style={inputStyle}
      />
    </div>
  );
}

export default function BookMetadataEditor(props: { filePath: string }) {
  return (
    <EditorShell filePath={props.filePath} title="Book Metadata" icon={BookOpen}>
      {function renderForm(ctx) {
        var book = ctx.data as Book;

        function update(field: string, value: any) {
          ctx.setData({ ...book, [field]: value });
        }

        return (
          <div style={{ maxWidth: 680, margin: "0 auto" }}>
            <FieldGroup label="Basic Information">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Field label="Title">
                  <input type="text" value={book.title || ""} onChange={function ch(e) { update("title", e.target.value); }} style={inputStyle} />
                </Field>
                <Field label="Subtitle">
                  <input type="text" value={book.subtitle || ""} onChange={function ch(e) { update("subtitle", e.target.value); }} style={inputStyle} />
                </Field>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Field label="Author">
                  <input type="text" value={book.author || ""} onChange={function ch(e) { update("author", e.target.value); }} style={inputStyle} />
                </Field>
                <Field label="Genre">
                  <input type="text" value={book.genre || ""} onChange={function ch(e) { update("genre", e.target.value); }} style={inputStyle} />
                </Field>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Field label="Sub-Genre">
                  <input type="text" value={book.subGenre || ""} onChange={function ch(e) { update("subGenre", e.target.value); }} style={inputStyle} />
                </Field>
                <Field label="Language">
                  <input type="text" value={book.language || ""} onChange={function ch(e) { update("language", e.target.value); }} style={inputStyle} />
                </Field>
              </div>
            </FieldGroup>

            <FieldGroup label="Description">
              <Field label="Description">
                <textarea value={book.description || ""} onChange={function ch(e) { update("description", e.target.value); }} style={textareaStyle} />
              </Field>
              <Field label="Logline">
                <input type="text" value={book.logline || ""} onChange={function ch(e) { update("logline", e.target.value); }} style={inputStyle} placeholder="One-sentence summary..." />
              </Field>
            </FieldGroup>

            <FieldGroup label="Themes & Audience">
              <Field label="Themes">
                <TagInput value={book.themes || []} onChange={function ch(v) { update("themes", v); }} placeholder="Add a theme..." />
              </Field>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Field label="Target Audience">
                  <input type="text" value={book.targetAudience || ""} onChange={function ch(e) { update("targetAudience", e.target.value); }} style={inputStyle} />
                </Field>
                <Field label="Target Word Count">
                  <input type="number" value={book.targetWordCount || ""} onChange={function ch(e) { update("targetWordCount", parseInt(e.target.value) || undefined); }} style={inputStyle} />
                </Field>
              </div>
            </FieldGroup>

            <FieldGroup label="Publishing">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Field label="ISBN">
                  <input type="text" value={book.isbn || ""} onChange={function ch(e) { update("isbn", e.target.value); }} style={inputStyle} />
                </Field>
                <Field label="Publisher">
                  <input type="text" value={book.publisher || ""} onChange={function ch(e) { update("publisher", e.target.value); }} style={inputStyle} />
                </Field>
              </div>
            </FieldGroup>

            <FieldGroup label="Co-Authors">
              <TagInput value={book.coAuthors || []} onChange={function ch(v) { update("coAuthors", v); }} placeholder="Add co-author..." />
            </FieldGroup>

            <FieldGroup label="Structure">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Field label="Book Directory">
                  <input type="text" value={book.bookDir || ""} onChange={function ch(e) { update("bookDir", e.target.value); }} style={inputStyle} />
                </Field>
                <Field label="Context Directory">
                  <input type="text" value={book.contextDir || ""} onChange={function ch(e) { update("contextDir", e.target.value); }} style={inputStyle} />
                </Field>
              </div>

              <div style={{ marginTop: 12 }}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 500, color: "var(--color-text-muted)", marginBottom: 8 }}>
                  Parts ({(book.parts || []).length})
                </label>
                {(book.parts || []).map(function renderPart(part: Part, i: number) {
                  return (
                    <div key={i} style={{ padding: "8px 12px", marginBottom: 4, border: "1px solid var(--color-border)", borderRadius: 6, backgroundColor: "var(--color-surface)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <input
                          type="text"
                          value={part.title}
                          onChange={function ch(e) {
                            var newParts = (book.parts || []).map(function clone(p: Part, j: number) {
                              return j === i ? { ...p, title: e.target.value } : p;
                            });
                            update("parts", newParts);
                          }}
                          style={{ ...inputStyle, flex: 1 }}
                        />
                        <span style={{ fontSize: 11, color: "var(--color-text-muted)", flexShrink: 0 }}>
                          {part.chapters.length} ch.
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </FieldGroup>
          </div>
        );
      }}
    </EditorShell>
  );
}
