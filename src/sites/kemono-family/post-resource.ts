import { v4 as uuid } from 'uuid';
import { Queue } from '@/utils/main.js';
import { isErrorResponse } from '@/modules/api/main.js';
import { globalStorage } from '@/storage.js';
import { formatContentHTML, formatContentText } from '@/modules/downloader/utils/main.js';
import type { FileItem, PostInfo } from './api-types/common.js';
import type { PostApiResponse } from './api-types/post.js';
import type { FileSpec, Resource, ResourceMeta } from '@/modules/downloader/types/model.js';
import type { DownloadRequest } from '../types.js';
import type { KemonoFamilyDeps } from './types.js';

const storage = globalStorage.withKeys('downloader');

/**
 * Kemono系站点全局共享API访问队列（限制并发与频率）
 */
const queueApi = new Queue({
    max: 3,
    sleep: 500,
});

/**
 * 下载意图解析工厂  
 * Kemono系站点的资源语义一致：post（单帖）与 batch（合集，子项递归解析）
 */
export function createPostsResolver(): (request: DownloadRequest) => Resource {
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
    return resolve;
}

/**
 * 根据帖子与创作者API数据构建文件名模板meta（推荐词汇表）
 */
export function buildPostMeta(data: PostApiResponse, creator: { name: string }): ResourceMeta {
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

/**
 * 从文件信息中解析保存时使用的文件名  
 * 优先使用`name`；缺失时回退到`path`/下载URL的basename（URL可能经过百分号编码）
 */
function resolveFileName(file: Partial<FileItem>, url: string): string | null {
    const source = file.name ?? file.path;
    if (source) return source.substring(source.lastIndexOf('/') + 1);

    try {
        const pathname = new URL(url).pathname;
        const basename = pathname.substring(pathname.lastIndexOf('/') + 1);
        return decodeURIComponent(basename) || null;
    } catch {
        return null;
    }
}

/**
 * 文件在服务器上的原始路径  
 * 延迟导入的附件没有`path`，使用下载URL的pathname代替（仅用于文件名模板的`Name`兜底）
 */
function resolveFilePath(file: Partial<FileItem>, url: string): string {
    if (file.path) return file.path;
    try {
        return new URL(url).pathname;
    } catch {
        return url;
    }
}

/**
 * 构建单个可下载文件  
 * 当前无法获得下载地址时（如延迟导入附件仍在处理中）返回`null`
 */
function buildDownloadFile(
    family: KemonoFamilyDeps,
    file: Partial<FileItem>,
    data: PostApiResponse,
): Extract<FileSpec, { kind: 'download' }> | null {
    const url = family.assets.fullFile(file, data);
    if (!url) return null;
    const name = resolveFileName(file, url);
    if (!name) return null;
    return {
        kind: 'download',
        name,
        path: resolveFilePath(file, url),
        url,
    };
}

/**
 * 展开帖子资源（Kemono系站点通用）  
 * 拉取帖子+创作者数据，构建meta与文件列表  
 * 站点差异（文件URL等）通过`family`依赖传入；文件可用性由API逐文件标记
 * （`preview_only`/`deferred`等），无可用下载地址的文件会被跳过
 */
export async function expandPostResource(
    family: KemonoFamilyDeps,
    resource: Resource,
): Promise<void> {
    // 合集：子资源各自展开，无需处理
    if (resource.type === 'posts') return;
    if (resource.type !== 'post')
        throw new Error(`unsupported resource type: ${ resource.type }`);

    const source = resource.source as { service: string; creatorId: string; postId: string };

    // 排队访问API，获取帖子数据
    const data = await queueApi.enqueue(() => family.api.post(source as PostInfo));
    if (isErrorResponse(data)) throw new Error(data.error);

    // 获取创作者数据（文件名模板需要）
    const creator = await queueApi.enqueue(() => family.api.profile({
        service: source.service,
        creatorId: source.creatorId,
    }));
    if (isErrorResponse(creator)) throw new Error(creator.error);

    // 名称与meta
    resource.name = data.post.title;
    resource.meta = buildPostMeta(data, creator);

    // 文件列表
    const files: FileSpec[] = [];
    // 因“延迟导入且暂无临时URL”而无法下载的文件数量
    let unavailable = 0;

    // 文字内容（插入到最前面；内容未完整导入的帖子同样提供完整文字，可保存）
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

    // 文件（附件 + 封面）
    for (const file of data.post.attachments) {
        const spec = buildDownloadFile(family, file, data);
        if (spec) files.push(spec);
        else unavailable++;
    }

    // 封面图（用户未指定不下载时）
    const cover = data.post.file;
    if (!storage.get('noCoverFile') && (cover?.path || cover?.temp_url || cover?.temp_download_url)) {
        const spec = buildDownloadFile(family, cover, data);
        if (spec) files.push(spec);
        else unavailable++;
    }

    resource.files = files;
    // 存在被跳过的文件且没有任何可下载内容（含文字内容）时，视为不可用
    resource.available = files.length > 0 || unavailable === 0;
}
