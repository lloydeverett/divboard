import terser from '@rollup/plugin-terser';
import nodeResolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

export default {
    input: './src/parse.js',
    output: {
        file: './build/parse.js',
        format: 'iife',
        name: 'parse',
    },
    plugins: [
        terser(),
        nodeResolve(),
        commonjs()
    ]
};
