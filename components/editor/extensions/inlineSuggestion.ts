import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { EditorView } from "@tiptap/pm/view";

interface SuggestionData {
  from: number;
  to: number;
  original: string;
  suggested: string;
}

interface SuggestionPluginState {
  suggestion: SuggestionData | null;
  decorations: DecorationSet;
}

var suggestionPluginKey = new PluginKey<SuggestionPluginState>("inlineSuggestion");
var selectionLockKey = new PluginKey<DecorationSet>("selectionLock");

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    inlineSuggestion: {
      setSuggestion: (data: SuggestionData) => ReturnType;
      clearSuggestion: () => ReturnType;
      acceptSuggestion: () => ReturnType;
      lockSelection: (range: { from: number; to: number }) => ReturnType;
      unlockSelection: () => ReturnType;
    };
  }
}

function buildDecorations(
  doc: Parameters<typeof DecorationSet.create>[0],
  suggestion: SuggestionData,
  editorRef: { current: ReturnType<typeof Extension.create> extends { editor: infer E } ? E : any },
): DecorationSet {
  if (suggestion.from < 0 || suggestion.to > doc.content.size || suggestion.from >= suggestion.to) {
    return DecorationSet.empty;
  }

  var decorations: Decoration[] = [];

  decorations.push(
    Decoration.inline(suggestion.from, suggestion.to, {
      class: "suggestion-old",
    })
  );

  var widget = document.createElement("span");
  widget.className = "suggestion-new-wrapper";
  widget.contentEditable = "false";

  var newTextEl = document.createElement("span");
  newTextEl.className = "suggestion-new";
  newTextEl.textContent = suggestion.suggested;
  widget.appendChild(newTextEl);

  var controls = document.createElement("span");
  controls.className = "suggestion-controls";

  var acceptBtn = document.createElement("button");
  acceptBtn.className = "suggestion-btn suggestion-accept-btn";
  acceptBtn.title = "Accept (Tab)";
  acceptBtn.textContent = "\u2713";
  acceptBtn.addEventListener("mousedown", function onAccept(e) {
    e.preventDefault();
    e.stopPropagation();
    editorRef.current.commands.acceptSuggestion();
  });

  var rejectBtn = document.createElement("button");
  rejectBtn.className = "suggestion-btn suggestion-reject-btn";
  rejectBtn.title = "Reject (Esc)";
  rejectBtn.textContent = "\u2717";
  rejectBtn.addEventListener("mousedown", function onReject(e) {
    e.preventDefault();
    e.stopPropagation();
    editorRef.current.commands.clearSuggestion();
  });

  controls.appendChild(acceptBtn);
  controls.appendChild(rejectBtn);
  widget.appendChild(controls);

  decorations.push(
    Decoration.widget(suggestion.to, widget, { side: 1 })
  );

  return DecorationSet.create(doc, decorations);
}

var InlineSuggestion = Extension.create({
  name: "inlineSuggestion",

  addCommands() {
    return {
      setSuggestion: function setSuggestionCmd(data: SuggestionData) {
        return function run({ tr, dispatch }) {
          if (dispatch) {
            tr.setMeta(suggestionPluginKey, { type: "set", data: data });
          }
          return true;
        };
      },
      clearSuggestion: function clearSuggestionCmd() {
        return function run({ tr, dispatch }) {
          if (dispatch) {
            tr.setMeta(suggestionPluginKey, { type: "clear" });
          }
          return true;
        };
      },
      acceptSuggestion: function acceptSuggestionCmd() {
        return function run({ state, tr, dispatch }) {
          var ps = suggestionPluginKey.getState(state);
          if (!ps || !ps.suggestion) return false;
          var s = ps.suggestion;
          if (dispatch) {
            tr.insertText(s.suggested, s.from, s.to);
            tr.setMeta(suggestionPluginKey, { type: "clear" });
          }
          return true;
        };
      },
      lockSelection: function lockSelectionCmd(range: { from: number; to: number }) {
        return function run({ tr, dispatch }) {
          if (dispatch) {
            tr.setMeta(selectionLockKey, { from: range.from, to: range.to });
          }
          return true;
        };
      },
      unlockSelection: function unlockSelectionCmd() {
        return function run({ tr, dispatch }) {
          if (dispatch) {
            tr.setMeta(selectionLockKey, "clear");
          }
          return true;
        };
      },
    };
  },

  addProseMirrorPlugins() {
    var editorRef = { current: this.editor };

    return [
      new Plugin<SuggestionPluginState>({
        key: suggestionPluginKey,
        state: {
          init: function initState() {
            return { suggestion: null, decorations: DecorationSet.empty };
          },
          apply: function applyState(tr, value, _oldState, newState) {
            var meta = tr.getMeta(suggestionPluginKey);
            if (meta) {
              if (meta.type === "clear") {
                return { suggestion: null, decorations: DecorationSet.empty };
              }
              if (meta.type === "set") {
                var data = meta.data as SuggestionData;
                return {
                  suggestion: data,
                  decorations: buildDecorations(newState.doc, data, editorRef),
                };
              }
            }
            if (value.suggestion && tr.docChanged) {
              var from = tr.mapping.map(value.suggestion.from);
              var to = tr.mapping.map(value.suggestion.to);
              if (from >= to || from < 0 || to > newState.doc.content.size) {
                return { suggestion: null, decorations: DecorationSet.empty };
              }
              var mapped: SuggestionData = {
                ...value.suggestion,
                from: from,
                to: to,
              };
              return {
                suggestion: mapped,
                decorations: buildDecorations(newState.doc, mapped, editorRef),
              };
            }
            return value;
          },
        },
        props: {
          decorations: function getDecorations(state) {
            var ps = suggestionPluginKey.getState(state);
            return ps ? ps.decorations : DecorationSet.empty;
          },
          handleKeyDown: function handleKey(_view: EditorView, event: KeyboardEvent) {
            var ps = suggestionPluginKey.getState(_view.state);
            if (!ps || !ps.suggestion) return false;

            if (event.key === "Tab" && !event.shiftKey) {
              event.preventDefault();
              editorRef.current.commands.acceptSuggestion();
              return true;
            }

            if (event.key === "Escape") {
              event.preventDefault();
              editorRef.current.commands.clearSuggestion();
              return true;
            }

            return false;
          },
        },
      }),
      new Plugin<DecorationSet>({
        key: selectionLockKey,
        state: {
          init: function initLock() {
            return DecorationSet.empty;
          },
          apply: function applyLock(tr, value, _oldState, newState) {
            var meta = tr.getMeta(selectionLockKey);
            if (meta === "clear") return DecorationSet.empty;
            if (meta && typeof meta === "object" && "from" in meta) {
              var from = meta.from as number;
              var to = meta.to as number;
              if (from < 0 || to > newState.doc.content.size || from >= to) {
                return DecorationSet.empty;
              }
              var deco = Decoration.inline(from, to, {
                class: "selection-highlight",
              });
              return DecorationSet.create(newState.doc, [deco]);
            }
            if (tr.docChanged && value !== DecorationSet.empty) {
              return value.map(tr.mapping, tr.doc);
            }
            return value;
          },
        },
        props: {
          decorations: function getLockDecorations(state) {
            return selectionLockKey.getState(state) ?? DecorationSet.empty;
          },
        },
      }),
    ];
  },
});

export { InlineSuggestion, suggestionPluginKey };
export type { SuggestionData };
