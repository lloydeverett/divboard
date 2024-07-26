import {basicSetup, EditorView} from "./mods/codemirror.js"
import {html} from "./mods/@codemirror-lang-html.js"
import {javascript} from "./mods/@codemirror-lang-javascript.js"
import {css} from "./mods/@codemirror-lang-css.js"

export const markupEditor = new EditorView({
  doc: "<div>hello</div>\n",
  extensions: [basicSetup, html()],
  parent: document.getElementById("markup-edit")
});

export const srcEditor = new EditorView({
  doc: "console.log('hello')\n",
  extensions: [basicSetup, javascript()],
  parent: document.getElementById("src-edit")
});

export const cssEditor = new EditorView({
  doc: "div { background: pink; }\n",
  extensions: [basicSetup, css()],
  parent: document.getElementById("css-edit")
});
