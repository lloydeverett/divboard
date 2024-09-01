import * as htmlparser2 from "htmlparser2";    

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function base64ToString(base64) {
    const binString = atob(base64);
    return decoder.decode(Uint8Array.from(binString, (m) => m.codePointAt(0)));
}

function stringToBase64(str) {
    const binString = Array.from(encoder.encode(str), (byte) => String.fromCodePoint(byte)).join("");
    return btoa(binString);
}

export function abrmlToHtml(abrml) {

    // '🆎'  --> '🆎🆎'
    // '{' --> '<b🆎 ' (note the space at the end)
    // '}' --> '</b🆎>'
    // we're gonna need to store the tag based on startindex or something rather than using attrs
    // fix bug where on startup editor renders before text has been fetched and updated fully

    // ok, so, a predicament
    // we want to parse an abbreviated form of HTML that offers some syntactical niceties but otherwise is basically HTML
    // parsing HTML is *really* complex, especially if you want to be error-tolerant which we need, and we don't want to
    // parse it from scratch
    // and even if we did write our own parser for ABRML, that parser needs to agree with, and be error-tolerant in the
    // exact same way as, the parser we use for normal HTML, meaning we can't just run our grammar through a parser-generator
    // and call it a day

    // so, we're going to use this crazy hack that lets us turn abrml --> HTML with just regex string replacements
    // and then we can run the result through htmlparser2 and modify the resulting tree
    // regexes are fundamentally not suited to doing this transformation correctly, because they are not context-aware
    // but we don't care, because we can afford to be wrong
    // consider, for instance, that if we take
    //    <div foo="{bar}">
    // our regex isn't going to know that the braces are in quotes, and we're going to get excited and start turning
    // the {} braces here into HTML open / close tags
    // but it's okay! because we just need to be able to undo our mistake later after htmlparser2 does the difficult
    // work of parsing

    // the general principle is that we mark all of our substitutions with a special character 🆎
    // so that, if they were made in error, we can revert them later if we see any instances of 🆎
    // of course, we don't want the parser to break if a user ever uses 🆎 in their markup
    // we can get around this by, as a preprocessing step, doubling up on the user's 🆎, and then
    // undoing that as a postprocessing step
    // so, putting this all together, our subsitutions will look like this (and in this order):

    // 🆎       -------->   🆎🆎
    // {{       ------->   (🆎lbrace)
    // }}       ------->   (🆎rbrace)
    // word (   ------->   <b🆎 data-🆎-tag="base64[word]" data-🆎-start-replaced="base64[word (]"
    // ) {      ------->   data-🆎-end-replaced="base64[) {]">
    // word {   ------->   <b🆎 data-🆎-tag="base64[word]" data-🆎-replaced="base64[word {]">
    // {        ------->   <b🆎>
    // }        ------->   </b🆎>

    // cheap and hacky, for sure. but it works and it's reasonably fast!

    const substitutions = [
        { forwards: { find: '🆎', replace: '🆎🆎' }, backwards: { find: '🆎🆎', replace: '🆎' } },
        { forwards: { find: '{{', replace: '[🆎lbrace]' }, backwards: { find: '[🆎lbrace]', replace: '{' } },
        { forwards: { find: '}}', replace: '[🆎rbrace]' }, backwards: { find: '[🆎rbrace]', replace: '}' } },
        {
            // word (
            forwards: {
                find: /([\w-]+)\s*\(/g,
                replace: (match, tag) => `<b🆎 data-🆎-tag="${stringToBase64(tag)}" data-🆎-start-replaced="${stringToBase64(match)}" `
            },
            backwards: {
                find: /<b🆎 data-🆎-tag="([A-Za-z0-9=+/]*)" data-🆎-start-replaced="([A-Za-z0-9=+/]*)" /g,
                replace: (match, tag, replaced) => base64ToString(replaced)
            }
        },
        {
            // ) {
            forwards: {
                find: /\)\s*{/g,
                replace: (match) => ` data-🆎-end-replaced="${stringToBase64(match)}">`
            },
            backwards: {
                find: / data-🆎-end-replaced="([A-Za-z0-9=+/]*)">/g,
                replace: (match, replaced) => base64ToString(replaced)
            }
        },
        {
            // word {
            forwards: {
                find: /([\w-]+)\s*{/g,
                replace: (match, tag) => `<b🆎 data-🆎-tag="${stringToBase64(tag)}" data-🆎-replaced="${stringToBase64(match)}">`
            },
            backwards: {
                find: /<b🆎 data-🆎-tag="([A-Za-z0-9=+/]*)" data-🆎-replaced="([A-Za-z0-9=+/]*)">/g,
                replace: (match, tag, replaced) => base64ToString(replaced)
            }
        },
        { forwards: { find: '{', replace: '<b🆎>' }, backwards: { find: '<b🆎>', replace: '{' } },
        { forwards: { find: '}', replace: '</b🆎>' }, backwards: { find: '</b🆎>', replace: '}' } },
    ];

    function replaceAllWithIndexTracking() {
        differences = [0, 0, 0, 0]
        differences[1] = 2
        differences[3] = 1;
    }

    let result = abrml;

    for (let i = 0; i < substitutions.length; i++) {
        const subst = substitutions[i];
        result = result.replaceAll(subst.forwards.find, subst.forwards.replace);
    }

    // ok, so we've made the substitutions in the 'forwards' direction, now let's parse the result into an AST
    // we have some tricks up our sleeve here too: note that when you call htmlparser2.parseDocument it's really
    // just passing in the DomHandler to the imperative parser API
    // so, if we want to get our grubby hands in and intercept the creation of the DOM tree, we can do so by
    // subclassing DomHandler
    // we also pass in a custom elemeent handler so we can intercept element creation
    {
        class CustomDomHandler extends htmlparser2.DomHandler {
            onopentag(name, attributes) {
                console.log('open ' + name, attributes);
                super.onopentag('foobar' + name, attributes);
            }
            ontext(text) {
                console.log('text ' + text);
                super.ontext(text);
            }
            onclosetag(tagname) {
                console.log('close ' + tagname);
                super.onclosetag('foobar' + tagname);
            }
        }
        let handler = new CustomDomHandler(null, null, element => {
            // custom element handler -- called after element production 
            console.log(element);
        });
        const parser = new htmlparser2.Parser(handler);
        parser.write(
            "<div><p>foo<p></div><p>bar</p>",
        );
        parser.end();
    }

    // const ast = htmlparser2.parseDocument(result, {
    //     withStartIndices: true,
    //     withEndIndices: true
    // });
    // console.log(ast);

    // for (let i = substitutions.length - 1; i >= 0; i--) {
    //     const subst = substitutions[i];
    //     result = result.replaceAll(subst.backwards.find, subst.backwards.replace);
    // }

    return result;
}

export function htmlToAbrml(html, autoAbbreviateTags) {
    // double up on special chars
    // insert marker attrs with a special char that you can do a regex search for
    // beautify the html
    // look for marker attrs and turn it into abrml syntax
    // un-double up on special chars
}
