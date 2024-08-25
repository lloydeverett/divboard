import * as htmlparser2 from "htmlparser2";

function getDomPath(el, rootId) {
    // before constructing the path, look for the first parent that's actually an element
    while (el.parentNode != null && !(el instanceof Element)) {
        el = el.parentNode;
    }

    const stack = [];

    while (el.parentNode != null) {
        let sibCount = 0;
        let sibIndex = 0;
        for (let i = 0; i < el.parentNode.childNodes.length; i++) {
            const sib = el.parentNode.childNodes[i];
            if (sib.nodeName == el.nodeName) {
                if (sib === el) {
                    sibIndex = sibCount;
                }
                sibCount++;
            }
        }

        if (el.hasAttribute('id') && el.id != '') {
            if (el.id === rootId) {
                return stack;
            }
            stack.unshift({ nodeName: el.nodeName.toLowerCase(), id: el.id, element: el });
        } else {
            stack.unshift({ nodeName: el.nodeName.toLowerCase(), index: sibIndex, element: el });
        }

        el = el.parentNode;
    }

    // ok, so we've traversed upward but never found our root element ID, suggesting that this node has been detached from the document
    return null;
}

function getAstPath(astNode) {
}

function followDomPathBestEffort(ast, path) {
    let node = ast;

    let i;
    for (i = 0; i < path.length; i++) {
        let filtered = node.childNodes.filter(n => n.name === path[i].nodeName);

        if ('id' in path[i]) {
            const id = path[i].id;
            filtered = filtered.filter(n => n.id === id);
            if (filtered.length !== 1) {
                break;
            }
            node = filtered[0];
        } else {
            const index = path[i].index;
            if (index >= filtered.length) {
                break;
            }
            node = filtered[index];
        }
    }

    return { astNode: node, pathFollowed: path.slice(0, i) };
}

function followAstPathBestEffort() {
}

export function markupChangesForDomMutation(markup, mutation, markupRootId) {
    const markupAst = htmlparser2.parseDocument(markup, {
        withStartIndices: true,
        withEndIndices: true
    });

    const path = getDomPath(mutation.target, markupRootId);
    if (path === null) {
        // node detached from document, so nothing to do here; its removal will be reflected by a separate mutation
        return null;
    }

    // do our best to find the corresponding element in the parsed markup
    const { astNode, pathFollowed } = followDomPathBestEffort(markupAst, path);
    if (pathFollowed.length === 0 || astNode.startIndex === null || astNode.endIndex === null) {
        return { from: 0, to: markup.length, html: document.getElementById(markupRootId).innerHTML };
    }
    const elementAtPathFollowed = pathFollowed[pathFollowed.length - 1].element;
    return { from: astNode.startIndex, to: astNode.endIndex + 1, html: elementAtPathFollowed.outerHTML };
}

export function domNodeToUpdateForMarkupChanges(oldMarkup, editedRangeFrom, editedRangeTo, markupRootId) {
    const markupAst = htmlparser2.parseDocument(oldMarkup, {
        withStartIndices: true,
        withEndIndices: true
    });

    let innermostNode = markupAst;
    let innermostNodeFrom = 0;
    let innermostNodeEnd = oldMarkup.length;
    function walk(n) {
        const nFrom = n.startIndex;
        const nTo = n.endIndex + 1;
        if (/* is the range for this node narrower than the existing best candidate? */
            nFrom >= innermostNodeFrom && nTo <= innermostNodeEnd && (nFrom > innermostNodeFrom || nTo < innermostNodeEnd) &&
            /* is the edited range contained within the range of this node? */
            nFrom <= editedRangeFrom && nTo >= editedRangeTo
        ) {
            innermostNode = n;
            innermostNodeFrom = nFrom;
            innermostNodeEnd = nTo;
        }

        if ('childNodes' in n) { n.childNodes.forEach(walk); }
    }
    if ('childNodes' in markupAst) { markupAst.childNodes.forEach(walk); }

    console.log(innermostNode);
}
