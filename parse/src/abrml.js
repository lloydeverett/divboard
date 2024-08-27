
export function abrmlToHtml(abrml) {
    let result = '';

    // we want to be hacky and use 🆎 as a special char, but that emoji might appear in the actual markup
    // if it does, double it up so we can tell the difference between our uses of 🆎 and the user's 🆎
    abrml = abrml.replace('🆎', '🆎🆎');

    // this is going to break, because you can't have braces in attr quotes now which sucks
    // but, you could potentially resolve that by dropping <abrbrace> from attributes with find / replace after parsing
    // v hacky
    // might make sense to have a string or tag nobody in their right mind would use
    // but, that probably, the parser accepts
    // e.g. '<🆎brace ...>'
    // and ensure ... is something you can match with a regex, i.e. no <> or special chars
    // cause you want to look for the very first >
    for (let i = 0; i < abrml.length; i++) {
        if (abrml[i] === '{') {
            result += '<🆎>';
            // todo add tag and all of that jazz by looking for preceding tokens
            // otherwise, I guess assume div
        } else if (abrml[i] === '}') {
            result += '</🆎>';
        } else if (abrml[i] === '\\' && i + 1 < abrml.length && (abrml[i + 1] === '{' || abrml[i + 1] === '}')) {
            result += abrml[i + 1];
            i++; // make sure we don't loop over the brace
        } else {
            result += abrml[i];
        }
    }

    // parse the result, then replace <abrbrace> with whatever the tag is actually supposed to be
    // and maybe include data-abr="true" as an attribute or something
    // and unescaped closing braces

    // look deeply in parse tree and replace '🆎🆎' with '🆎'

    // now maybe do the thing we suggested earlier - serialise the whole thing, and then replace <abbrace> with just { to cover edge
    // cases like attrs

    // try to somehow preserve start and end indices
}

export function htmlToAbrml(html, autoAbbreviateTags) {

}
