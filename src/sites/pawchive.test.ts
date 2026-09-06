import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { FileSpec } from '@/modules/downloader/types/model.js';
import { testChecker } from '@/utils/main.js';
import { __clearResponses, __clearStorage, __setResponse } from '../../tests/mocks/gm.js';

// #region mock：避免加载浏览器UI/i18n/IndexedDB相关模块

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
    // 站点测试只关心resolve/expand/资产URL；下载器主模块会连带加载providers（maria2/fsa的IndexedDB副作用），与测试无关
    downloadResource: vi.fn(),
}));

// #endregion

import { pawchive, assets, capabilities } from './pawchive.js';
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

    it('pending帖子（has_full=false）且“下载原图”开启时无可下载文件', async () => {
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

    it('pending帖子且“下载原图”关闭时：图片下载缩略图、非图片仍走原文件URL', async () => {
        storage.set('downloadOriginalImage', false);
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

        expect(resource.available).toBe(true);
        // 附件 + 封面 = 2 个文件；图片（封面）为img子域缩略图URL，非图片（mp4附件）为原文件URL
        expect(resource.files).toHaveLength(2);
        const [attachment, cover] = resource.files! as [Extract<FileSpec, { kind: 'download' }>, Extract<FileSpec, { kind: 'download' }>];
        expect(attachment.url).toBe('https://file.pawchive.pw/data/ec/c1/anim.mp4');
        expect(cover.url).toBe('https://img.pawchive.pw/thumbnail/data/3d/13/cover.jpeg');
    });

    it('pending帖子且“下载原图”开启时仍保存文字内容', async () => {
        storage.set('textContent', 'html');
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

        expect(resource.available).toBe(true);
        expect(resource.files).toHaveLength(1);
        const [content] = resource.files! as [Extract<FileSpec, { kind: 'save' }>, ...unknown[]];
        expect(content).toMatchObject({
            kind: 'save',
            name: 'content.html',
            path: '__internal_content__',
        });
        expect(content.data).toBe('<pre><p>本文</p></pre>');
    });

    it('pending帖子同时保存文字内容与图片缩略图', async () => {
        storage.set('downloadOriginalImage', false);
        storage.set('textContent', 'txt');
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

        expect(resource.available).toBe(true);
        expect(resource.files).toHaveLength(3);
        const [content, attachment] = resource.files! as [Extract<FileSpec, { kind: 'save' }>, Extract<FileSpec, { kind: 'download' }>, ...unknown[]];
        expect(content.name).toBe('content.txt');
        expect(attachment.url).toBe('https://file.pawchive.pw/data/ec/c1/anim.mp4');
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

    it('非图片附件不应用“下载原图”开关，始终走原文件URL（图片仍走缩略图）', async () => {
        storage.set('downloadOriginalImage', false);
        registerFullPostResponses();

        const resource = pawchive.resolve({
            kind: 'post', service: 'fanbox', creatorId: '2629698', postId: '12384631',
        });
        await pawchive.expand(resource);

        const files = resource.files! as Extract<FileSpec, { kind: 'download' }>[];
        // 非图片附件（mp4）：始终走原文件URL
        expect(files.find(f => f.path === '/ec/c1/anim.mp4')!.url).toBe('https://file.pawchive.pw/data/ec/c1/anim.mp4');
        // 图片附件（封面）：仍按设置走缩略图URL
        expect(files.find(f => f.path === '/3d/13/cover.jpeg')!.url).toBe('https://img.pawchive.pw/thumbnail/data/3d/13/cover.jpeg');
    });

    it('preview_only分配（封面与图片附件）：即使开启“下载原图”也走img缩略图，非preview_only走原文件URL', async () => {
        // 模拟实测pawchive API：封面与部分图片附件preview_only=true，zip不标记
        storage.set('downloadOriginalImage', true);
        __setResponse('https://pawchive.pw/api/v1/fanbox/user/2629698/post/12384631', 200, {
            ...FULL_POST_RESPONSE,
            file: { name: 'cover.jpeg', path: '/3d/13/cover.jpeg', preview_only: true },
            attachments: [
                { name: 'img.png', path: '/ec/c1/img.png', preview_only: true },
                { name: 'anim.mp4', path: '/ec/c1/anim.mp4' },
            ],
        });
        __setResponse('https://pawchive.pw/api/v1/fanbox/user/2629698/profile', 200, PROFILE_RESPONSE);

        const resource = pawchive.resolve({
            kind: 'post', service: 'fanbox', creatorId: '2629698', postId: '12384631',
        });
        await pawchive.expand(resource);

        const files = resource.files! as Extract<FileSpec, { kind: 'download' }>[];
        // preview_only 图片附件：无视“下载原图”开关，走img缩略图
        expect(files.find(f => f.path === '/ec/c1/img.png')!.url).toBe('https://img.pawchive.pw/thumbnail/data/ec/c1/img.png');
        // preview_only 封面：同上
        expect(files.find(f => f.path === '/3d/13/cover.jpeg')!.url).toBe('https://img.pawchive.pw/thumbnail/data/3d/13/cover.jpeg');
        // 非preview_only 非图片（mp4）：走原文件URL
        expect(files.find(f => f.path === '/ec/c1/anim.mp4')!.url).toBe('https://file.pawchive.pw/data/ec/c1/anim.mp4');
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
        expect(assets.thumbnail('/a/b.jpg'))
            .toBe('https://img.pawchive.pw/thumbnail/data/a/b.jpg');
    });

    it('fullFile生成file子域URL', () => {
        expect(assets.fullFile({ path: '/a/b.jpg' }, {} as any))
            .toBe('https://file.pawchive.pw/data/a/b.jpg');
    });

    it('fullFile：preview_only文件无视“下载原图”开关，始终走img缩略图URL', () => {
        expect(assets.fullFile({ path: '/a/b.jpg', preview_only: true }, {} as any))
            .toBe('https://img.pawchive.pw/thumbnail/data/a/b.jpg');
    });
});

describe('pawchive.capabilities', () => {
    it('搜索最小长度为3，pending帖子策略为thumbnail-only', () => {
        expect(capabilities.searchMinLength).toBe(3);
        expect(capabilities.pendingPosts).toBe('thumbnail-only');
    });

    describe('resolveTotalCount（探测全部作品总数）', () => {
        const creator = { service: 'fanbox', creatorId: '2629698' };

        /** 生成一页50条帖子响应 */
        function pageOf50() {
            return Array.from({ length: 50 }, (_, i) => ({
                id: String(1000 + i),
                user: creator.creatorId,
                service: creator.service,
                title: `Post ${i}`,
            }));
        }

        it('循环请求分页直到返回不足一页，累加计数', async () => {
            // 共120条：o=50返回满50条，o=100返回20条（<50）→ 探测结束
            __setResponse('https://pawchive.pw/api/v1/fanbox/user/2629698/posts?o=50', 200, pageOf50());
            __setResponse('https://pawchive.pw/api/v1/fanbox/user/2629698/posts?o=100', 200, pageOf50().slice(0, 20));

            const total = await capabilities.resolveTotalCount!({ ...creator, loaded: 50 });
            expect(total).toBe(120);
        });

        it('每探测完一页通过onProgress回调累计总数（渐进式更新）', async () => {
            // 共120条：o=50满50条，o=100返回20条
            __setResponse('https://pawchive.pw/api/v1/fanbox/user/2629698/posts?o=50', 200, pageOf50());
            __setResponse('https://pawchive.pw/api/v1/fanbox/user/2629698/posts?o=100', 200, pageOf50().slice(0, 20));

            const progress: number[] = [];
            const total = await capabilities.resolveTotalCount!({ ...creator, loaded: 50, onProgress: t => progress.push(t) });
            expect(total).toBe(120);
            // 每页探测完成回调一次：50页后累计100，末页20条后累计120
            expect(progress).toEqual([100, 120]);
        });

        it('总数恰好为整页时多请求一页发现空页', async () => {
            // 共100条：o=50返回满50条，o=100返回空 → 探测结束
            __setResponse('https://pawchive.pw/api/v1/fanbox/user/2629698/posts?o=50', 200, pageOf50());
            __setResponse('https://pawchive.pw/api/v1/fanbox/user/2629698/posts?o=100', 200, []);

            const total = await capabilities.resolveTotalCount!({ ...creator, loaded: 50 });
            expect(total).toBe(100);
        });

        it('探测遇到API错误时返回已累计数量', async () => {
            __setResponse('https://pawchive.pw/api/v1/fanbox/user/2629698/posts?o=50', 500, { error: 'Server Error' });

            const total = await capabilities.resolveTotalCount!({ ...creator, loaded: 50 });
            expect(total).toBe(50);
        });

        it('探测筛选后的总数时携带q参数', async () => {
            __setResponse('https://pawchive.pw/api/v1/fanbox/user/2629698/posts?o=50&q=live', 200, pageOf50().slice(0, 3));

            const total = await capabilities.resolveTotalCount!({ ...creator, loaded: 50, query: 'live' });
            expect(total).toBe(53);
        });
    });
});

describe('pawchive.hosts', () => {
    it('命中主域与子域，不命中其他站点', () => {
        expect(testChecker(pawchive.hosts)).toBe(true); // beforeEach已设location.host为pawchive.pw
        (globalThis as any).location.host = 'sub.pawchive.pw';
        expect(testChecker(pawchive.hosts)).toBe(true);
        (globalThis as any).location.host = 'kemono.cr';
        expect(testChecker(pawchive.hosts)).toBe(false);
        (globalThis as any).location.host = 'pawchive.pw';
    });
});
