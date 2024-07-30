
[CodeMirror](https://codemirror.net/) is a code editor component from the web. The sources here (apart from `codemirror-init.js`, which acts as the entrypoint) are obtained from the [demo page](https://codemirror.net/try/).

We could chuck the sources in the root directory, load them with a `<script>` tag and call it a day, and that would be in keeping with the general theme in this repository of using build tools sparingly. Unfortunately, though, we are up against a wall here, because:

 - We'd like divboards to be accessible via `file://` URLs.
 - CORS policies forbid `<script type="module">` tags for `file://` URLs.
 - CodeMirror is packaged as an ES Module and therefore its sources would need to be loaded as such.

So let's just use a bundler to produce plain old vanilla JS source from the ES modules:

```
npm install --global rollup @rollup/plugin-terser
# compile to a a self-executing function ('iife')
rollup ./src/codemirror-init.js --file ./build/codemirror-init.js --format iife --plugin @rollup/plugin-terser --output.name codemirror
```

Note that the [ThemeMirror](https://thememirror.net/) sources are also included here to help us style the editors.
