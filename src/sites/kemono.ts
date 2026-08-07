import { v4 as uuid } from 'uuid';
import { murmur2 } from 'murmurhash-js';
import { Queue } from '@/utils/main.js';
import { apiRequest, isErrorResponse } from '@/modules/api/main.js';
import type { PostInfo } from '@/modules/api/types/common.js';
import type { PostApiResponse } from '@/modules/api/types/post.js';
import type { ProfileApiResponse } from '@/modules/api/types/profile.js';
import type { FileSpec, Resource, ResourceMeta } from '@/modules/downloader/types/model.js';
import { formatContentHTML, formatContentText } from '@/modules/downloader/utils/main.js';
import { globalStorage, makeStorageRef } from '@/storage.js';
import { onModuleRegistered, registerGroup, registerItem } from '@/modules/settings/main.js';
import FilenameHelpComp from '@/modules/downloader/gui/setting-help/Filename.vue';
import i18n, { i18nKeys } from '@/i18n/main.js';
import { computed, markRaw } from 'vue';
import FileEditIcon from '~icons/prime/file-edit';
import type { DownloadRequest, Site } from './types.js';

const t = i18n.global.t;
const storage = globalStorage.withKeys('downloader');

/**
 * Kemono 全局共享API访问队列（限制并发与频率，与原实现一致）
 */
const queueApi = new Queue({
    max: 3,
    sleep: 500,
});

// 页面URL结构（与原实现一致）
const creatorRegPath = /^\/(boosty|dlsite|fanbox|fantia|gumroad|patreon|subscribestar)\/user\/([^/]+)$/;
const postRegPath = /^\/(boosty|dlsite|fanbox|fantia|gumroad|patreon|subscribestar)\/user\/([^/]+)\/post\/([^/]+)$/;

// —— API访问（站点相关）——

const api: Site['api'] = {
    async profile({ service, creatorId }) {
        return apiRequest({
            method: 'GET',
            url: `https://${ location.host }/api/v1/${ service }/user/${ creatorId }/profile`,
        });
    },

    async posts({ service, creatorId, index, query }) {
        const url = new URL(`https://${ location.host }/api/v1/${ service }/user/${ creatorId }/posts`);
        typeof index === 'number' && url.searchParams.set('o', index.toString());
        typeof query === 'string' && url.searchParams.set('q', query);
        return apiRequest({
            method: 'GET',
            url: url.href,
        });
    },

    async post(info: PostInfo) {
        return apiRequest({
            method: 'GET',
            url: `https://${ location.host }/api/v1/${ info.service }/user/${ info.creatorId }/post/${ info.postId }`,
        });
    },

    isErrorResponse,
};

// —— 资产URL生成（站点相关，原 getFullUrl / murmurhash 逻辑平移）——

/**
 * Kemono文件服务器列表（与原 murmurhash.ts 一致）
 */
const FILESERVERS: { percent: number | '', value: string }[] = [
    { percent: 25, value: 'https://n1.kemono.cr' },
    { percent: 25, value: 'https://n2.kemono.cr' },
    { percent: 25, value: 'https://n3.kemono.cr' },
    { percent: '', value: 'https://n4.kemono.cr' },
];

// See https://nginx.org/en/docs/stream/ngx_stream_split_clients_module.html
function calculateBounds(values: { percent: number | '', value: string }[]): { maxHash: number, value: string }[] {
    const maxHash = 2 ** 32 - 1;
    let sum = 0;
    let last = 0;

    return values.map(({ percent, value }) => {
        sum = percent ? percent + sum : 100;
        if (sum > 100) {
            throw Error('percent total is greater than 100%');
        }
        if (percent) {
            last += Math.floor((percent / 100) * maxHash);
            return { value, maxHash: last };
        } else {
            return { value, maxHash: 0 };
        }
    });
}

const FILESERVER_BOUNDS = calculateBounds(FILESERVERS);

function getFileserverForValue(value: string): string {
    if (FILESERVERS.length) {
        const hash = murmur2(value);
        for (const entry of FILESERVER_BOUNDS) {
            if (hash < entry.maxHash || entry.maxHash === 0) {
                return entry.value;
            }
        }
    }
    return '';
}

function fullFileURL(value: string): string {
    const path = `/data${ value }`;
    return `${ getFileserverForValue(path) }${ path }`;
}

const assets: Site['assets'] = {
    thumbnail(path) {
        return `https://img.${ location.host }/thumbnail/data${ path }`;
    },

    fullFile(file, data) {
        if (storage.get('downloadOriginalImage')) {
            const preview = data.previews?.find(p => p.path === file.path);
            // preview.server be like: 'https://n3.kemono.cr'
            const server = preview?.server ?? `https://n1.${ location.host }`;
            return `${ server }/data${ file.path }`;
        } else {
            return `https://img.${ location.host }/thumbnail/data${ file.path }`;
        }
    },

    discordFile(path) {
        return fullFileURL(path);
    },
};

// —— 页面定义（站点相关）——

const pages: Site['pages'] = {
    creator: {
        checkers: [{
            type: 'regpath',
            value: creatorRegPath,
        }],
        mount: {
            containerSelector: '.user-header__actions',
            containerStyles: {
                background: 'transparent',
                border: 'none',
                color: 'white',
                width: 'fit-content',
                height: 'fit-content',
                display: 'block',
                padding: '0',
            },
            containerClasses: 'button',
            appClasses: ['w-fit'],
        },
        parseRequest(pathname) {
            const match = pathname.match(creatorRegPath);
            return match ? {
                kind: 'creator',
                service: match[1],
                creatorId: match[2],
            } : null;
        },
    },
    post: {
        checkers: [{
            type: 'regpath',
            value: postRegPath,
        }],
        mount: {
            containerSelector: '.post__actions',
            containerStyles: {
                background: 'transparent',
                border: 'none',
                color: 'white',
                width: 'fit-content',
                height: 'fit-content',
                display: 'block',
            },
            containerClasses: 'button',
            appClasses: ['w-fit'],
        },
        parseRequest(pathname) {
            const match = pathname.match(postRegPath);
            return match ? {
                kind: 'post',
                service: match[1],
                creatorId: match[2],
                postId: match[3],
            } : null;
        },
    },
};

// —— 资源解析与展开（站点相关）——

/**
 * 把下载意图解析为资源树（纯同步，只构造stub）
 */
function resolve(request: DownloadRequest): Resource {
    switch (request.kind) {
        case 'post': {
            const { service, creatorId, postId } = request as Extract<DownloadRequest, { kind: 'post' }>;
            return {
                id: postId,
                type: 'post',
                name: null,
                meta: {},
                source: { service, creatorId, postId },
            };
        }
        case 'batch': {
            const { name, requests } = request as Extract<DownloadRequest, { kind: 'batch' }>;
            return {
                id: 'batch-' + uuid(),
                type: 'posts',
                name,
                meta: {},
                children: requests.map(resolve),
            };
        }
        default:
            throw new Error(`unsupported request kind: ${ request.kind }`);
    }
}

/**
 * 展开：stub资源 → 实体  
 * 拉取API数据，填充`name`/`meta`/`files`/`children`
 */
async function expand(resource: Resource): Promise<void> {
    // 合集：子资源各自展开，无需处理
    if (resource.type === 'posts') return;

    if (resource.type !== 'post')
        throw new Error(`unsupported resource type: ${ resource.type }`);

    const source = resource.source as PostInfo;

    // 排队访问API，获取帖子数据
    const data = await queueApi.enqueue(() => api.post(source));
    if (isErrorResponse(data)) throw new Error(data.error);

    // 获取创作者数据（文件名模板需要）
    const creator = await queueApi.enqueue(() => api.profile({
        service: source.service,
        creatorId: source.creatorId,
    }));
    if (isErrorResponse(creator)) throw new Error(creator.error);

    // 名称与meta
    resource.name = data.post.title;
    resource.meta = buildPostMeta(data, creator);

    // 文件列表
    const files: FileSpec[] = [];

    // 文字内容（插入到最前面）
    const textContent = storage.get('textContent');
    if (textContent !== 'none') {
        const sourceHTML = data.post.content;
        const content = textContent === 'txt' ?
            formatContentText(sourceHTML) :
            formatContentHTML(sourceHTML);
        files.unshift({
            kind: 'save',
            name: textContent === 'txt' ? 'content.txt' : 'content.html',
            path: '__internal_content__',
            data: content,
        });
    }

    // 附件
    for (const file of data.post.attachments) {
        files.push({
            kind: 'download',
            name: file.name ?? file.path.substring(file.path.lastIndexOf('/') + 1),
            path: file.path,
            url: assets.fullFile(file, data),
        });
    }

    // 封面图（用户未指定不下载时）
    const cover = data.post.file;
    if (!storage.get('noCoverFile') && cover?.path) {
        const coverFile = cover as { name?: string; path: string };
        files.push({
            kind: 'download',
            name: coverFile.name ?? coverFile.path.substring(coverFile.path.lastIndexOf('/') + 1),
            path: coverFile.path,
            url: assets.fullFile(coverFile, data),
        });
    }

    resource.files = files;
    resource.available = true;
}

/**
 * 根据帖子与创作者API数据构建文件名模板meta（推荐词汇表）
 */
function buildPostMeta(data: PostApiResponse, creator: ProfileApiResponse): ResourceMeta {
    const post = data.post;
    const dateText = post.published;
    const date = dateText ? new Date(dateText) : null;
    return {
        PostID: post.id,
        CreatorID: post.user,
        Service: post.service,
        Title: post.title,
        Creator: creator.name,
        Year: date?.getFullYear() ?? null,
        Month: date ? date.getMonth() + 1 : null,
        Date: date?.getDate() ?? null,
        Hour: date?.getHours() ?? null,
        Minute: date?.getMinutes() ?? null,
        Second: date?.getSeconds() ?? null,
        Timestamp: date?.getTime() ?? null,
        TimeText: date?.toLocaleString() ?? null,
    };
}

// —— 站点定义 ——

export const kemono: Site = {
    id: 'kemono',
    label: 'Kemono',
    hosts: [
        'kemono.party',
        'kemono.su',
        'kemono.cr',
    ],
    pages,
    api,
    assets,
    capabilities: {
        searchMinLength: 0,
        pendingPosts: 'none',
    },
    resolve,
    expand,
};

// —— 站点专属设置（文件名模板，优先级高于通用模板）——

const $filename = i18nKeys.$downloader.$settings.$filename;
const filenameBySite = makeStorageRef('filenameBySite', storage, false);

/**
 * 站点专属文件名模板设置项的值（读写`filenameBySite[kemono]`）
 */
const siteFilename = computed<string>({
    get: () => filenameBySite.value[kemono.id] ?? '',
    set: (value) => {
        filenameBySite.value = { ...filenameBySite.value, [kemono.id]: value };
    },
});

onModuleRegistered('downloader', () => {
    registerGroup('downloader', {
        id: 'kemono',
        index: 3,
        name: kemono.label,
    });

    registerItem('downloader', [{
        id: 'site-filename',
        type: 'text',
        label: t($filename.$label),
        help: markRaw(FilenameHelpComp),
        icon: FileEditIcon,
        props: {
            placeholder: storage.default('filename'),
        },
        value: siteFilename,
        group: 'kemono',
    }]);
});
