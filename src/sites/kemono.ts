import { murmur2 } from 'murmurhash-js';
import { globalStorage } from '@/storage.js';
import { createPostsApi } from './api.js';
import { createKemonoStylePages } from './pages.js';
import { createPostsResolver, expandPostResource } from './post-resource.js';
import { registerSiteFilenameSetting } from './settings.js';
import type { Resource } from '@/modules/downloader/types/model.js';
import type { Site } from './types.js';

const storage = globalStorage.withKeys('downloader');

// #region 资产URL生成（站点相关）

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

// #endregion

const api = createPostsApi();
const pages = createKemonoStylePages();
const resolve = createPostsResolver();

/**
 * 展开资源  
 * 委托给Kemono系站点通用展开逻辑（本站点能力：无pending限制）
 */
async function expand(resource: Resource): Promise<void> {
    await expandPostResource(kemono, resource);
}

// #region 站点定义

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

// 站点专属设置（文件名模板，优先级高于通用模板）
registerSiteFilenameSetting(kemono);
// #endregion
