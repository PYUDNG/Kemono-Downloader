import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import monkey, { cdn } from 'vite-plugin-monkey';
import path from 'path';
import pkg from './package.json';
import tailwindcss from '@tailwindcss/vite'
import postcssUrl from 'postcss-url';
import cssnano from 'cssnano';
import stringCssTransformer from './build-utils/stringCssTransformer.js';

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        tailwindcss(),
        vue(),
        stringCssTransformer(),
        monkey({
            entry: 'src/main.ts',
            userscript: {
                icon: 'https://kemono.cr/assets/favicon-CPB6l7kH.ico',
                version: pkg.version,
                author: pkg.author.name,
                namespace: 'https://greasyfork.org/users/667968-pyudng',
                match: [
                    'http*://*.kemono.party/*',
                    'http*://*.kemono.su/*',
                    'http*://*.kemono.cr/*',
                ],
            },
            build: {
                externalGlobals: {
                    vue: cdn.jsdelivr('Vue', 'dist/vue.global.prod.js'),
                },
                cssSideEffects: /* js */ `css => {
                    Array.isArray(window._importedStyles) ?
                        window._importedStyles.push(css) :
                        (window._importedStyles = [css]);
                }`,
            },
            styleImport: true,
        }),
    ],
    css: {
        postcss: {
            plugins: [
                cssnano(),
                postcssUrl({
                    url: 'inline',
                    ignoreFragmentWarning: true,
                }),
            ],
        },
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    build: {
        minify: true,
        emptyOutDir: false,
    },
});
