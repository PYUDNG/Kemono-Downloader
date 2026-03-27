import { PromiseOrRaw, requestJson, toast } from "@/utils/main.js";
import { PostApiResponse } from "./types/post.js";
import { defineModule } from "../types.js";
import { KemonoService, PostInfo } from "./types/common.js";
import { GmXmlhttpRequestOption } from "$";
import { PostsApiResponse } from "./types/posts.js";
import { ProfileApiResponse } from "./types/profile.js";
import { Nullable } from "@primevue/core";
import i18n, { i18nKeys } from "@/i18n/main.js";
import { groupExists, onModuleRegistered, registerGroup, registerItem } from "../settings/main.js";
import { ref } from "vue";
import PrimeTrash from '~icons/prime/trash'

const t = i18n.global.t;
const $api = i18nKeys.$api;
const $settings = $api.$settings;

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
};

/**
 * 清除特定缓存
 * @param request 请求体
 * @returns 存在缓存且已清除时返回true，不存在缓存时返回false
 */
const removeCache = <C = undefined>(request: GmXmlhttpRequestOption<'text', C>): boolean => {
    // 检查是否为GET请求
    const method = request.method?.toUpperCase();
    if (method && method !== 'GET') return false;

    // 合成缓存Key
    const cacheKey = getCacheKey(request);

    // 清除缓存
    const exist = cache.has(cacheKey);
    exist && cache.delete(cacheKey);
    return exist;
};

/**
 * 清除全部缓存
 * @returns 清理的缓存条目数量
 */
export const clearCache = (): number => {
    const count = cache.size;
    cache.clear();
    return count;
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

    // 带错误处理地取得并处理响应
    let response: any;
    try {
        // 取得response，并更新缓存
        response = await promise;
        saveCache(request, JSON.stringify(response));
    } catch(err) {
        // 发生错误，清除缓存，并抛出错误
        removeCache(request);
        throw err;
    }

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

// 设置
onModuleRegistered('self', () => {
    // cache组可能被其他模块共用，因此这里先检查确定组不存在再注册
    // 目前缓存还只有API缓存，因此注册、命名等均在API命名空间和作用域下
    groupExists('self', 'cache') || registerGroup('self', {
        id: 'cache',
        name: t($settings.$groupCache),
        index: 2,
    });

    registerItem('self', [{
        id: 'clear-api-cache',
        type: 'button',
        label: t($settings.$clearApiCache.$label),
        caption: t($settings.$clearApiCache.$caption),
        icon: PrimeTrash,
        props: {
            onClick() {
                const $clearApiCache = $settings.$clearApiCache;
                const count = clearCache();
                toast({
                    severity: 'success',
                    summary: t($clearApiCache.$cleared.$summary),
                    detail: t($clearApiCache.$cleared.$detail, { count }),
                    life: 3000,
                });
            }
        },
        value: ref(t($settings.$clearApiCache.$button)),
        group: 'cache',
    }])
});

// 默认导出模块定义
export default defineModule({
    id: 'api',
    name: t($api.$name),
});