import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { FileSpec } from '@/modules/downloader/types/model.js';
import { __clearResponses, __clearStorage, __setResponse } from '../../tests/mocks/gm.js';

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

import { pawchive } from './pawchive.js';
import { globalStorage } from '@/storage.js';

const storage = globalStorage.withKeys('downloader');

// 与实测pawchive API一致的扁平结构响应（has_full: true 的完整帖子）
const FULL_POST_RESPONSE = {
    id: '12384631',
    user: '2629698',
    service: 'fanbox',
    title: 'LIVE2Dアニメ',
    content: '<p>本文</p>',
    embed: {},
    shared_file: false,
    added: '2026-08-07T14:00:00',
    published: '2026-08-07T23:00:00',
    edited: '2026-08-07T23:00:00',
    file: { name: 'cover.jpeg', path: '/3d/13/cover.jpeg' },
    attachments: [{ name: 'anim.mp4', path: '/ec/c1/anim.mp4' }],
    poll: null,
    captions: null,
    tags: null,
    preview_state: 'scraped',
    has_full: true,
    origin: 'import',
};

const PROFILE_RESPONSE = {
    id: '2629698',
    name: 'Creator Name',
    service: 'fanbox',
    public_id: null,
    relation_id: null,
    indexed: '2026-08-07T00:00:00',
    updated: '2026-08-07T00:00:00',
};

function registerFullPostResponses() {
    __setResponse('https://pawchive.pw/api/v1/fanbox/user/2629698/post/12384631', 200, FULL_POST_RESPONSE);
    __setResponse('https://pawchive.pw/api/v1/fanbox/user/2629698/profile', 200, PROFILE_RESPONSE);
}

beforeEach(() => {
    // pawchive测试环境：模拟运行于pawchive.pw
    (globalThis as any).location.host = 'pawchive.pw';
    (globalThis as any).location.hostname = 'pawchive.pw';

    __clearResponses();
    __clearStorage();
    storage.set('filename', '{Name}');
    storage.set('downloadOriginalImage', true);
    storage.set('noCoverFile', false);
    storage.set('textContent', 'none');
});

describe('pawchive.resolve', () => {
    it('post请求解析为post资源stub', () => {
        const resource = pawchive.resolve({
            kind: 'post', service: 'fanbox', creatorId: '2629698', postId: '12384631',
        });
        expect(resource.type).toBe('post');
        expect(resource.id).toBe('12384631');
        expect(resource.source).toEqual({
            service: 'fanbox', creatorId: '2629698', postId: '12384631',
        });
    });

    it('batch请求解析为合集资源', () => {
        const resource = pawchive.resolve({
            kind: 'batch',
            name: 'Creator',
            requests: [
                { kind: 'post', service: 'fanbox', creatorId: '1', postId: '100' },
            ],
        });
        expect(resource.type).toBe('posts');
        expect(resource.children).toHaveLength(1);
    });
});

describe('pawchive.expand', () => {
    it('展开完整帖子（扁平结构归一化）：填充名称/meta/files', async () => {
        registerFullPostResponses();

        const resource = pawchive.resolve({
            kind: 'post', service: 'fanbox', creatorId: '2629698', postId: '12384631',
        });
        await pawchive.expand(resource);

        expect(resource.name).toBe('LIVE2Dアニメ');
        expect(resource.available).toBe(true);
        expect(resource.meta.Title).toBe('LIVE2Dアニメ');
        expect(resource.meta.Creator).toBe('Creator Name');
        expect(resource.meta.Year).toBe(2026);
        expect(resource.meta.Month).toBe(8);

        // 附件 + 封面 = 2 个文件
        expect(resource.files).toHaveLength(2);
        const [attachment, cover] = resource.files! as [Extract<FileSpec, { kind: 'download' }>, Extract<FileSpec, { kind: 'download' }>];
        // 全量文件URL：file.子域（实测验证）
        expect(attachment.url).toBe('https://file.pawchive.pw/data/ec/c1/anim.mp4');
        expect(cover.url).toBe('https://file.pawchive.pw/data/3d/13/cover.jpeg');
    });

    it('pending帖子（has_full=false）按能力跳过：无文件', async () => {
        __setResponse('https://pawchive.pw/api/v1/fanbox/user/2629698/post/12384631', 200, {
            ...FULL_POST_RESPONSE,
            preview_state: 'pending',
            has_full: false,
        });
        __setResponse('https://pawchive.pw/api/v1/fanbox/user/2629698/profile', 200, PROFILE_RESPONSE);

        const resource = pawchive.resolve({
            kind: 'post', service: 'fanbox', creatorId: '2629698', postId: '12384631',
        });
        await pawchive.expand(resource);

        expect(resource.available).toBe(false);
        expect(resource.files).toEqual([]);
    });

    it('textContent=html时在文件列表最前面插入save文件', async () => {
        storage.set('textContent', 'html');
        registerFullPostResponses();

        const resource = pawchive.resolve({
            kind: 'post', service: 'fanbox', creatorId: '2629698', postId: '12384631',
        });
        await pawchive.expand(resource);

        expect(resource.files).toHaveLength(3);
        const [content] = resource.files! as [Extract<FileSpec, { kind: 'save' }>, ...unknown[]];
        expect(content).toMatchObject({
            kind: 'save',
            name: 'content.html',
            path: '__internal_content__',
        });
        expect(content.data).toBe('<pre><p>本文</p></pre>');
    });

    it('downloadOriginalImage=false时使用缩略图URL', async () => {
        storage.set('downloadOriginalImage', false);
        registerFullPostResponses();

        const resource = pawchive.resolve({
            kind: 'post', service: 'fanbox', creatorId: '2629698', postId: '12384631',
        });
        await pawchive.expand(resource);

        const [attachment] = resource.files! as [Extract<FileSpec, { kind: 'download' }>];
        expect(attachment.url).toBe('https://img.pawchive.pw/thumbnail/data/ec/c1/anim.mp4');
    });

    it('API返回错误时expand抛错', async () => {
        __setResponse('https://pawchive.pw/api/v1/fanbox/user/2629698/post/12384631', 404, { error: 'Post not found.' });

        const resource = pawchive.resolve({
            kind: 'post', service: 'fanbox', creatorId: '2629698', postId: '12384631',
        });
        await expect(pawchive.expand(resource)).rejects.toThrow('Post not found.');
    });
});

describe('pawchive.assets', () => {
    it('thumbnail生成img子域缩略图URL', () => {
        expect(pawchive.assets.thumbnail('/a/b.jpg'))
            .toBe('https://img.pawchive.pw/thumbnail/data/a/b.jpg');
    });

    it('fullFile生成file子域URL', () => {
        expect(pawchive.assets.fullFile({ path: '/a/b.jpg' }, {} as any))
            .toBe('https://file.pawchive.pw/data/a/b.jpg');
    });
});

describe('pawchive.capabilities', () => {
    it('搜索最小长度为3，pending帖子策略为skip', () => {
        expect(pawchive.capabilities.searchMinLength).toBe(3);
        expect(pawchive.capabilities.pendingPosts).toBe('skip');
    });
});
