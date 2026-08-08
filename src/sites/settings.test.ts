import { beforeEach, describe, expect, it, vi } from 'vitest';

// —— mock：避免加载浏览器UI/i18n/IndexedDB相关模块 ——

vi.mock('@/i18n/main.js', async () => ({
    default: { global: { t: (key: string) => key } },
    i18nKeys: (await import('@/i18n/utils.js')).i18nKeys,
}));
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

import { modules } from '@/modules/settings/main.js';
import { registerSiteFilenameSetting } from './settings.js';
import { globalStorage } from '@/storage.js';
import type { Site } from './types.js';

const storage = globalStorage.withKeys('downloader');

beforeEach(() => {
    storage.set('filename', '{Name}');
});

describe('站点设置模块', () => {
    it('settings.js模块加载时注册独立的sites设置模块', () => {
        const siteModule = modules.value.find(m => m.id === 'sites');
        expect(siteModule).toBeDefined();
        expect(siteModule!.name).toBe('sites.settings.label');
        // 排序位：下载器(index 1)之后、关于(index Infinity)之前
        expect(siteModule!.index).toBe(2);
    });

    it('站点文件名设置注册到sites模块，且不依赖downloader模块', () => {
        const fakeSite = { id: 'test-site', label: 'Test Site' } as Site;
        registerSiteFilenameSetting(fakeSite);

        const siteModule = modules.value.find(m => m.id === 'sites')!;
        expect(siteModule.groups?.some(g => g.id === 'test-site' && g.name === 'Test Site')).toBe(true);
        const item = siteModule.items.find(i => i.id === 'site-filename');
        expect(item).toBeDefined();
        expect(item!.group).toBe('test-site');

        // 站点设置注册不依赖「下载器」设置模块存在
        expect(modules.value.some(m => m.id === 'downloader')).toBe(false);
    });
});
