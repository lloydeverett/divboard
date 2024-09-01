// constants
const HORIZONTAL_GUTTER_SIZE = 13;
document.documentElement.style.setProperty('--horizontal-gutter-size', `${HORIZONTAL_GUTTER_SIZE}px`);
document.documentElement.style.setProperty('--horizontal-gutter-size-negative', `-${HORIZONTAL_GUTTER_SIZE}px`);
const TITLEBAR_HEIGHT = 22;
document.documentElement.style.setProperty('--titlebar-height', `${TITLEBAR_HEIGHT}px`);
document.documentElement.style.setProperty('--titlebar-height-negative', `-${TITLEBAR_HEIGHT}px`);

// little wrapper around html_beautify
function beautifyHtmlInPlace(newHtml, originalSource, originalSourceStartIndex) {
    // we're going to beautify the code we insert, but html_beautify doesn't know what the indentation level is for the block as a whole
    // so we need to figure out what that is and then add extra indentation to the block ourselves
    let blockIndentation = '';
    for (let i = originalSourceStartIndex - 1; i >= 0 && originalSource[i] !== '\n'; i--) {
        if (originalSource[i] === ' ' || originalSource[i] === '\t') {
            blockIndentation = originalSource[i] + blockIndentation;
        } else {
            blockIndentation = '';
        }
    }
    return html_beautify(newHtml, { 'indent_size': 2 }).replace('\n', '\n' + blockIndentation);
}

// find the document ID
let docId;
const isFileUrl = window.location.protocol === 'file:';
if (!isFileUrl) {
    const docIdInPath = new URL(window.location.href).pathname.split('/').slice(1).join('/');
    docId = docIdInPath === '' ? 'index' : docIdInPath;
} else {
    const urlParams = new URLSearchParams(window.location.search);
    if (!urlParams.has('doc')) {
        urlParams.set('doc', 'index');
        window.location.search = urlParams;
    }
    docId = urlParams.get('doc');
}
document.title = docId + " – divboard";
$(function () {
    $("#document-name")[0].innerText = docId;
});

// CodeMirror editor + markup rendering
collab.init(docId).then(() => {$(function () {
    let markupEditor;
    let srcEditor;
    let cssEditor;

    // applying input CSS to divboard
    function applyStyles() {
        $('#divboard-input-styles').html(cssEditor.state.doc.toString());
    }

    let blessedRenderedHtml = null; // "bless" known rendered html so we don't later think this is a DOM mutation
    let blessedEditorMarkupContent = null; // same thing in reverse, so we don't do a re-render when dispatching changes to the editor

    // initialise editors
    markupEditor = collab.createMarkupEditor($('#markup-edit')[0], function(e) {
        if (markupEditor.state.doc.toString() !== blessedEditorMarkupContent) {
            const parseResult = parse.domNodeToUpdateForMarkupChanges(e.startState.doc.toString(), e.state.doc.toString(), $('#divboard-container')[0]);
            if (parseResult !== null) {
                renderMarkup(parseResult.node, parseResult.html);
            }
        }
        blessedEditorMarkupContent = null;
    });
    srcEditor = collab.createSrcEditor($('#src-edit')[0], function(e) {
        updateSrcEvaluationButton();
    });
    cssEditor = collab.createCssEditor($('#css-edit')[0], function(e) {
        applyStyles();
    });

    // apply styles
    applyStyles();

    // mutation observer to update markup according to divboard changes
    new MutationObserver(function(mutations) {
        if ($('#divboard-container').html() !== blessedRenderedHtml) {
            let markupStr = markupEditor.state.doc.toString();
            mutations.forEach((mutation) => {
                const parseResult = parse.markupChangesForDomMutation(markupStr, mutation, $('#divboard-container')[0]);
                if (parseResult === null) {
                    return;
                }

                const markupChanges = { from: parseResult.from, to: parseResult.to, insert: beautifyHtmlInPlace(parseResult.html, markupStr, parseResult.from) };

                const newContents = markupStr.slice(0, markupChanges.from) + markupChanges.insert + markupStr.slice(markupChanges.to);

                blessedEditorMarkupContent = newContents;

                markupEditor.dispatch({
                    changes: markupChanges
                });

                markupStr = newContents;
            });
        }
        blessedRenderedHtml = null;
    }).observe($('#divboard-container')[0], {
        characterData: true, attributes: true, childList: true, subtree: true
    });

    // rendering of input markup to divboard
    function renderMarkup(node, html) {
        if (node.id === 'divboard-container') {
            $('#divboard-container')[0].innerHTML = html;
        } else {
            node.outerHTML = html;
        }
        blessedRenderedHtml = $('#divboard-container').html();
    }
    renderMarkup($('#divboard-container')[0], markupEditor.state.doc.toString());

    // set up src evaluation button
    function updateSrcEvaluationButton() {
        // only display src evaluation button if the source hasn't already been evaluated
        if (collab.getSrcEvaluated() !== srcEditor.state.doc.toString()) {
            $('#src-evaluate-button').show();
        } else {
            $('#src-evaluate-button').hide();
        }
    }
    collab.setSrcEvaluatedChangedHandler(function() {
        new Function(collab.getSrcEvaluated())();
        updateSrcEvaluationButton();
    });
    updateSrcEvaluationButton();
    $('#src-evaluate-button').click(function() {
        collab.setSrcEvaluated(srcEditor.state.doc.toString());
    });

    // start accepting edits
    $('#divboard-container').attr('contenteditable', 'true');
})});

$(function() {
    // handle viewport width changes, set up splits, and put divboard container elem in the right place
    let divboardContainer = $('<div class="divboard-container" id="divboard-container"></div>');
    let activeSplits = []
    let showingWideLayout = null;
    function onViewportWidthChanged() {
        const width = $(window).width();
        const thresholdWidth = 900;
        if (width >= thresholdWidth && (showingWideLayout === null || !showingWideLayout)) {
            showingWideLayout = true;
            $(document.body).addClass('wide-layout');
            $(document.body).removeClass('non-wide-layout');
            $('.if-wide-layout').show();
            $('.if-non-wide-layout').hide();
            $('#main-content-divboard-container-parent').append(divboardContainer);
            activeSplits.forEach(function(split) { split.destroy(); })
            activeSplits = [
                Split(['#markup', '#src', '#css'], {
                minSize: 0,
                gutterSize: TITLEBAR_HEIGHT,
                direction: 'vertical'
                }),
                Split(['#main-content', '#stack'], {
                minSize: 0,
                gutterSize: HORIZONTAL_GUTTER_SIZE,
                direction: 'horizontal',
                sizes: [60, 40]
                }),
            ];
        } else if (width < thresholdWidth && (showingWideLayout === null || showingWideLayout)) {
            showingWideLayout = false;
            $(document.body).addClass('non-wide-layout');
            $(document.body).removeClass('wide-layout');
            $('.if-wide-layout').hide();
            $('.if-non-wide-layout').show();
            $('#stack-divboard-container-parent').append(divboardContainer);
            activeSplits.forEach(function(split) { split.destroy(); })
            activeSplits = [
                Split(['#output-displayed-in-stack', '#markup', '#src', '#css'], {
                minSize: 0,
                gutterSize: TITLEBAR_HEIGHT,
                direction: 'vertical',
                sizes: [45, 55 / 3, 55 / 3, 55 / 3]
                })
            ];
        }
    }
    onViewportWidthChanged();
    $(window).on("resize", function(event) {
        onViewportWidthChanged();
    });

    // button group implementation
    $('.button-group > .button').click(function (event) {
        $(event.currentTarget.parentNode.childNodes).removeClass('button-selected');
        $(event.currentTarget).addClass('button-selected');
    });
});
