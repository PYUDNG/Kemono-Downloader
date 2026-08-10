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
import { dark, themeColor, resolveLocale } from './state.js';
import { globalStorage } from '@/storage.js';
import type { Ref } from 'vue';

const storage = globalStorage.withKeys('appearance');
const i18nMock = (await import('@/i18n/main.js')).default as {
    global: { t: (key: string) => string; locale: Ref<string> };
};

beforeEach(() => {
    (globalThis as any).navigator.language = 'en-US';
    // 预写入appearance存储对象（含默认值）：父键缺失时substorage监听器的旧值会解析为新值，导致首次变更被吞
    storage.set('themeColor', 'default');
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

describe('appearance设置模块', () => {
    it('注册appearance模块：位于下载器与关于之间，含3个设置项', () => {
        const module = modules.value.find(m => m.id === 'appearance');
        expect(module).toBeDefined();
        expect(module!.index).toBe(3);
        expect(module!.items.map(i => i.id)).toEqual(['language', 'dark-mode', 'theme-color']);
        // 模块名/标签为响应式（随语言切换更新）
        expect(module!.name).toBe('appearance.settings.label');
    });

    it('language设置驱动i18n locale实时切换', async () => {
        expect(i18nMock.global.locale.value).toBe('en-US'); // 默认auto + navigator

        storage.set('language', 'zh-Hans');
        await vi.waitFor(() => expect(i18nMock.global.locale.value).toBe('zh-Hans'));

        storage.set('language', 'zh-Hant');
        await vi.waitFor(() => expect(i18nMock.global.locale.value).toBe('zh-Hant'));

        storage.set('language', 'auto');
        await vi.waitFor(() => expect(i18nMock.global.locale.value).toBe('en-US'));
    });

    it('darkMode设置驱动dark状态（system在无matchMedia环境下视为浅色）', async () => {
        storage.set('darkMode', 'dark');
        await vi.waitFor(() => expect(dark.value).toBe(true));

        storage.set('darkMode', 'light');
        await vi.waitFor(() => expect(dark.value).toBe(false));

        storage.set('darkMode', 'system');
        await vi.waitFor(() => expect(dark.value).toBe(false)); // 测试环境无matchMedia
    });

    it('themeColor设置同步到state', async () => {
        storage.set('themeColor', 'blue');
        await vi.waitFor(() => expect(themeColor.value).toBe('blue'));

        storage.set('themeColor', 'purple');
        await vi.waitFor(() => expect(themeColor.value).toBe('purple'));
    });
});
