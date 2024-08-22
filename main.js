// constants
const HORIZONTAL_GUTTER_SIZE = 13;
document.documentElement.style.setProperty('--horizontal-gutter-size', `${HORIZONTAL_GUTTER_SIZE}px`);
document.documentElement.style.setProperty('--horizontal-gutter-size-negative', `-${HORIZONTAL_GUTTER_SIZE}px`);
const TITLEBAR_HEIGHT = 22;
document.documentElement.style.setProperty('--titlebar-height', `${TITLEBAR_HEIGHT}px`);
document.documentElement.style.setProperty('--titlebar-height-negative', `-${TITLEBAR_HEIGHT}px`);

// storage getters and setters (wrapped in functions so we can change the storage backend or easily disable)
function storageGet(key) {
    return '';
    // return window.localStorage.getItem(key);
}
function storageSet(key, value) {
    // return window.localStorage.setItem(key, value);
}

// grab data from storage
// let storedMarkup = storageGet('markup');
// if (typeof storedMarkup === 'undefined') {
//     storedMarkup = '';
// }
// let storedSrc = storageGet('src');
// if (typeof storedSrc === 'undefined') {
//     storedSrc = '';
// }
// let storedCss = storageGet('css');
// if (typeof storedCss === 'undefined') {
//     storedCss = '';
// }

// CodeMirror editor setup
const urlParams = new URLSearchParams(window.location.search);
if (!urlParams.has('doc')) {
    urlParams.set('doc', 'index');
    window.location.search = urlParams;
}
const docId = urlParams.get('doc');
editor.init(docId).then(() => {
    let markupEditor;
    let srcEditor;
    let cssEditor;

    // applying input CSS to divboard
    function applyStyles() {
        $('#divboard-input-styles').html(cssEditor.state.doc.toString());
    }

    markupEditor = editor.createMarkupEditor($('#markup-edit')[0], function() {
        storageSet('markup', markupEditor.state.doc.toString());
        renderMarkup();
    });
    srcEditor = editor.createSrcEditor($('#src-edit')[0], function() {
        storageSet('src', srcEditor.state.doc.toString());
    });
    cssEditor = editor.createCssEditor($('#css-edit')[0], function () {
        storageSet('css', cssEditor.state.doc.toString());
        applyStyles();
    });

    applyStyles();

    // mutation observer to update markup according to divboard changes
    new MutationObserver(function(m) {
        if ($('#divboard-container').html() !== blessedInnerHtml) {
            // $('#markup-edit').text(html_beautify($('#divboard-container').html()));
            storageSet('markup', markupEditor.state.doc.toString());
        }
    }).observe($('#divboard-container')[0], {
        characterData: true, attributes: true, childList: true, subtree: true
    });
});

// handle viewport width changes, and put divboard container elem in the right place
let divboardContainer = $('<div class="divboard-container" id="divboard-container" contenteditable="true"></div>');
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

// rendering of input markup to divboard
let blessedInnerHtml; // "bless" known innerHtml so we don't later think this is a DOM mutation
function renderMarkup() {
    // $('#divboard-container').html($('#markup-edit').text());
    // blessedInnerHtml = $('#divboard-container').html();
}
renderMarkup();

// button group implementation
$('.button-group > .button').click(function (event) {
    $(event.currentTarget.parentNode.childNodes).removeClass('button-selected');
    $(event.currentTarget).addClass('button-selected');
});
