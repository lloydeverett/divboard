import { basicSetup, EditorView } from "./mods/codemirror.js"
import { html } from "./mods/@codemirror-lang-html.js"
import { javascript } from "./mods/@codemirror-lang-javascript.js"
import { css } from "./mods/@codemirror-lang-css.js"
import { vim } from "./mods/codemirror-vim/index.js"
import { birdsOfParadise } from "./mods/thememirror/themes/birds-of-paradise.js";
import { gruvboxDark } from "./mods/thememirror/themes/gruvbox-dark.js";
import { gruvboxLight } from "./mods/thememirror/themes/gruvbox-light.js";

export function createMarkupEditor(content, parentNode) {
  return new EditorView({
    doc: content,
    extensions: [vim(), basicSetup, html(), gruvboxLight],
    parent: parentNode
  });
}

export function createSrcEditor(content, parentNode) {
  return new EditorView({
    doc: content,
    extensions: [vim(), basicSetup, javascript(), gruvboxDark],
    parent: parentNode
  });
}

export function createCssEditor(content, parentNode) {
  return new EditorView({
    doc: content,
    extensions: [vim(), basicSetup, css(), birdsOfParadise],
    parent: parentNode
  });
}
