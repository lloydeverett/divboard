import { basicSetup, EditorView } from "./mods/codemirror.js"
import { keymap } from "./mods/@codemirror-view.js"
import { html } from "./mods/@codemirror-lang-html.js"
import { javascript } from "./mods/@codemirror-lang-javascript.js"
import { css } from "./mods/@codemirror-lang-css.js"
import { vim } from "./mods/codemirror-vim/index.js"
import { birdsOfParadise } from "./mods/thememirror/themes/birds-of-paradise.js";
import { gruvboxDark } from "./mods/thememirror/themes/gruvbox-dark.js";
import { gruvboxLight } from "./mods/thememirror/themes/gruvbox-light.js";
import { indentWithTab } from "./mods/@codemirror-commands.js"

export function createMarkupEditor(content, parentNode, onDocChanged) {
  return new EditorView({
    doc: content,
    extensions: [
      EditorView.updateListener.of(
        function (e) {
          if (e.docChanged) {
            onDocChanged();
          }
        }),
      vim(), basicSetup, keymap.of([indentWithTab]), html(), gruvboxLight],
    parent: parentNode
  });
}

export function createSrcEditor(content, parentNode, onDocChanged) {
  return new EditorView({
    doc: content,
    extensions: [
      EditorView.updateListener.of(
        function (e) {
          if (e.docChanged) {
            onDocChanged();
          }
        }),
      vim(), basicSetup, keymap.of([indentWithTab]), javascript(), gruvboxDark],
    parent: parentNode
  });
}

export function createCssEditor(content, parentNode, onDocChanged) {
  return new EditorView({
    doc: content,
    extensions: [
      EditorView.updateListener.of(
        function (e) {
          if (e.docChanged) {
            onDocChanged();
          }
        }),
      vim(), basicSetup, keymap.of([indentWithTab]), css(), birdsOfParadise],
    parent: parentNode
  });
}
