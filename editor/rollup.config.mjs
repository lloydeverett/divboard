import terser from '@rollup/plugin-terser';
import nodeResolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

export default {
    input: './src/editor-init.js',
    output: {
        file: './build/editor-init.js',
        format: 'iife',
        name: 'editor',
    },
    plugins: [
        terser(),
        nodeResolve(),
        commonjs()
    ]
};
