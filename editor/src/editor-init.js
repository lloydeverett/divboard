import { basicSetup, EditorView } from "codemirror"
import { keymap } from "@codemirror/view"
import { html } from "@codemirror/lang-html"
import { javascript } from "@codemirror/lang-javascript"
import { css } from "@codemirror/lang-css"
import { vim } from "@replit/codemirror-vim"
import { indentWithTab } from "@codemirror/commands"
import { birdsOfParadise } from "./themes/birds-of-paradise.js";
import { gruvboxDark } from "./themes/gruvbox-dark.js";
import { gruvboxLight } from "./themes/gruvbox-light.js";

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
