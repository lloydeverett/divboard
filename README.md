
# Divboard

The developer's notebook.

What does this mean? I'm still figuring it out, and maybe I'll tell you at some point, but for now I'm just going to make sure I've documented the development process.

## Development

We have a bit of a frugal approach here:

 - We care very much about the exact contents of the DOM here, so frameworks like React, useful as they are, are deemed to be more trouble than they're worth, and also because...
 - I want it to be possible to pick up development on this with just a text editor and a browser. We even avoid requiring a local HTTP server: it should be possible to toy with divboards with just file URLs (which does unfortunately mean contending with some CORS difficulties). This limits us to vanilla JS.
 - All dependencies included in this repository. This includes not loading any assets from CDNs or other external sources.
 - Let's keep the load time short within reason. Try to keep the bundle size small and eschew dependencies that waste precious bytes.
 - Supporting older browsers or niche browsers that aren't standards-compliant adds noise to the code and isn't worth it. We should however aim for compatability across modern versions of browsers that have significant market share.

### Iterating

This is one area where our frugality pays off in that this is dead simple. Open [./index.html](./index.html) in your browser and text editor and modify to your heart's content.

### CodeMirror

[CodeMirror](https://codemirror.net/) is our code editor component of choice and does require running a bundler. See notes in [./codemirror/README.md](./codemirror/README.md).
