import * as htmlparser2 from "htmlparser2";

function getDomPath(el, rootId) {
    // before constructing the path, look for the first parent that's actually an element
    while (el.parentNode !== null && !(el instanceof Element)) {
        el = el.parentNode;
    }

    const stack = [];

    while (el.parentNode !== null) {
        let sibCount = 0;
        let sibIndex = 0;
        for (let i = 0; i < el.parentNode.childNodes.length; i++) {
            const sib = el.parentNode.childNodes[i];
            if ('nodeName' in sib && sib.nodeName.toLowerCase() === el.nodeName.toLowerCase()) {
                if (sib === el) {
                    sibIndex = sibCount;
                }
                sibCount++;
            }
        }

        if (el.hasAttribute('id') && el.id !== '') {
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
    // before constructing the path, look for the first parent that's actually an element
    while (astNode.parentNode !== null && !('name' in astNode)) {
        astNode = astNode.parentNode;
    }

    const stack = [];

    while (astNode.parentNode !== null) {
        let sibCount = 0;
        let sibIndex = 0;
        for (let i = 0; i < astNode.parentNode.childNodes.length; i++) {
            const sib = astNode.parentNode.childNodes[i];
            if ('name' in sib && sib.name.toLowerCase() === astNode.name.toLowerCase()) {
                if (sib === astNode) {
                    sibIndex = sibCount;
                }
                sibCount++;
            }
        }

        if ('attribs' in astNode && 'id' in astNode.attribs && astNode.attribs.id !== '') {
            stack.unshift({ nodeName: astNode.name.toLowerCase(), id: astNode.attribs.id, astNode: astNode });
        } else {
            stack.unshift({ nodeName: astNode.name.toLowerCase(), index: sibIndex, astNode: astNode });
        }

        astNode = astNode.parentNode;
    }

    return stack;
}

function followDomPathBestEffort(ast, path) {
    let node = ast;

    let i;
    for (i = 0; i < path.length; i++) {
        let filtered = node.childNodes.filter(n => 'name' in n && n.name.toLowerCase() === path[i].nodeName);

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

function followAstPathBestEffort(rootNode, path) {
    let node = rootNode;

    let i;
    for (i = 0; i < path.length; i++) {
        let filtered = Array.prototype.filter.call(node.childNodes, n => 'nodeName' in n && n.nodeName.toLowerCase() === path[i].nodeName);

        if ('id' in path[i]) {
            const id = path[i].id;
            filtered = Array.prototype.filter.call(filtered, n => n.id === id);
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

    return { node: node, pathFollowed: path.slice(0, i) };
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

export function domNodeToUpdateForMarkupChanges(oldMarkup, newMarkup, editedRangeFrom, editedRangeTo, markupRootId) {
    const oldMarkupAst = htmlparser2.parseDocument(oldMarkup, {
        withStartIndices: true,
        withEndIndices: true
    });

    // find the innermost node affected by this change
    let innermostNode = oldMarkupAst;
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
    if ('childNodes' in oldMarkupAst) { oldMarkupAst.childNodes.forEach(walk); }

    // ok, so we've found the innermost node that covers all the changes in the old DOM
    const path = getAstPath(innermostNode);

    // do our best to find the corresponding element in the actual DOM
    const { node, pathFollowed } = followAstPathBestEffort(document.getElementById(markupRootId), path);
    if (pathFollowed.length === 0) {
        // return { node: node, html:  };
    }
    return node; 
}
