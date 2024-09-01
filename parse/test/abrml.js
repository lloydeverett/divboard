import * as abrml from '../src/abrml.js';

console.log(abrml.abrmlToHtml(`
    <div>hello world</div>
    p { 🆎 }
    div {
        p { hello world }
    }
    div (class="moose") {
        p { hello world }
    }
    {{}}
    { p { hello world } }
`));
