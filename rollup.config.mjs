import { rollupPluginHTML as html } from '@web/rollup-plugin-html';

export default {
    input: '*.html',
    output: {
        dir: 'dist',
	assetFileNames: '[name]-[hash][extname]'
    },
    plugins: [
	    html({ publicPath: '/' })
    ]
};
