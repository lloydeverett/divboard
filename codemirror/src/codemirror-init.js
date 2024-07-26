import { basicSetup, EditorView } from "./mods/codemirror.js"
import { html } from "./mods/@codemirror-lang-html.js"
import { javascript } from "./mods/@codemirror-lang-javascript.js"
import { css } from "./mods/@codemirror-lang-css.js"

export function createMarkupEditor(content, parentNode) {
  return new EditorView({
    doc: content,
    extensions: [basicSetup, html()],
    parent: parentNode
  });
}

export function createSrcEditor(content, parentNode) {
  return new EditorView({
    doc: content,
    extensions: [basicSetup, javascript()],
    parent: parentNode
  });
}

export function createCssEditor(content, parentNode) {
  return new EditorView({
    doc: content,
    extensions: [basicSetup, css()],
    parent: parentNode
  });
}
