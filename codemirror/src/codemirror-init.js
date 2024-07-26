import {basicSetup, EditorView} from "./mods/codemirror.js"
import {html} from "./mods/@codemirror-lang-html.js"
import {javascript} from "./mods/@codemirror-lang-javascript.js"
import {css} from "./mods/@codemirror-lang-css.js"

new EditorView({
  doc: "<div>hello</div>\n",
  extensions: [basicSetup, html()],
  parent: document.getElementById("content-edit")
});

new EditorView({
  doc: "console.log('hello')\n",
  extensions: [basicSetup, javascript()],
  parent: document.getElementById("src-edit")
});

new EditorView({
  doc: "div { background: pink; }\n",
  extensions: [basicSetup, css()],
  parent: document.getElementById("css-edit")
});
