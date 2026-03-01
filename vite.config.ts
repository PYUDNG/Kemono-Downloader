import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import monkey, { cdn } from 'vite-plugin-monkey';
import path from 'path';
import pkg from './package.json';
import tailwindcss from '@tailwindcss/vite';
import postcssUrl from 'postcss-url';
import cssnano from 'cssnano';
import stringCssTransformer from './build-utils/stringCssTransformer.js';
import rem2px from 'postcss-rem-to-responsive-pixel';

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        tailwindcss(),
        vue(),
        stringCssTransformer(),
        monkey({
            entry: 'src/main.ts',
            userscript: {
                name: {
                    '': 'Kemono Downloader',
                    'en': 'Kemono Downloader',
                    'zh': 'Kemono下载器',
                    'zh-CN': 'Kemono下载器',
                    'zh-TW': 'Kemono下載器',
                },
                description: {
                    '': 'A modern UI, multi-download method, customizable Kemono downloader',
                    'en': 'A modern UI, multi-download method, customizable Kemono downloader',
                    'zh': '一個具有現代化UI、多下載途徑、可自定義的Kemono下載器',
                    'zh-CN': '一个具有现代化UI、多下载途径、可自定义的Kemono下载器',
                    'zh-TW': '一個具有現代化UI、多下載途徑、可自定義的Kemono下載器',
                },
                version: pkg.version,
                author: pkg.author.name,
                license: 'GPL-3.0-or-later',
                icon: 'https://kemono.cr/assets/favicon-CPB6l7kH.ico',
                namespace: 'https://greasyfork.org/users/667968-pyudng',
                match: [
                    'http*://*.kemono.party/*',
                    'http*://*.kemono.su/*',
                    'http*://*.kemono.cr/*',
                ],
                connect: [
                    'kemono.party',
                    'kemono.su',
                    'kemono.cr',
                    // Kemono swiches between domains frequently, so we add '*' to accept all domains
                    '*',
                ],
                supportURL: 'https://github.com/PYUDNG/Kemono-Downloader/issues',
                homepageURL: 'https://github.com/PYUDNG/Kemono-Downloader/',
            },
            build: {
                fileName: pkg.name + '.user.js',
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
                rem2px({
                    rootValue: 14,
                    propList: ['*'],
                    transformUnit: 'px',
                    mediaQuery: true,
                }),
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
    server: {
        host: true,
        https: {
            key: './server/localhost+1-key.pem',
            cert: './server/localhost+1.pem'
        }
    },
    build: {
        minify: false,
        emptyOutDir: false,
    },
});

