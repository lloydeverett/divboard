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

// some definitions we'll need to handle user-defined functions
const srcPrefix = `
function onBoardChanged() {};
`;
const srcSuffix = `
return {
    onBoardChanged: onBoardChanged
};
`
function evalOnBoardChanged() { evalUdf('onBoardChanged') }
function postprocessUserSrcString(str) {
    return srcPrefix + str + srcSuffix;
}
const defaultUdfs = new Function(postprocessUserSrcString(''))();
let currentUdfs = null;
function evalUdf(name, params) {
    if (currentUdfs === null) {
        return !!params ? defaultUdfs[name](...params) : defaultUdfs[name]();
    }
    try {
        return !!params ? currentUdfs[name](...params) : currentUdfs[name]();
    } catch (err) {
        // TODO Reflect this in the UI properly, perhaps in a console window
        console.warn('Exception thrown while evaluating user-defined function. Will fall back to default function definition instead.',
            name,
            err
        );
        return !!params ? defaultUdfs[name](...params) : defaultUdfs[name]();
    }
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

        evalOnBoardChanged();
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
    function evaluateSrc() {
        const src = collab.getSrcEvaluated();
        let fn;
        try {
            fn = new Function(postprocessUserSrcString(src));
        } catch(err) {
            // TODO Reflect this in the UI properly, perhaps in a console window
            console.error('Exception thrown while parsing source. Will keep using functions defined in previous successful evaluation.',
                src,
                err
            );
            return;
        }
        try {
            currentUdfs = fn();
        } catch (err) {
            // TODO Reflect this in the UI properly, perhaps in a console window
            console.error('Exception thrown while evaluating source. Will keep using functions defined in previous successful evaluation.',
                src,
                err
            );
        }
    }
    function updateSrcEvaluationButton() {
        // only display src evaluation button if the source hasn't already been evaluated
        if (collab.getSrcEvaluated() !== srcEditor.state.doc.toString()) {
            $('#src-evaluate-button').show();
        } else {
            $('#src-evaluate-button').hide();
        }
    }
    collab.setSrcEvaluatedChangedHandler(function() {
        evaluateSrc();
        updateSrcEvaluationButton();
    });
    updateSrcEvaluationButton();
    $('#src-evaluate-button').click(function() {
        collab.setSrcEvaluated(srcEditor.state.doc.toString());
    });

    // start accepting edits
    $('#divboard-container').attr('contenteditable', 'true');

    // initial src evaluation
    evaluateSrc();
})});

$(function() {
    // layout setup - create splits, put divboard container elem in the right place, and respect sidebar shown / hidden preference
    const thresholdWidth = 900;
    let divboardContainer = $('<div class="divboard-container" id="divboard-container"></div>');
    let activeSplits = []
    let showingWideLayout = null;
    let sidebarShown = true;
    function updateLayout() {
        const width = $(window).width();
        if (width >= thresholdWidth) {
            showingWideLayout = true;
            $(document.body).addClass('wide-layout');
            $(document.body).removeClass('non-wide-layout');
            $('.if-wide-layout').show();
            $('.if-non-wide-layout').hide();
            $('#main-content-divboard-container-parent').append(divboardContainer);
            activeSplits.forEach(function(split) { split.destroy(); })
            if (sidebarShown) {
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
            } else {
                activeSplits = [];
            }
        } else if (width < thresholdWidth) {
            showingWideLayout = false;
            $(document.body).addClass('non-wide-layout');
            $(document.body).removeClass('wide-layout');
            $('.if-wide-layout').hide();
            $('.if-non-wide-layout').show();
            $('#stack-divboard-container-parent').append(divboardContainer);
            activeSplits.forEach(function(split) { split.destroy(); })
            if (sidebarShown) {
                activeSplits = [
                    Split(['#output-displayed-in-stack', '#markup', '#src', '#css'], {
                        minSize: 0,
                        gutterSize: TITLEBAR_HEIGHT,
                        direction: 'vertical',
                        sizes: [45, 55 / 3, 55 / 3, 55 / 3]
                    })
                ];
            } else {
                activeSplits = [];
            }
        }
    }
    updateLayout();

    // handle viewport width changes
    function onViewportWidthChanged() {
        const width = $(window).width();
        if ((width >= thresholdWidth && (showingWideLayout === null || !showingWideLayout)) ||
            (width < thresholdWidth && (showingWideLayout === null || showingWideLayout))) {
            updateLayout();
        }
    }
    $(window).on("resize", function(event) {
        onViewportWidthChanged();
    });

    // button group implementation
    $('.button-group > .button').click(function (event) {
        $(event.currentTarget.parentNode.childNodes).removeClass('button-selected');
        $(event.currentTarget).addClass('button-selected');
    });

    // sidebar show/hide implementation
    $('.sidebar-visibility-toggle').click(function() {
        sidebarShown = !sidebarShown;
        $(document.body).toggleClass('sidebar-shown', sidebarShown);
        updateLayout();
    });
    $(document.body).toggleClass('sidebar-shown', sidebarShown);

    // we want to style scrollbars via webkit styles if and only if the user agent is not hiding scrollbars
    // we can do this by creating a measruement node and then determining the width of its scrollbars
    // we'll have to do this in an iframe because applying *any* styles to scrollbars on this page will
    // totally prevent us from measuring the default behaviour (webkit custom scrollbar styling is rather
    // all or nothing)
    const iframe = document.createElement("iframe");
    iframe.srcdoc = `<!doctype html>
    <head></head>
    <body>
        <div id="scroll-div" style="width: 100px; height: 100px; overflow: scroll;"></div>
        <script>
            const scrollDiv = document.getElementById("scroll-div");
            function postScrollbarWidth() {
                const scrollbarWidth = scrollDiv.offsetWidth - scrollDiv.clientWidth;
                window.parent.postMessage({ scrollbarWidth: scrollbarWidth }, "*");
            }
            postScrollbarWidth();
            new ResizeObserver(postScrollbarWidth).observe(scrollDiv);
        </script>
    </body>`;
    iframe.style.width = '600px';
    iframe.style.height = '400px';
    iframe.style.border = 'none';
    iframe.style.position = 'absolute';
    iframe.style.top = '-9999px'; // make sure this isn't visible
    window.addEventListener('message', function(event) {
        if (event.source === iframe.contentWindow) {
            const scrollbarWidth = event.data.scrollbarWidth;
            if (scrollbarWidth === 0) {
                $('#scrollbar-styles').html('');
            } else {
                $('#scrollbar-styles').html(`
                    ::-webkit-scrollbar {
                        background-color: #00000020;
                        width: 8px;
                        height: 8px;
                    }
                    ::-webkit-scrollbar-track {
                        background-color: #00000000;
                    }
                    ::-webkit-scrollbar-thumb {
                        background-color: #00000065;
                        border-radius: 4px;
                    }
                    ::-webkit-scrollbar-button {
                        display: none;
                    }
                    ::-webkit-scrollbar-corner {
                        background-color: #00000020;
                    }
                `);
            }
        }
    });
    document.body.appendChild(iframe);
});
