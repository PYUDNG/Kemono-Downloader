import { v4 as uuid } from 'uuid';
import { Queue } from '@/utils/main.js';
import { isErrorResponse } from '@/modules/api/main.js';
import { globalStorage } from '@/storage.js';
import { formatContentHTML, formatContentText } from '@/modules/downloader/utils/main.js';
import type { PostInfo } from '@/modules/api/types/common.js';
import type { PostApiResponse } from '@/modules/api/types/post.js';
import type { FileSpec, Resource, ResourceMeta } from '@/modules/downloader/types/model.js';
import type { DownloadRequest, Site } from './types.js';

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
 * 展开帖子资源（Kemono系站点通用）  
 * 拉取帖子+创作者数据，构建meta与文件列表  
 * 站点差异（文件URL、pending策略）通过`site`参数传入
 */
export async function expandPostResource(
    site: Pick<Site, 'api' | 'assets' | 'capabilities'>,
    resource: Resource,
): Promise<void> {
    // 合集：子资源各自展开，无需处理
    if (resource.type === 'posts') return;
    if (resource.type !== 'post')
        throw new Error(`unsupported resource type: ${ resource.type }`);

    const source = resource.source as { service: string; creatorId: string; postId: string };

    // 排队访问API，获取帖子数据
    const data = await queueApi.enqueue(() => site.api.post(source as PostInfo));
    if (isErrorResponse(data)) throw new Error(data.error);

    // 获取创作者数据（文件名模板需要）
    const creator = await queueApi.enqueue(() => site.api.profile({
        service: source.service,
        creatorId: source.creatorId,
    }));
    if (isErrorResponse(creator)) throw new Error(creator.error);

    // 内容未完整导入（仅预览）时按站点能力处理：
    // - 'skip'：跳过该帖所有文件（不填充名称/meta）
    // - 'thumbnail-only'：全量文件未导入，图片仅在“下载原图”关闭时以缩略图形式下载；文字内容按设置照常保存
    const pending = site.capabilities.pendingPosts !== 'none' && data.post.has_full === false;
    if (pending && site.capabilities.pendingPosts === 'skip') {
        resource.available = false;
        resource.files = [];
        return;
    }

    // 名称与meta
    resource.name = data.post.title;
    resource.meta = buildPostMeta(data, creator);

    // 文件列表
    const files: FileSpec[] = [];

    // 文字内容（插入到最前面；pending帖同样提供完整文字，可保存）
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

    // 图片文件（附件 + 封面）
    // pending帖（thumbnail-only）全量文件未导入：仅当“下载原图”关闭时可下载（此时fullFile即缩略图URL）
    if (!(pending && storage.get('downloadOriginalImage'))) {
        for (const file of data.post.attachments) {
            files.push({
                kind: 'download',
                name: file.name ?? file.path.substring(file.path.lastIndexOf('/') + 1),
                path: file.path,
                url: site.assets.fullFile(file, data),
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
                url: site.assets.fullFile(coverFile, data),
            });
        }
    }

    resource.files = files;
    // pending帖可能没有任何可下载文件（如仅预览且无缩略图/文字），此时视为不可用
    resource.available = pending ? files.length > 0 : true;
}
