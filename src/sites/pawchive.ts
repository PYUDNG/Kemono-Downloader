import { globalStorage } from '@/storage.js';
import { isErrorResponse } from '@/modules/api/main.js';
import type { APIErrorResponse } from '@/modules/api/types/common.js';
import type { PostApiResponse } from './kemono-family/api-types/post.js';
import { createPostsApi } from './kemono-family/api.js';
import { createKemonoStylePages } from './kemono-family/pages.js';
import { createPostsResolver, expandPostResource } from './kemono-family/post-resource.js';
import { registerSiteFilenameSetting } from './kemono-family/settings.js';
import { isImageFile } from './kemono-family/file-type.js';
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

export const assets: SiteAssets = {
    thumbnail(path) {
        return `https://img.${ location.host }/thumbnail/data${ path }`;
    },

    /**
     * pawchive全量文件统一由`file.`子域提供（实测验证）  
     * 缩略图设置下回退到`img.`子域的缩略图
     */
    fullFile(file, _data) {
        // 非图片附件（视频/压缩包等）：始终走原始`file.`子域，不应用「下载原图」开关
        if (!isImageFile(file)) {
            return `https://file.${ location.host }/data${ file.path }`;
        }
        return storage.get('downloadOriginalImage') ?
            `https://file.${ location.host }/data${ file.path }` :
            `https://img.${ location.host }/thumbnail/data${ file.path }`;
    },
};

// #endregion

// #region API与能力位（站点相关）

export const api = createPostsApi(normalizePost);

export const capabilities: SiteCapabilities = {
    // pawchive搜索接口要求关键字至少3个字符
    searchMinLength: 3,
    // 未完整导入（仅预览）的帖子：图片仅缩略图可用（“下载原图”关闭时下载），文字内容照常保存
    pendingPosts: 'thumbnail-only',
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
 * 委托给Kemono系站点通用展开逻辑；本站点能力：pending帖子（内容未完整导入）仅下载缩略图与文字内容
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
