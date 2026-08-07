// @ts-check
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import pluginVue from 'eslint-plugin-vue';
import eslintConfigPrettier from 'eslint-config-prettier';
import globals from 'globals';

export default tseslint.config(
    {
        ignores: [
            'node_modules/**',
            'dist/**',
            'coverage/**',
            '.cowork-temp/**',
            'server/**',
            'scripts/readme-builder/**',
            'stats.html',
        ],
    },
    js.configs.recommended,
    ...tseslint.configs.recommended,
    ...pluginVue.configs['flat/essential'],
    {
        // 构建/发布脚本使用 Node 全局
        files: ['scripts/**/*.js', 'build-utils/**/*.js', '*.{js,mjs,cjs}'],
        languageOptions: {
            globals: {
                ...globals.node,
            },
        },
        rules: {
            // 与 TS 文件相同的 `_` 前缀忽略约定
            '@typescript-eslint/no-unused-vars': ['error', {
                'argsIgnorePattern': '^_',
                'varsIgnorePattern': '^_',
                'caughtErrorsIgnorePattern': '^_',
            }],
        },
    },
    {
        files: ['**/*.{ts,vue}'],
        languageOptions: {
            globals: {
                ...globals.browser,
                ...globals.node,
            },
            parserOptions: {
                // TypeScript 语法交由 @typescript-eslint/parser 解析
                parser: tseslint.parser,
                sourceType: 'module',
            },
        },
        rules: {
            // 与现有代码风格保持一致
            'no-console': 'off',
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-empty-object-type': 'off',
            // 代码库惯用 `expr && doSomething()` 模式
            '@typescript-eslint/no-unused-expressions': 'off',
            // 代码库惯用 `const self = this` 模式
            '@typescript-eslint/no-this-alias': 'off',
            // TS 文件交由 tsc 处理未定义标识符（vue-tsc 已做类型检查）
            'no-undef': 'off',
            // 代码库约定：`_` 前缀参数表示有意未使用
            '@typescript-eslint/no-unused-vars': ['error', {
                'argsIgnorePattern': '^_',
                'varsIgnorePattern': '^_',
                'caughtErrorsIgnorePattern': '^_',
            }],
            // 设置项是响应式注册表对象，子组件直接修改其 value 是架构设计
            'vue/no-mutating-props': 'off',
            'vue/multi-word-component-names': 'off',
            'vue/require-default-prop': 'off',
        },
    },
    // prettier 冲突规则关闭（格式由 prettier 负责，此项目不强制运行）
    eslintConfigPrettier,
);
