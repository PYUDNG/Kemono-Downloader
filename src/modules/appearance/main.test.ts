import { beforeEach, describe, expect, it, vi } from 'vitest';

// —— mock：避免加载浏览器UI/i18n/IndexedDB相关模块 ——

vi.mock('@/i18n/main.js', async () => {
    const { ref } = await import('vue');
    return {
        default: {
            global: {
                t: (key: string) => key,
                locale: ref('en'),
            },
        },
        i18nKeys: (await import('@/i18n/utils.js')).i18nKeys,
    };
});
vi.mock('@/utils/helpers/toast/main.js', () => ({
    toast: Object.assign(() => {}, { add: () => {}, remove: () => {} }),
}));
vi.mock('@/i18n/utils.js', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/i18n/utils.js')>()),
}));
vi.mock('@/modules/api/cache.js', () => ({
    hasCache: () => false,
    getCache: async () => null,
    saveCache: () => {},
    removeCache: () => {},
    clearCache: () => 0,
}));
vi.mock('@/styling.js', () => ({
    styling: { applyTo: () => () => {} },
}));

import './main.js';
import { modules } from '@/modules/settings/main.js';
import { resolveLocale, resolveDark } from './state.js';

beforeEach(() => {
    (globalThis as any).navigator.language = 'en-US';
});

describe('resolveLocale', () => {
    it('auto时使用浏览器语言', () => {
        expect(resolveLocale('auto', 'zh-CN')).toBe('zh-CN');
        expect(resolveLocale('auto', 'en-US')).toBe('en-US');
    });

    it('显式语言直接透传', () => {
        expect(resolveLocale('zh-Hans', 'en-US')).toBe('zh-Hans');
        expect(resolveLocale('zh-Hant', 'zh-CN')).toBe('zh-Hant');
        expect(resolveLocale('en', 'zh-CN')).toBe('en');
    });
});

describe('resolveDark', () => {
    it('dark始终为深色，light始终为浅色', () => {
        expect(resolveDark('dark', false)).toBe(true);
        expect(resolveDark('dark', true)).toBe(true);
        expect(resolveDark('light', false)).toBe(false);
        expect(resolveDark('light', true)).toBe(false);
    });

    it('system跟随系统偏好', () => {
        expect(resolveDark('system', true)).toBe(true);
        expect(resolveDark('system', false)).toBe(false);
    });
});

describe('appearance设置模块', () => {
    it('注册appearance模块：位于下载器与关于之间，含4个设置项', () => {
        const module = modules.value.find(m => m.id === 'appearance');
        expect(module).toBeDefined();
        expect(module!.index).toBe(3);
        expect(module!.items.map(i => i.id)).toEqual(['language', 'dark-mode', 'theme-color', 'custom-color']);
        // 模块名/标签为响应式（随语言切换更新）
        expect(module!.name).toBe('appearance.settings.label');
        // 自定义颜色为color类型设置项
        expect(module!.items.find(i => i.id === 'custom-color')!.type).toBe('color');
        // 主题色选项包含预设与自定义
        const themeOptions = module!.items.find(i => i.id === 'theme-color')!.props!.options;
        expect((themeOptions as any[]).map((o: any) => o.value)).toEqual(['default', 'blue', 'green', 'purple', 'custom']);
    });
});
