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

    // ok, so we've traversed upward but never found our root element ID
    // this suggests that this node has been detached from the document
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

function followPathInAstBestEffort(ast, path) {
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

function followPathInDomBestEffort(rootNode, path) {
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
    const { astNode, pathFollowed } = followPathInAstBestEffort(markupAst, path);
    if (pathFollowed.length === 0 || astNode.startIndex === null || astNode.endIndex === null) {
        return { from: 0, to: markup.length, html: document.getElementById(markupRootId).innerHTML };
    }
    const elementAtPathFollowed = pathFollowed[pathFollowed.length - 1].element;
    return { from: astNode.startIndex, to: astNode.endIndex + 1, html: elementAtPathFollowed.outerHTML };
}

function diffAstsForInnermostNodeWithChanges(oldAst, newAst) {
    function serializeAstNode(node) {
        return JSON.stringify({
            ...node,
            childNodeCount: 'childNodes' in node ? node.childNodes.length : null,
            parent: undefined,
            prev: undefined,
            next: undefined,
            children: undefined,
            startIndex: undefined,
            endIndex: undefined
        });
    }
    if (serializeAstNode(oldAst) !== serializeAstNode(newAst)) {
        return { oldNode: oldAst, newNode: newAst } // differences found
    }
    if (!('childNodes' in oldAst)) {
        return null; // no differences
    }
    let changesFound = null;
    for (let i = 0; i < oldAst.childNodes.length; i++) {
        const oldChild = oldAst.childNodes[i];
        const newChild = newAst.childNodes[i];
        const diffResult = diffAstsForInnermostNodeWithChanges(oldChild, newChild);
        if (diffResult !== null) {
            if (changesFound === null) {
                changesFound = diffResult;
            } else {
                return { oldNode: oldAst, newNode: newAst } // differences found in multiple children
            }
        }
    }
    if (changesFound === null) {
        return null; // no differences
    }
    return changesFound; // only one child changed, so return result for that diff
}

export function domNodeToUpdateForMarkupChanges(oldMarkup, newMarkup, editedRangeFrom, editedRangeTo, markupRootId) {
    const oldMarkupAst = htmlparser2.parseDocument(oldMarkup, {
        withStartIndices: true,
        withEndIndices: true
    });
    const newMarkupAst = htmlparser2.parseDocument(newMarkup, {
        withStartIndices: true,
        withEndIndices: true
    });

    const result = diffAstsForInnermostNodeWithChanges(oldMarkupAst, newMarkupAst);
    if (result === null) {
        return null;
    }

    // ok, so we've found a node in the old and new markup that covers all of the changes
    const oldPath = getAstPath(result.oldNode);
    const newPath = getAstPath(result.newNode);

    // let's try to find a corresponding node in the DOM
    // following the path is best-effort, so we might not reach all the way to result.oldNode in the DOM
    const followPathResult = followPathInDomBestEffort(document.getElementById(markupRootId), oldPath);
    const oldPathFollowed = followPathResult.pathFollowed;
    if (oldPathFollowed.length === 0) {
        return { node: document.getElementById(markupRootId), html: newMarkup };
    }
    const newPathFollowed = newPath.slice(0, oldPathFollowed.length);
    const newMarkupNodeFollowed = newPathFollowed[newPathFollowed.length - 1].astNode;
    if (newMarkupNodeFollowed.startIndex === null || newMarkupNodeFollowed.endIndex === null) {
        return { node: document.getElementById(markupRootId), html: newMarkup };
    }
    return { node: followPathResult.node, html: newMarkup.slice(newMarkupNodeFollowed.startIndex, newMarkupNodeFollowed.endIndex + 1) }
}
