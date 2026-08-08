import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';
import Icons from 'unplugin-icons/vite';
import path from 'path';

// 独立的 vitest 配置：仅加载测试所需的插件（vue SFC 转换 + 图标），不加载 monkey/tailwind/postcss 等构建插件
export default defineConfig({
    plugins: [
        vue(),
        Icons({
            compiler: 'vue3',
        }),
    ],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
            // vite-plugin-monkey 的 `$` 虚拟模块在测试环境不可用，替换为内存 mock
            '$': path.resolve(__dirname, './tests/mocks/gm.ts'),
        },
    },
    test: {
        environment: 'node',
        include: ['src/**/*.test.ts'],
        setupFiles: ['./tests/setup.ts'],
        passWithNoTests: true,
        coverage: {
            provider: 'v8',
            // 只统计本次重构的核心新逻辑（浏览器UI/工具函数不在单测范围）
            include: [
                'src/sites/**',
                'src/modules/downloader/utils/**',
                'src/modules/downloader/types/**',
            ],
            exclude: [
                // 页面流程/组件为浏览器UI逻辑（Shadow DOM/对话框），纯类型文件无运行时逻辑，均不在单测范围
                'src/sites/kemono-family/flows/**',
                'src/sites/kemono-family/components/**',
                'src/sites/kemono-family/api-types/**',
                '**/*.test.*',
            ],
            thresholds: {
                lines: 60,
                statements: 55,
                functions: 45,
                branches: 40,
            },
        },
    },
});
