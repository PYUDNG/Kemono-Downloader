import { PromiseOrRaw, requestJson } from "@/utils/main.js";
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
const cache = new Map<string, PromiseOrRaw<string>>();

/**
 * 根据请求体，生成请求缓存key
 * @param request 请求体
 * @returns 
 */
const getCacheKey = <C = undefined>(request: GmXmlhttpRequestOption<'text', C>) => {
    // Kemono应用场景下，均为GET请求且url一致即为相同请求
    return request.url;
};

/**
 * 将请求写入缓存  
 * 此方法不仅允许缓存response，还允许缓存运行中的请求
 * @param request 请求体
 * @param data response或最终会resolve为response的Promise
 * @returns 
 */
const saveCache = <C = undefined>(request: GmXmlhttpRequestOption<'text', C>, data: PromiseOrRaw<string>) => {
    // 检查是否为GET请求
    const method = request.method?.toUpperCase();
    if (method && method !== 'GET') return;

    // 合成缓存Key
    const cacheKey = getCacheKey(request);

    // 存入缓存
    cache.set(cacheKey, data);
};

/**
 * 根据请求体，取出先前进行的相同请求
 * @param request 请求体
 * @param completed 是否要求请求已完成，默认为false；如果此项为true且缓存中的请求尚未完成，就返回null
 * @returns 相同请求的response或者正在进行的Promise（最终会resolve为response）
 */
const getCache = <C = undefined>(
    request: GmXmlhttpRequestOption<'text', C>,
    completed: boolean = false,
): Nullable<PromiseOrRaw<string>> => {
    const cacheKey = getCacheKey(request);
    const result = cache.get(cacheKey);
    return completed && result instanceof Promise ?
        null :
        result ?? null;
};

/**
 * 检查某一请求体是否已有缓存
 * @param request 请求体
 * @param completed 是否要求请求已完成，默认为false；如果此项为true且缓存中的请求尚未完成，就返回false
 * @returns 是否有符合要求的缓存
 */
const hasCache = <C = undefined>(
    request: GmXmlhttpRequestOption<'text', C>,
    completed: boolean = false,
) => {
    const cacheKey = getCacheKey(request);
    const result = cache.get(cacheKey);
    return completed && result instanceof Promise ?
        false : !!result;
}

/**
 * 发送api请求到Kemono服务器
 * @returns response的Promise
 */
export async function api<
    C = undefined
>(request: GmXmlhttpRequestOption<'text', C>, options: ApiOptions = defaultOptions) {
    // 检查是否可以使用缓存
    if (options.cache && hasCache(request))
        return JSON.parse(await Promise.resolve(getCache(request)!));

    // Kemono的API要求headers标明Accept:text/css
    const headers = { Accept: 'text/css' };
    request.headers = typeof request.headers === 'object' ?
        Object.assign(headers, request.headers) : headers;
    
    // 发送请求，并将请求缓存
    const promise = requestJson(request);
    const jsonTextPromise = promise.then(response => JSON.stringify(response));
    saveCache(request, jsonTextPromise);

    // 取得response，并更新缓存
    const response = await promise;
    saveCache(request, JSON.stringify(response));

    // 返回response
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
export function posts({ service, creatorId, index, query }: { service: KemonoService, creatorId: string, index?: number, query?: string }, options?: ApiOptions): Promise<PostsApiResponse> {
    const url = new URL(`https://${ location.host }/api/v1/${ service }/user/${ creatorId }/posts`);
    typeof index === 'number' && url.searchParams.set('o', index.toString());
    typeof query === 'string' && url.searchParams.set('q', query);
    
    return api({
        method: 'GET',
        url: url.href
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