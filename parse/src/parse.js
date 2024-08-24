import * as htmlparser2 from "htmlparser2";

function getDomPath(el, rootId) {
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

    throw new Error("Couldn't get DOM path for element: not a descendant of root element ID");
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

export function markupChangesForMutation(markup, mutation, markupRootId) {
    const markupAst = htmlparser2.parseDocument(markup, {
        withStartIndices: true,
        withEndIndices: true
    });

    const element = mutation.target instanceof Element ? mutation.target : mutation.target.parentElement;
    const path = getDomPath(element, markupRootId);

    // do our best to find the corresponding element in the parsed markup
    const { astNode, pathFollowed } = followDomPathBestEffort(markupAst, path);
    if (pathFollowed.length === 0 || astNode.startIndex === null || astNode.endIndex === null) {
        return { from: 0, to: markup.length, html: document.getElementById(markupRootId).innerHTML };
    }
    const elementAtPathFollowed = pathFollowed[pathFollowed.length - 1].element;
    return { from: astNode.startIndex, to: astNode.endIndex + 1, html: elementAtPathFollowed.outerHTML };
}
