import { globalStorage } from '@/storage.js';
import { isErrorResponse } from '@/modules/api/main.js';
import type { APIErrorResponse } from '@/modules/api/types/common.js';
import type { PostApiResponse } from './kemono-family/api-types/post.js';
import { createPostsApi } from './kemono-family/api.js';
import { createKemonoStylePages } from './kemono-family/pages.js';
import { createPostsResolver, expandPostResource } from './kemono-family/post-resource.js';
import { registerSiteFilenameSetting } from './kemono-family/settings.js';
import { isImageFile } from './kemono-family/file-type.js';
import { isHlsUrl, toThumbnailPath } from './kemono-family/file-path.js';
import { createKemonoCreatorModule, createKemonoPostModule } from './kemono-family/flows/index.js';
import type { SiteAssets, SiteCapabilities } from './kemono-family/types.js';
import type { Resource } from '@/modules/downloader/types/model.js';
import type { Site } from './types.js';

const storage = globalStorage.withKeys('downloader');

// #region API响应归一化（站点相关）

/**
 * 将pawchive的扁平帖子详情归一化为canonical `PostApiResponse`  
 * pawchive的post详情为扁平结构（无`post`/`attachments`/`previews`/`props`包装）
 * @param raw 原始API响应
 */
function normalizePost(raw: any): PostApiResponse | APIErrorResponse {
    if (isErrorResponse(raw)) return raw;
    // 防御：若已是canonical结构（如未来API变化），直接返回
    if (raw && typeof raw === 'object' && Object.hasOwn(raw, 'post')) return raw;
    return {
        post: raw,
        attachments: raw.attachments ?? [],
        previews: undefined,
        props: undefined,
    };
}

// #endregion

// #region 资产URL生成（站点相关）

/**
 * 生成缩略图URL  
 * 新API文件路径首段带有1位存储前缀，缩略图服务仍按去掉前缀的路径提供
 */
function thumbnailURL(path: string): string {
    return `https://img.${ location.host }/thumbnail/data${ toThumbnailPath(path) }`;
}

export const assets: SiteAssets = {
    thumbnail: thumbnailURL,

    /**
     * pawchive全量文件统一由`file.`子域提供（实测验证）  
     * 新API为未导入/延迟导入的文件下发临时签名URL，需按文件类型与设置选择：
     * - 视频等转码附件优先使用`temp_download_url`（`temp_url`可能是m3u8播放列表）
     * - `preview_only`（原始文件未导入）：开启「下载原图」且有临时URL时下载原文件，否则回退`img.`缩略图
     * - `deferred`（尚未落盘）：无`path`，只能使用临时URL；临时URL也未生成时返回`null`（无法下载）
     */
    fullFile(file, _data) {
        // 转码附件的直链下载地址（优先于m3u8播放列表）
        if (file.temp_download_url) return file.temp_download_url;

        const isImage = isImageFile(file);
        // 可作为普通文件下载的临时URL（排除HLS播放列表）
        const tempURL = file.temp_url && !isHlsUrl(file.temp_url) ? file.temp_url : null;

        // preview_only：原始文件未导入。新API通过临时URL开放原始文件；没有临时URL时只能取缩略图
        if (file.preview_only) {
            // 非图片没有缩略图可用，只能走临时URL
            if (!isImage) return tempURL;
            if (!file.path) return tempURL;
            return storage.get('downloadOriginalImage') && tempURL ?
                tempURL :
                thumbnailURL(file.path);
        }

        // 延迟导入附件（可能没有path）：使用临时URL；没有则当前无法下载
        if (file.deferred || !file.path) return tempURL;

        // 常规文件：非图片始终走原文件URL；图片按「下载原图」开关
        const original = `https://file.${ location.host }/data${ file.path }`;
        if (!isImage || storage.get('downloadOriginalImage')) return original;
        return thumbnailURL(file.path);
    },
};

// #endregion

// #region API与能力位（站点相关）

export const api = createPostsApi(normalizePost);

export const capabilities: SiteCapabilities = {
    // pawchive搜索接口要求关键字至少3个字符
    searchMinLength: 3,
    /**
     * pawchive API不提供作品总数（profile无post_count字段，posts响应为纯数组）
     * 循环请求后续分页直到返回不足一页（<50条），累加计数；
     * 每探测完一页通过`onProgress`回调累计总数，供UI渐进式更新分页器
     */
    async resolveTotalCount({ service, creatorId, query, loaded, onProgress }) {
        let total = loaded;
        for (let i = loaded; ; i += 50) {
            const page = await api.posts({ service, creatorId, index: i, query });
            if (api.isErrorResponse(page)) break;
            total += page.length;
            // 每页探测完成即回调，分页器页数随累计总数渐进增长
            onProgress?.(total);
            if (page.length < 50) break;
        }
        return total;
    },
};

// #endregion

const pages = createKemonoStylePages();
const resolve = createPostsResolver();

/**
 * 展开资源  
 * 委托给Kemono系站点通用展开逻辑；文件可用性由API逐文件标记（`preview_only`/`deferred`），
 * 新API的临时URL（`temp_url`/`temp_download_url`）使未导入的文件同样可下载
 */
async function expand(resource: Resource): Promise<void> {
    await expandPostResource({ api, assets, capabilities }, resource);
}

// #region 站点定义

export const pawchive: Site = {
    id: 'pawchive',
    label: 'Pawchive',
    // 主域 + 子域折叠
    hosts: [
        { type: 'host', value: 'pawchive.pw' }, { type: 'endhost', value: '.pawchive.pw' },
    ],
    modules: {
        creator: site => createKemonoCreatorModule({
            site,
            page: pages.creator!,
            api,
            capabilities,
        }),
        post: site => createKemonoPostModule({
            site,
            page: pages.post!,
        }),
    },
    resolve,
    expand,
};

// #endregion

// 站点专属设置（文件名模板，优先级高于通用模板）
registerSiteFilenameSetting(pawchive);
