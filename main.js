
// constants
const HORIZONTAL_GUTTER_SIZE = 13;
document.documentElement.style.setProperty('--horizontal-gutter-size', `${HORIZONTAL_GUTTER_SIZE}px`);
document.documentElement.style.setProperty('--horizontal-gutter-size-negative', `-${HORIZONTAL_GUTTER_SIZE}px`);
const TITLEBAR_HEIGHT = 22;
document.documentElement.style.setProperty('--titlebar-height', `${TITLEBAR_HEIGHT}px`);
document.documentElement.style.setProperty('--titlebar-height-negative', `-${TITLEBAR_HEIGHT}px`);

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
            Split(['#content', '#src', '#css'], {
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
            Split(['#output-displayed-in-stack', '#content', '#src', '#css'], {
              minSize: 0,
              gutterSize: TITLEBAR_HEIGHT,
              direction: 'vertical'
            })
        ];
    }
}
onViewportWidthChanged();
$(window).on("resize", function(event) {
    onViewportWidthChanged();
});

// load data from localStorage
let storedContent = ''; // window.localStorage.getItem('content');
if (typeof storedContent === 'undefined') {
    storedContent = '';
}
// $('#content-edit').html(storedContent);
let storedSrc = ''; // window.localStorage.getItem('src');
if (typeof storedSrc === 'undefined') {
    storedSrc = '';
}
// $('#src-edit').html(storedSrc);
let storedCss = ''; // window.localStorage.getItem('css');
if (typeof storedCss === 'undefined') {
    storedCss = '';
}
// $('#css-edit').html(storedCss);

// define function for saving markup
function saveMarkup() {
    // window.localStorage.setItem('content', $('#content-edit').html());
}

// pane input event listeners
$('#content-edit').on('input', function(event) {
    saveMarkup();
    renderMarkup();
});
$('#src-edit').on('input', function(event) {
    // window.localStorage.setItem('src', $('#src-edit').html());
});
$('#css-edit').on('input', function(event) {
    // window.localStorage.setItem('css', $('#css-edit').html());
    applyStyles();
});

// rendering of input markup to divboard
let blessedInnerHtml; // "bless" known innerHtml so we don't later think this is a DOM mutation
function renderMarkup() {
    $('#divboard-container').html($('#content-edit').text());
    blessedInnerHtml = $('#divboard-container').html();
}
renderMarkup();

// applying input CSS to divboard
function applyStyles() {
    $('#divboard-input-styles').html($('#css-edit').text());
}
applyStyles();

// mutation observer to update content according to divboard changes
new MutationObserver(function(m) {
    if ($('#divboard-container').html() !== blessedInnerHtml) {
        // $('#content-edit').text(html_beautify($('#divboard-container').html()));
        saveMarkup();
    }
}).observe($('#divboard-container')[0], {
    characterData: true, attributes: true, childList: true, subtree: true
});

// button group implementation
$('.button-group > .button').click(function (event) {
    $(event.currentTarget.parentNode.childNodes).removeClass('button-selected');
    $(event.currentTarget).addClass('button-selected');
});
