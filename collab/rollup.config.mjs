import terser from '@rollup/plugin-terser';
import nodeResolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

export default {
    input: './src/collab-init.js',
    output: {
        file: './build/collab-init.js',
        format: 'iife',
        name: 'collab',
    },
    plugins: [
        terser(),
        nodeResolve(),
        commonjs()
    ]
};
