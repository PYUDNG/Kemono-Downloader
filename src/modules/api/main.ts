import { requestJson } from "@/utils/main.js";
import { PostApiResponse } from "./types/post.js";
import { defineModule } from "../types.js";
import { KemonoService, PostInfo } from "./types/common.js";
import { GmXmlhttpRequestOption } from "$";
import { PostsApiResponse } from "./types/posts.js";
import { ProfileApiResponse } from "./types/profile.js";
import { Nullable } from "@primevue/core";

interface ApiOptions {
    /**
     * 是否从缓存中读取结果（仅支持GET请求）
     * @default true
     */
    cache?: boolean;
}
const defaultOptions: ApiOptions = {
    cache: true,
};

/** API缓存 */
const cache = new Map<string, string>();
const getCacheKey = <C = undefined>(request: GmXmlhttpRequestOption<'text', C>) => {
    // Kemono应用场景下，均为GET请求且url一致即为相同请求
    return request.url;
};
const saveCache = <C = undefined>(request: GmXmlhttpRequestOption<'text', C>, data: string) => {
    // 检查是否为GET请求
    const method = request.method?.toUpperCase();
    if (method && method !== 'GET') return;

    // 合成缓存Key
    const cacheKey = getCacheKey(request);

    // 存入缓存
    cache.set(cacheKey, data);
};
const getCache = <C = undefined>(request: GmXmlhttpRequestOption<'text', C>): Nullable<string> => {
    const cacheKey = getCacheKey(request);
    return cache.get(cacheKey) ?? null;
};
const hasCache = <C = undefined>(request: GmXmlhttpRequestOption<'text', C>) => {
    const cacheKey = getCacheKey(request);
    return cache.has(cacheKey);
}

/**
 * 发送api请求到Kemono服务器
 */
export async function api<
    C = undefined
>(request: GmXmlhttpRequestOption<'text', C>, options: ApiOptions = defaultOptions) {
    // 检查是否可以使用缓存
    if (options.cache && hasCache(request)) return JSON.parse(getCache(request)!);

    // Kemono的API要求headers标明Accept:text/css
    const headers = { Accept: 'text/css' };
    request.headers = typeof request.headers === 'object' ?
        Object.assign(headers, request.headers) : headers;
    const response = await requestJson(request);

    // 无论是否开启了缓存，都写入缓存
    saveCache(request, JSON.stringify(response));
    return response;
}

/**
 * 获取post信息
 */
export function post({
    service, creatorId, postId,
}: PostInfo, options?: ApiOptions): Promise<PostApiResponse> {
    return api({
        method: 'GET',
        url: `https://${ location.host }/api/v1/${ service }/user/${ creatorId }/post/${ postId }`,
    }, options);
}

/**
 * 获取创作者posts
 */
export function posts({ service, creatorId, index }: { service: KemonoService, creatorId: string, index?: number }, options?: ApiOptions): Promise<PostsApiResponse> {
    return api({
        method: 'GET',
        url: `https://${ location.host }/api/v1/${ service }/user/${ creatorId }/posts${ typeof index === 'number' ? '?o=' + index : ''}`
    }, options);
}

/**
 * 获取创作者信息
 */
export function profile({ service, creatorId }: { service: KemonoService, creatorId: string }, options?: ApiOptions): Promise<ProfileApiResponse> {
    return api({
        method: 'GET',
        url: `https://${ location.host }/api/v1/${ service }/user/${ creatorId }/profile`
    }, options);
}

// 默认导出模块定义
export default defineModule({
    id: 'api',
    name: 'Kemono API',
});