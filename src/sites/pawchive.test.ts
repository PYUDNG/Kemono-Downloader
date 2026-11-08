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

// —— 与实测pawchive新API一致的路径格式：首段为“1位存储前缀 + 哈希前2位”（3字符） ——
const COVER_HASH = '54bebb15b8d2532c1e807e83081476cc98b287bab0596a3b774e47038571424d';
const COVER_PATH = `/254/be/${ COVER_HASH }.jpg`;
const COVER_THUMB_PATH = `/54/be/${ COVER_HASH }.jpg`;

const IMAGE_HASH = '52bdb562eccf4cfee75e6413d209d6e414fe7fb4d06542ce7274ebfdc2d9bcb3';
const IMAGE_PATH = `/152/bd/${ IMAGE_HASH }.png`;
const IMAGE_THUMB_PATH = `/52/bd/${ IMAGE_HASH }.png`;

const VIDEO_PATH = '/203/ae/03ae3fd94e635dea25062ac85221794d10d465c63ea966b9090fdd8072e09453.mp4';

const TEMP_IMAGE_URL = `https://t1.pawchive.pw/f/1694689e19e4a707/1.png?e=1794166611&s=815d7477e383c966e13e6971a9d6b63a`;
const TEMP_VIDEO_URL = 'https://t1.pawchive.pw/d/997776fad9f2d84b/766500144.mp4?e=1794166867&s=9fb413cb9d13a039c07078a706115b35';
const TEMP_HLS_URL = 'https://t1.pawchive.pw/v/997776fad9f2d84b/master.m3u8?e=1794166867&s=74e3f56d1b8016a78209ccf8724ac664';

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
    file: { name: 'cover.jpg', path: COVER_PATH, server: 'https://n3.pawchive.pw' },
    attachments: [{ name: 'anim.mp4', path: VIDEO_PATH, server: 'https://n3.pawchive.pw' }],
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

function registerPostResponses(post: unknown = FULL_POST_RESPONSE) {
    __setResponse('https://pawchive.pw/api/v1/fanbox/user/2629698/post/12384631', 200, post);
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
        registerPostResponses();

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
        // 全量文件URL：file.子域，使用完整路径（新API路径首段前缀不影响原文件URL）
        expect(attachment.url).toBe(`https://file.pawchive.pw/data${ VIDEO_PATH }`);
        expect(cover.url).toBe(`https://file.pawchive.pw/data${ COVER_PATH }`);
    });

    it('has_full=false 不再跳过全部文件：逐文件标记可用的照常下载', async () => {
        registerPostResponses({
            ...FULL_POST_RESPONSE,
            has_full: false,
            preview_state: 'scraped',
        });

        const resource = pawchive.resolve({
            kind: 'post', service: 'fanbox', creatorId: '2629698', postId: '12384631',
        });
        await pawchive.expand(resource);

        expect(resource.available).toBe(true);
        expect(resource.files).toHaveLength(2);
        const files = resource.files! as Extract<FileSpec, { kind: 'download' }>[];
        expect(files[0].url).toBe(`https://file.pawchive.pw/data${ VIDEO_PATH }`);
    });

    it('preview_only 且提供 temp_url：开启“下载原图”时使用临时原文件URL（封面与附件）', async () => {
        registerPostResponses({
            ...FULL_POST_RESPONSE,
            file: {
                name: '1.png',
                path: IMAGE_PATH,
                preview_only: true,
                temp_url: TEMP_IMAGE_URL,
                temp_expires: '2026-11-16T00:00:00+00:00',
                server: 'https://n1.pawchive.pw',
            },
            attachments: [
                {
                    name: '2.png',
                    path: IMAGE_PATH,
                    preview_only: true,
                    temp_url: TEMP_IMAGE_URL,
                    temp_expires: '2026-11-16T00:00:00+00:00',
                    server: 'https://n1.pawchive.pw',
                },
            ],
        });

        const resource = pawchive.resolve({
            kind: 'post', service: 'fanbox', creatorId: '2629698', postId: '12384631',
        });
        await pawchive.expand(resource);

        expect(resource.files).toHaveLength(2);
        const files = resource.files! as Extract<FileSpec, { kind: 'download' }>[];
        expect(files.every(f => f.url === TEMP_IMAGE_URL)).toBe(true);
    });

    it('preview_only 且关闭“下载原图”：走 img 缩略图（新路径去掉首段存储前缀）', async () => {
        storage.set('downloadOriginalImage', false);
        registerPostResponses({
            ...FULL_POST_RESPONSE,
            file: {
                name: '1.png',
                path: IMAGE_PATH,
                preview_only: true,
                temp_url: TEMP_IMAGE_URL,
                server: 'https://n1.pawchive.pw',
            },
            attachments: [
                {
                    name: '2.png',
                    path: IMAGE_PATH,
                    preview_only: true,
                    temp_url: TEMP_IMAGE_URL,
                    server: 'https://n1.pawchive.pw',
                },
            ],
        });

        const resource = pawchive.resolve({
            kind: 'post', service: 'fanbox', creatorId: '2629698', postId: '12384631',
        });
        await pawchive.expand(resource);

        expect(resource.files).toHaveLength(2);
        const files = resource.files! as Extract<FileSpec, { kind: 'download' }>[];
        expect(files.every(f => f.url === `https://img.pawchive.pw/thumbnail/data${ IMAGE_THUMB_PATH }`)).toBe(true);
    });

    it('preview_only 且没有 temp_url：回退到缩略图，不再生成404的原文件URL', async () => {
        registerPostResponses({
            ...FULL_POST_RESPONSE,
            file: {
                name: 'cover.jpg',
                path: COVER_PATH,
                preview_only: true,
                server: 'https://n3.pawchive.pw',
            },
            attachments: [
                {
                    name: 'img.png',
                    path: IMAGE_PATH,
                    preview_only: true,
                    server: 'https://n1.pawchive.pw',
                },
            ],
        });

        const resource = pawchive.resolve({
            kind: 'post', service: 'fanbox', creatorId: '2629698', postId: '12384631',
        });
        await pawchive.expand(resource);

        expect(resource.files).toHaveLength(2);
        const files = resource.files! as Extract<FileSpec, { kind: 'download' }>[];
        expect(files.find(f => f.path === IMAGE_PATH)!.url)
            .toBe(`https://img.pawchive.pw/thumbnail/data${ IMAGE_THUMB_PATH }`);
        expect(files.find(f => f.path === COVER_PATH)!.url)
            .toBe(`https://img.pawchive.pw/thumbnail/data${ COVER_THUMB_PATH }`);
    });

    it('deferred 附件（无path）使用 temp_download_url 直链下载', async () => {
        registerPostResponses({
            ...FULL_POST_RESPONSE,
            file: {},
            attachments: [{
                name: '766500144.mp4',
                deferred: true,
                temp_url: TEMP_HLS_URL,
                temp_download_url: TEMP_VIDEO_URL,
                temp_expires: '2026-12-09T00:00:00+00:00',
            }],
        });

        const resource = pawchive.resolve({
            kind: 'post', service: 'fanbox', creatorId: '2629698', postId: '12384631',
        });
        await pawchive.expand(resource);

        expect(resource.available).toBe(true);
        expect(resource.files).toHaveLength(1);
        const [file] = resource.files! as [Extract<FileSpec, { kind: 'download' }>];
        expect(file).toMatchObject({
            kind: 'download',
            name: '766500144.mp4',
            path: '/d/997776fad9f2d84b/766500144.mp4',
            url: TEMP_VIDEO_URL,
        });
    });

    it('deferred 非图片附件仅有临时直链（temp_url）时直接使用', async () => {
        registerPostResponses({
            ...FULL_POST_RESPONSE,
            file: {},
            attachments: [{
                name: 'TUCA DONKA 4K YTS.mp4',
                deferred: true,
                temp_url: 'https://t1.pawchive.pw/f/4e726aef65d98295/TUCA%20DONKA%204K%20YTS.mp4?e=1794167008&s=d410f5e59d5c414f940430cb72882208',
                temp_expires: '2026-11-23T00:00:00+00:00',
            }],
        });

        const resource = pawchive.resolve({
            kind: 'post', service: 'fanbox', creatorId: '2629698', postId: '12384631',
        });
        await pawchive.expand(resource);

        expect(resource.files).toHaveLength(1);
        const [file] = resource.files! as [Extract<FileSpec, { kind: 'download' }>];
        expect(file.url).toContain('t1.pawchive.pw/f/4e726aef65d98295/');
    });

    it('deferred 附件仅有HLS播放列表（m3u8）时跳过，视为不可用', async () => {
        registerPostResponses({
            ...FULL_POST_RESPONSE,
            file: {},
            attachments: [{
                name: '766500144.mp4',
                deferred: true,
                temp_url: TEMP_HLS_URL,
            }],
        });

        const resource = pawchive.resolve({
            kind: 'post', service: 'fanbox', creatorId: '2629698', postId: '12384631',
        });
        await pawchive.expand(resource);

        expect(resource.available).toBe(false);
        expect(resource.files).toEqual([]);
    });

    it('textContent=html时在文件列表最前面插入save文件', async () => {
        storage.set('textContent', 'html');
        registerPostResponses();

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
        registerPostResponses();

        const resource = pawchive.resolve({
            kind: 'post', service: 'fanbox', creatorId: '2629698', postId: '12384631',
        });
        await pawchive.expand(resource);

        const files = resource.files! as Extract<FileSpec, { kind: 'download' }>[];
        // 非图片附件（mp4）：始终走原文件URL
        expect(files.find(f => f.path === VIDEO_PATH)!.url).toBe(`https://file.pawchive.pw/data${ VIDEO_PATH }`);
        // 图片附件（封面）：仍按设置走缩略图URL（路径已去掉存储前缀）
        expect(files.find(f => f.path === COVER_PATH)!.url).toBe(`https://img.pawchive.pw/thumbnail/data${ COVER_THUMB_PATH }`);
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

    it('thumbnail去掉新API路径首段的存储前缀，旧格式路径保持不变', () => {
        expect(assets.thumbnail(IMAGE_PATH))
            .toBe(`https://img.pawchive.pw/thumbnail/data${ IMAGE_THUMB_PATH }`);
        expect(assets.thumbnail('/d1/61/d161e16b12a71688036941ac4e93bd2779a0141c887048cd9b4cd88865cc3daa.mp4'))
            .toBe('https://img.pawchive.pw/thumbnail/data/d1/61/d161e16b12a71688036941ac4e93bd2779a0141c887048cd9b4cd88865cc3daa.mp4');
    });

    it('fullFile生成file子域URL', () => {
        expect(assets.fullFile({ path: '/a/b.jpg' }, {} as any))
            .toBe('https://file.pawchive.pw/data/a/b.jpg');
    });

    it('fullFile：preview_only 且无临时URL时走img缩略图（去掉存储前缀）', () => {
        expect(assets.fullFile({ path: IMAGE_PATH, preview_only: true }, {} as any))
            .toBe(`https://img.pawchive.pw/thumbnail/data${ IMAGE_THUMB_PATH }`);
    });

    it('fullFile：preview_only 且有临时URL时，开启“下载原图”走临时URL', () => {
        expect(assets.fullFile({ path: IMAGE_PATH, preview_only: true, temp_url: TEMP_IMAGE_URL }, {} as any))
            .toBe(TEMP_IMAGE_URL);
    });

    it('fullFile：无path/临时URL的延迟导入附件返回null', () => {
        expect(assets.fullFile({ name: 'pending.mp4', deferred: true }, {} as any)).toBeNull();
    });
});

describe('pawchive.capabilities', () => {
    it('搜索最小长度为3', () => {
        expect(capabilities.searchMinLength).toBe(3);
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
            // 共120条：o=50返回满50条，o=100返回20条
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
