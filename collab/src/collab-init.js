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

const isFileUrl = window.location.protocol === 'file:';

const YMAP_EVALUATED_SRC_KEY = "evaluatedSrc";
const HTTP_CONNECTION_STRING = window.location.origin + "/y-sweet/";
const WS_CONNECTION_STRING = HTTP_CONNECTION_STRING.replace(/^https:\/\//, "wss://");

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
const yMap = yDoc.getMap();

let provider = null;
let srcEvaluatedChangedHandler = null;
let didInit = false;

export async function init(docId) {
  if (!isFileUrl) {
    const clientToken = await getOrCreateDocAndToken(HTTP_CONNECTION_STRING, docId);
    clientToken.url = clientToken.url.replace(/^ws:\/\/.*?\//, WS_CONNECTION_STRING);
    provider = createYjsProvider(yDoc, clientToken, { disableBc: true });

    provider.awareness.setLocalStateField('user', {
      name: 'Anonymous ' + Math.floor(Math.random() * 100),
      color: userColor.color,
      colorLight: userColor.light
    });

    await new Promise(resolve => {
      provider.on('synced', () => {
        resolve();
      });
    });
  }

  yMap.observe(function(eventType, transaction) {
    if (eventType.keysChanged.has(YMAP_EVALUATED_SRC_KEY) && srcEvaluatedChangedHandler !== null) {
      srcEvaluatedChangedHandler();
    }
  });

  didInit = true;
}

function requireDidInit(fnName) {
  if (!didInit) {
    throw new Error("Expected init() function to have been called and completed before calling " + fnName + ".");
  }
}

function createEditor(yText, yUndoManager, extraExtensions, parentNode, onDocChanged) {
  return new EditorView({
    doc: isFileUrl ? "" : yText.toString(),
    extensions: [
      EditorView.updateListener.of(
        function (e) {
          if (e.docChanged) {
            onDocChanged(e);
          }
        }),
        isFileUrl ? [] : yCollab(yText, provider.awareness, { yUndoManager }),
        vim(), basicSetup, keymap.of([indentWithTab]), ...extraExtensions
      ],
    parent: parentNode
  });
}

export function createMarkupEditor(parentNode, onDocChanged) {
  requireDidInit('createMarkupEditor');
  return createEditor(yMarkup, yMarkupUndoManager, [html(), gruvboxLight], parentNode, onDocChanged);
}

export function createSrcEditor(parentNode, onDocChanged) {
  requireDidInit('createSrcEditor');
  return createEditor(ySrc, ySrcUndoManager, [javascript(), gruvboxDark], parentNode, onDocChanged);
}

export function createCssEditor(parentNode, onDocChanged) {
  requireDidInit('createCssEditor');
  return createEditor(yCss, yCssUndoManager, [css(), birdsOfParadise], parentNode, onDocChanged);
}

export function setSrcEvaluatedChangedHandler(newHandler) {
  requireDidInit('setSrcEvaluatedChangedHandler');
  srcEvaluatedChangedHandler = newHandler;
}

export function setSrcEvaluated(str) {
  requireDidInit('setSrcEvaluated');
  yMap.set(YMAP_EVALUATED_SRC_KEY, str);
}

export function getSrcEvaluated() {
  requireDidInit('getSrcEvaluated');
  if (!yMap.has(YMAP_EVALUATED_SRC_KEY)) { return ''; }
  return yMap.get(YMAP_EVALUATED_SRC_KEY);
}
