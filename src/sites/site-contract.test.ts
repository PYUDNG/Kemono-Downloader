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
vi.mock('@/modules/downloader/main.js', () => ({
    // 站点契约测试只关心resolve/expand/模块声明；下载器主模块会连带加载providers，与测试无关
    downloadResource: vi.fn(),
}));

import { detectSite } from './main.js';
import { testChecker } from '@/utils/main.js';
import { defineModule } from '@/modules/types.js';
import type { Site } from './types.js';

/**
 * 一个完全非Kemono系的最小示例站点：图库站  
 * 仅用于验证通用Site契约（自定义域名命中逻辑、自定义页面/请求kind、不依赖任何Kemono类型）
 */
const gallerySite: Site = {
    id: 'gallery-demo',
    label: 'Gallery Demo',
    // 自定义域名命中逻辑：仅当主机为图库站时命中（func checker逃生口）
    hosts: {
        type: 'func',
        value: () => location.hostname === 'gallery.example.com',
    },
    modules: {
        gallery: _site => defineModule({
            id: 'gallery',
            name: 'Gallery Page',
            checkers: [{ type: 'regpath', value: /^\/g\/\d+$/ }],
            readyState: 'interactive',
            enter() {
                // 页面注入逻辑（示例，浏览器UI不在单测范围）
            },
            leave() {
                // 清理逻辑（示例）
            },
        }),
    },
    resolve(request) {
        if (request.kind === 'gallery') {
            const { galleryId } = request as { kind: 'gallery'; galleryId: string };
            return {
                id: galleryId,
                type: 'gallery',
                name: null,
                meta: {},
                source: { galleryId },
            };
        }
        throw new Error(`unsupported request kind: ${ request.kind }`);
    },
    async expand(resource) {
        // 不依赖任何Kemono类型：直接构建文件列表
        resource.name = 'Demo Gallery';
        resource.meta = { GalleryID: resource.id };
        resource.files = [{
            kind: 'download',
            name: 'img-1.jpg',
            path: '/images/1.jpg',
            url: 'https://cdn.gallery.example.com/images/1.jpg',
        }];
        resource.available = true;
    },
};

beforeEach(() => {
    // 还原测试环境（与tests/setup.ts一致）
    (globalThis as any).location.host = 'kemono.cr';
    (globalThis as any).location.hostname = 'kemono.cr';
    (globalThis as any).location.pathname = '/fanbox/user/8062849';
});

describe('通用Site契约（非Kemono示例站点）', () => {
    it('detectSite通过自定义hosts checker命中/不命中站点', () => {
        (globalThis as any).location.hostname = 'gallery.example.com';
        (globalThis as any).location.host = 'gallery.example.com';
        expect(detectSite([gallerySite])).toBe(gallerySite);

        (globalThis as any).location.hostname = 'other.example.com';
        (globalThis as any).location.host = 'other.example.com';
        expect(detectSite([gallerySite])).toBeNull();
    });

    it('detectSite默认列表仍正确命中真实站点（生产路径不变）', () => {
        expect(detectSite()?.id).toBe('kemono');
    });

    it('模块工厂产出携带站点checkers的Module', () => {
        const mod = gallerySite.modules.gallery(gallerySite);

        (globalThis as any).location.pathname = '/g/42';
        expect(testChecker(mod.checkers!)).toBe(true);

        (globalThis as any).location.pathname = '/about';
        expect(testChecker(mod.checkers!)).toBe(false);
    });

    it('resolve/expand端到端走通，不依赖任何Kemono形状', async () => {
        const resource = gallerySite.resolve({ kind: 'gallery', galleryId: '42' });
        expect(resource.type).toBe('gallery');
        expect(resource.source).toEqual({ galleryId: '42' });

        await gallerySite.expand(resource);

        expect(resource.name).toBe('Demo Gallery');
        expect(resource.meta.GalleryID).toBe('42');
        expect(resource.available).toBe(true);
        expect(resource.files).toEqual([{
            kind: 'download',
            name: 'img-1.jpg',
            path: '/images/1.jpg',
            url: 'https://cdn.gallery.example.com/images/1.jpg',
        }]);
    });

    it('resolve对未声明的请求kind抛错', () => {
        expect(() => gallerySite.resolve({ kind: 'unknown-kind' })).toThrow('unsupported request kind');
    });
});
