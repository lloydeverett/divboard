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
import * as Y from 'yjs';
import { yCollab } from 'y-codemirror.next';
import { getOrCreateDocAndToken } from '@y-sweet/sdk';
import { createYjsProvider } from '@y-sweet/client';
import * as random from 'lib0/random';

const CONNECTION_STRING = "ys://127.0.0.1:8080";

const userColors = [
  { color: '#30bced', light: '#30bced33' },
  { color: '#6eeb83', light: '#6eeb8333' },
  { color: '#ffbc42', light: '#ffbc4233' },
  { color: '#ecd444', light: '#ecd44433' },
  { color: '#ee6352', light: '#ee635233' },
  { color: '#9ac2c9', light: '#9ac2c933' },
  { color: '#8acb88', light: '#8acb8833' },
  { color: '#1be7ff', light: '#1be7ff33' }
];
const userColor = userColors[random.uint32() % userColors.length];
const yDoc = new Y.Doc();
const yMarkup = yDoc.getText('markup');
const ySrc = yDoc.getText('src');
const yCss = yDoc.getText('css');
const yMarkupUndoManager = new Y.UndoManager(yMarkup);
const ySrcUndoManager = new Y.UndoManager(ySrc);
const yCssUndoManager = new Y.UndoManager(yCss);

let provider;
let didInit = false;

export async function init() {
  // normally client tokens would be requested from a trusted server, but currently this is just localhost with no auth anyway so whatever
  const clientToken = await getOrCreateDocAndToken(CONNECTION_STRING, 'hxcFx9mqHlGQ1RUuqFXgBIG4i89p93xp');
  provider = createYjsProvider(yDoc, clientToken, { disableBc: true });

  provider.awareness.setLocalStateField('user', {
    name: 'Anonymous ' + Math.floor(Math.random() * 100),
    color: userColor.color,
    colorLight: userColor.light
  });

  didInit = true;
}

export function createMarkupEditor(parentNode, onDocChanged) {
  if (!didInit) { throw new Error("Expected init() function to have been called and completed first."); }
  return new EditorView({
    doc: yMarkup.toString(),
    extensions: [
      EditorView.updateListener.of(
        function (e) {
          if (e.docChanged) {
            onDocChanged();
          }
        }),
        yCollab(yMarkup, provider.awareness, { yMarkupUndoManager }),
        vim(), basicSetup, keymap.of([indentWithTab]), html(), gruvboxLight
      ],
    parent: parentNode
  });
}

export function createSrcEditor(parentNode, onDocChanged) {
  if (!didInit) { throw new Error("Expected init() function to have been called and completed first."); }
  return new EditorView({
    doc: ySrc.toString(),
    extensions: [
      EditorView.updateListener.of(
        function (e) {
          if (e.docChanged) {
            onDocChanged();
          }
        }),
        yCollab(ySrc, provider.awareness, { ySrcUndoManager }),
        vim(), basicSetup, keymap.of([indentWithTab]), javascript(), gruvboxDark
      ],
    parent: parentNode
  });
}

export function createCssEditor(parentNode, onDocChanged) {
  if (!didInit) { throw new Error("Expected init() function to have been called and completed first."); }
  return new EditorView({
    doc: yCss.toString(),
    extensions: [
      EditorView.updateListener.of(
        function (e) {
          if (e.docChanged) {
            onDocChanged();
          }
        }),
        yCollab(yCss, provider.awareness, { yCssUndoManager }),
        vim(), basicSetup, keymap.of([indentWithTab]), css(), birdsOfParadise
      ],
    parent: parentNode
  });
}
