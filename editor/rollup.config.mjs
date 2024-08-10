import terser from '@rollup/plugin-terser';
import nodeResolve from '@rollup/plugin-node-resolve';

export default {
    input: './src/editor-init.js',
    output: {
        file: './build/editor-init.js',
        format: 'iife',
        name: 'editor',
    },
    plugins: [
        terser(),
        nodeResolve()
    ]
};
