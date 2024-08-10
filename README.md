
# Divboard

The developer's notebook.

What does this mean? I'm still figuring it out, and maybe I'll tell you at some point, but for now I'm just going to document the development process so I don't forget.

## Development

We have a bit of a frugal approach here:

 - We care very much about the exact contents of the DOM here, so frameworks like React, useful as they are, are deemed to be more trouble than they're worth.
 - No assets loaded externally (e.g. from CDNs).
 - We keep an eye on bundle sizes and try to keep everything lightweight.
 - Supporting older browsers or niche browsers that aren't standards-compliant adds noise to the code and isn't worth it. We should however aim for compatability across modern versions of browsers that have significant market share.
 - Should generally be possible to iterate on the code without any build process (ideally even over file URLs rather than requiring a local server).

Despite the above, it's not realistic or desirable for us to eschew bundlers and NPM packages altogether. For instance, we rely on
[CodeMirror](https://codemirror.net/) and [YJS](https://github.com/yjs/yjs) as well as various other NPM packages to create our text editors.
So, the `./editor` directoy defines a Node package that is bundled with Rollup (via `npm run build`) to produce an entrypoint file in `./editor/build`
that can be referenced in `index.html`.

### Setup

```bash
git clone https://github.com/lloydeverett/divboard
cd divboard/editor
npm install
npm run build
```

Then open [./index.html](./index.html) in your browser and text editor and start editing.

## License

Copyright ©️ Lloyd Everett 2024. All rights reserved.

See more details in `LICENSE.md`, in particular regarding the licenses of third party dependencies.

I would like to explore a more open license for future releases, but I haven't gotten around to it yet. Feel free to get in touch.
