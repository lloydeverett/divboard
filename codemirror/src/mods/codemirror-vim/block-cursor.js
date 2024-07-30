import { Prec } from "../@codemirror-state";
import { EditorView, Direction } from "../@codemirror-view";
import * as View from "../@codemirror-view";
// backwards compatibility for old versions not supporting getDrawSelectionConfig
let getDrawSelectionConfig = View.getDrawSelectionConfig || function () {
    let defaultConfig = { cursorBlinkRate: 1200 };
    return function () {
        return defaultConfig;
    };
}();
class Piece {
    constructor(left, top, height, fontFamily, fontSize, fontWeight, color, className, letter, partial) {
        this.left = left;
        this.top = top;
        this.height = height;
        this.fontFamily = fontFamily;
        this.fontSize = fontSize;
        this.fontWeight = fontWeight;
        this.color = color;
        this.className = className;
        this.letter = letter;
        this.partial = partial;
    }
    draw() {
        let elt = document.createElement("div");
        elt.className = this.className;
        this.adjust(elt);
        return elt;
    }
    adjust(elt) {
        elt.style.left = this.left + "px";
        elt.style.top = this.top + "px";
        elt.style.height = this.height + "px";
        elt.style.lineHeight = this.height + "px";
        elt.style.fontFamily = this.fontFamily;
        elt.style.fontSize = this.fontSize;
        elt.style.fontWeight = this.fontWeight;
        elt.style.color = this.partial ? "transparent" : this.color;
        elt.className = this.className;
        elt.textContent = this.letter;
    }
    eq(p) {
        return this.left == p.left && this.top == p.top && this.height == p.height &&
            this.fontFamily == p.fontFamily && this.fontSize == p.fontSize &&
            this.fontWeight == p.fontWeight && this.color == p.color &&
            this.className == p.className &&
            this.letter == p.letter;
    }
}
export class BlockCursorPlugin {
    constructor(view, cm) {
        this.view = view;
        this.rangePieces = [];
        this.cursors = [];
        this.cm = cm;
        this.measureReq = { read: this.readPos.bind(this), write: this.drawSel.bind(this) };
        this.cursorLayer = view.scrollDOM.appendChild(document.createElement("div"));
        this.cursorLayer.className = "cm-cursorLayer cm-vimCursorLayer";
        this.cursorLayer.setAttribute("aria-hidden", "true");
        view.requestMeasure(this.measureReq);
        this.setBlinkRate();
    }
    setBlinkRate() {
        let config = getDrawSelectionConfig(this.cm.cm6.state);
        let blinkRate = config.cursorBlinkRate;
        this.cursorLayer.style.animationDuration = blinkRate + "ms";
    }
    update(update) {
        if (update.selectionSet || update.geometryChanged || update.viewportChanged) {
            this.view.requestMeasure(this.measureReq);
            this.cursorLayer.style.animationName = this.cursorLayer.style.animationName == "cm-blink" ? "cm-blink2" : "cm-blink";
        }
        if (configChanged(update))
            this.setBlinkRate();
    }
    scheduleRedraw() {
        this.view.requestMeasure(this.measureReq);
    }
    readPos() {
        let { state } = this.view;
        let cursors = [];
        for (let r of state.selection.ranges) {
            let prim = r == state.selection.main;
            let piece = measureCursor(this.cm, this.view, r, prim);
            if (piece)
                cursors.push(piece);
        }
        return { cursors };
    }
    drawSel({ cursors }) {
        if (cursors.length != this.cursors.length || cursors.some((c, i) => !c.eq(this.cursors[i]))) {
            let oldCursors = this.cursorLayer.children;
            if (oldCursors.length !== cursors.length) {
                this.cursorLayer.textContent = "";
                for (const c of cursors)
                    this.cursorLayer.appendChild(c.draw());
            }
            else {
                cursors.forEach((c, idx) => c.adjust(oldCursors[idx]));
            }
            this.cursors = cursors;
        }
    }
    destroy() {
        this.cursorLayer.remove();
    }
}
function configChanged(update) {
    return getDrawSelectionConfig(update.startState) != getDrawSelectionConfig(update.state);
}
const themeSpec = {
    ".cm-vimMode .cm-line": {
        "& ::selection": { backgroundColor: "transparent !important" },
        "&::selection": { backgroundColor: "transparent !important" },
        caretColor: "transparent !important",
    },
    ".cm-fat-cursor": {
        position: "absolute",
        background: "#ff9696",
        border: "none",
        whiteSpace: "pre",
    },
    "&:not(.cm-focused) .cm-fat-cursor": {
        background: "none",
        outline: "solid 1px #ff9696",
        color: "transparent !important",
    },
};
export const hideNativeSelection = Prec.highest(EditorView.theme(themeSpec));
function getBase(view) {
    let rect = view.scrollDOM.getBoundingClientRect();
    let left = view.textDirection == Direction.LTR ? rect.left : rect.right - view.scrollDOM.clientWidth;
    return { left: left - view.scrollDOM.scrollLeft, top: rect.top - view.scrollDOM.scrollTop };
}
function measureCursor(cm, view, cursor, primary) {
    var _a, _b;
    let head = cursor.head;
    let fatCursor = false;
    let hCoeff = 1;
    let vim = cm.state.vim;
    if (vim && (!vim.insertMode || cm.state.overwrite)) {
        fatCursor = true;
        if (vim.visualBlock && !primary)
            return null;
        if (cursor.anchor < cursor.head) {
            let letter = head < view.state.doc.length && view.state.sliceDoc(head, head + 1);
            if (letter != "\n")
                head--;
        }
        if (cm.state.overwrite)
            hCoeff = 0.2;
        else if (vim.status)
            hCoeff = 0.5;
    }
    if (fatCursor) {
        let letter = head < view.state.doc.length && view.state.sliceDoc(head, head + 1);
        if (letter && (/[\uDC00-\uDFFF]/.test(letter) && head > 1)) {
            // step back if cursor is on the second half of a surrogate pair
            head--;
            letter = view.state.sliceDoc(head, head + 1);
        }
        let pos = view.coordsAtPos(head, 1);
        if (!pos)
            return null;
        let base = getBase(view);
        let domAtPos = view.domAtPos(head);
        let node = domAtPos ? domAtPos.node : view.contentDOM;
        while (domAtPos && domAtPos.node instanceof HTMLElement) {
            node = domAtPos.node;
            domAtPos = { node: domAtPos.node.childNodes[domAtPos.offset], offset: 0 };
        }
        if (!(node instanceof HTMLElement)) {
            if (!node.parentNode)
                return null;
            node = node.parentNode;
        }
        let style = getComputedStyle(node);
        let left = pos.left;
        // TODO remove coordsAtPos when all supported versions of codemirror have coordsForChar api
        let charCoords = (_b = (_a = view).coordsForChar) === null || _b === void 0 ? void 0 : _b.call(_a, head);
        if (charCoords) {
            left = charCoords.left;
        }
        if (!letter || letter == "\n" || letter == "\r") {
            letter = "\xa0";
        }
        else if (letter == "\t") {
            letter = "\xa0";
            var nextPos = view.coordsAtPos(head + 1, -1);
            if (nextPos) {
                left = nextPos.left - (nextPos.left - pos.left) / parseInt(style.tabSize);
            }
        }
        else if ((/[\uD800-\uDBFF]/.test(letter) && head < view.state.doc.length - 1)) {
            // include the second half of a surrogate pair in cursor
            letter += view.state.sliceDoc(head + 1, head + 2);
        }
        let h = (pos.bottom - pos.top);
        return new Piece(left - base.left, pos.top - base.top + h * (1 - hCoeff), h * hCoeff, style.fontFamily, style.fontSize, style.fontWeight, style.color, primary ? "cm-fat-cursor cm-cursor-primary" : "cm-fat-cursor cm-cursor-secondary", letter, hCoeff != 1);
    }
    else {
        return null;
    }
}
