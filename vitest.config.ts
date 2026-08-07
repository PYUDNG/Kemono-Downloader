import { defineConfig } from 'vitest/config';
import path from 'path';

// 独立的 vitest 配置：不加载 vite.config.ts 中的 monkey/tailwind/postcss 等构建插件
export default defineConfig({
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    test: {
        environment: 'node',
        include: ['src/**/*.test.ts'],
        passWithNoTests: true,
    },
});
