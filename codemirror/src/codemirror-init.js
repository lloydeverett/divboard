import {basicSetup, EditorView} from "./mods/codemirror.js"
// import {javascript} from "./mods/@codemirror-lang-javascript.js"
import {html} from "./mods/@codemirror-lang-html.js"
// import {css} from "./mods/@codemirror-lang-css.js"

new EditorView({
  doc: "console.log('hello')\n",
  extensions: [basicSetup, html()],
  parent: document.getElementById("codemirror-testing")
})
