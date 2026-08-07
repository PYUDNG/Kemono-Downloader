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

import { kemono } from './kemono.js';
import { globalStorage } from '@/storage.js';

const storage = globalStorage.withKeys('downloader');

// 与 setup.ts 中 kemono.cr 对应的示例API响应
const POST_RESPONSE = {
    post: {
        id: '9998726',
        user: '8062849',
        service: 'fanbox',
        title: 'Test Post',
        content: '<p>hi</p>',
        embed: {},
        shared_file: false,
        added: '2025-06-01T00:00:00',
        published: '2025-06-03T12:04:22',
        edited: '',
        file: { name: 'cover.png', path: '/co/ver.png' },
        attachments: [{ name: 'a.jpg', path: '/a/b.jpg' }],
        next: '',
        prev: '',
    },
    attachments: [{ name: 'a.jpg', path: '/a/b.jpg' }],
    previews: [
        { name: 'a.jpg', path: '/a/b.jpg', server: 'https://n3.kemono.cr', type: 'thumbnail' },
    ],
    props: { service: 'fanbox', flagged: 0, revisions: [] },
};

const PROFILE_RESPONSE = {
    id: '8062849',
    name: 'Enuni',
    service: 'fanbox',
    public_id: null,
    relation_id: null,
    indexed: '2025-01-01T00:00:00',
    updated: '2025-01-01T00:00:00',
};

function registerPostResponses() {
    __setResponse('https://kemono.cr/api/v1/fanbox/user/8062849/post/9998726', 200, POST_RESPONSE);
    __setResponse('https://kemono.cr/api/v1/fanbox/user/8062849/profile', 200, PROFILE_RESPONSE);
}

beforeEach(() => {
    __clearResponses();
    __clearStorage();
    storage.set('filename', '{Name}');
    storage.set('downloadOriginalImage', true);
    storage.set('noCoverFile', false);
    storage.set('textContent', 'none');
});

describe('kemono.resolve', () => {
    it('post请求解析为post资源stub（不碰网络）', () => {
        const resource = kemono.resolve({
            kind: 'post', service: 'fanbox', creatorId: '8062849', postId: '9998726',
        });
        expect(resource.type).toBe('post');
        expect(resource.id).toBe('9998726');
        expect(resource.name).toBeNull();
        expect(resource.source).toEqual({
            service: 'fanbox', creatorId: '8062849', postId: '9998726',
        });
    });

    it('batch请求解析为合集资源，子项递归解析为post stub', () => {
        const resource = kemono.resolve({
            kind: 'batch',
            name: 'Enuni',
            requests: [
                { kind: 'post', service: 'fanbox', creatorId: '1', postId: '100' },
                { kind: 'post', service: 'fanbox', creatorId: '1', postId: '200' },
            ],
        });
        expect(resource.type).toBe('posts');
        expect(resource.name).toBe('Enuni');
        expect(resource.children).toHaveLength(2);
        expect(resource.children![0].id).toBe('100');
        expect(resource.children![1].id).toBe('200');
    });
});

describe('kemono.expand', () => {
    it('展开post资源：填充名称/meta/files', async () => {
        registerPostResponses();

        const resource = kemono.resolve({
            kind: 'post', service: 'fanbox', creatorId: '8062849', postId: '9998726',
        });
        await kemono.expand(resource);

        expect(resource.name).toBe('Test Post');
        expect(resource.available).toBe(true);
        // meta（推荐词汇表）
        expect(resource.meta.Title).toBe('Test Post');
        expect(resource.meta.PostID).toBe('9998726');
        expect(resource.meta.CreatorID).toBe('8062849');
        expect(resource.meta.Creator).toBe('Enuni');
        expect(resource.meta.Service).toBe('fanbox');
        expect(resource.meta.Year).toBe(2025);
        expect(resource.meta.Month).toBe(6);
        // 附件 + 封面 = 2 个文件
        expect(resource.files).toHaveLength(2);
        const [attachment, cover] = resource.files! as [Extract<FileSpec, { kind: 'download' }>, Extract<FileSpec, { kind: 'download' }>];
        // 附件URL来自previews.server
        expect(attachment).toMatchObject({
            kind: 'download',
            name: 'a.jpg',
            path: '/a/b.jpg',
            url: 'https://n3.kemono.cr/data/a/b.jpg',
        });
        // 封面无preview信息，回退n1
        expect(cover.url).toBe('https://n1.kemono.cr/data/co/ver.png');
    });

    it('textContent=html时在文件列表最前面插入save文件', async () => {
        storage.set('textContent', 'html');
        registerPostResponses();

        const resource = kemono.resolve({
            kind: 'post', service: 'fanbox', creatorId: '8062849', postId: '9998726',
        });
        await kemono.expand(resource);

        expect(resource.files).toHaveLength(3);
        const [content] = resource.files! as [Extract<FileSpec, { kind: 'save' }>, ...unknown[]];
        expect(content).toMatchObject({
            kind: 'save',
            name: 'content.html',
            path: '__internal_content__',
        });
        expect(content.data).toBe('<pre><p>hi</p></pre>');
    });

    it('noCoverFile=true时不包含封面图', async () => {
        storage.set('noCoverFile', true);
        registerPostResponses();

        const resource = kemono.resolve({
            kind: 'post', service: 'fanbox', creatorId: '8062849', postId: '9998726',
        });
        await kemono.expand(resource);

        expect(resource.files).toHaveLength(1);
        expect(resource.files![0].path).toBe('/a/b.jpg');
    });

    it('downloadOriginalImage=false时使用缩略图URL', async () => {
        storage.set('downloadOriginalImage', false);
        registerPostResponses();

        const resource = kemono.resolve({
            kind: 'post', service: 'fanbox', creatorId: '8062849', postId: '9998726',
        });
        await kemono.expand(resource);

        const [attachment] = resource.files! as [Extract<FileSpec, { kind: 'download' }>];
        expect(attachment.url).toBe('https://img.kemono.cr/thumbnail/data/a/b.jpg');
    });

    it('API返回错误时expand抛错', async () => {
        __setResponse('https://kemono.cr/api/v1/fanbox/user/8062849/post/9998726', 404, { error: 'Post not found.' });

        const resource = kemono.resolve({
            kind: 'post', service: 'fanbox', creatorId: '8062849', postId: '9998726',
        });
        await expect(kemono.expand(resource)).rejects.toThrow('Post not found.');
    });
});

describe('kemono.assets', () => {
    it('thumbnail生成img子域缩略图URL', () => {
        expect(kemono.assets.thumbnail('/a/b.jpg'))
            .toBe('https://img.kemono.cr/thumbnail/data/a/b.jpg');
    });

    it('fullFile优先使用previews.server', () => {
        const url = kemono.assets.fullFile({ path: '/a/b.jpg' }, POST_RESPONSE as any);
        expect(url).toBe('https://n3.kemono.cr/data/a/b.jpg');
    });

    it('fullFile无previews时回退n1', () => {
        const url = kemono.assets.fullFile({ path: '/x/y.png' }, POST_RESPONSE as any);
        expect(url).toBe('https://n1.kemono.cr/data/x/y.png');
    });
});
