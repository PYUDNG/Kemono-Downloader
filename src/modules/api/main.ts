import { requestJson, toast } from "@/utils/main.js";
import { PostApiResponse } from "./types/post.js";
import { defineModule } from "../types.js";
import { KemonoService, PostInfo } from "./types/common.js";
import { GmXmlhttpRequestOption } from "$";
import { PostsApiResponse } from "./types/posts.js";
import { ProfileApiResponse } from "./types/profile.js";
import i18n, { i18nKeys } from "@/i18n/main.js";
import { groupExists, onModuleRegistered, registerGroup, registerItem } from "../settings/main.js";
import { ref } from "vue";
import PrimeTrash from '~icons/prime/trash';
import PrimeHistory from '~icons/prime/history';
import { clearCache, getCache, hasCache, removeCache, saveCache } from "./cache.js";
import { globalStorage, makeStorageRef } from "@/storage.js";
import { DiscordChannelApiResponse, DiscordServerApiResponse } from "./types/discord.js";

const storage = globalStorage.withKeys('api');
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

/**
 * 发送api请求到Kemono服务器
 * @returns response的Promise
 */
export async function api<
    C = undefined
>(request: GmXmlhttpRequestOption<'text', C>, options: ApiOptions = defaultOptions) {
    // 检查是否可以使用缓存
    if (options.cache && hasCache(request))
        return JSON.parse(await getCache(request)!);

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

/**
 * 获取discord服务器或频道信息
 * @returns 如果提供了ChannelID，则返回Channel信息，否则返回Server信息
 */
export function discord({ serverId }: { serverId: string }): Promise<DiscordServerApiResponse>
export function discord({ channelId }: { channelId: string }): Promise<DiscordChannelApiResponse>
export function discord({ serverId, channelId }: { serverId?: string, channelId?: string }): Promise<DiscordServerApiResponse | DiscordChannelApiResponse> {
    if (typeof channelId === 'undefined') {
        if (typeof serverId === 'undefined') throw new TypeError('both serverId and channelId omitted');
        return api({
            method: 'GET',
            url: `https://${ location.host }/api/v1/discord/server/${ serverId }`,
        });
    } else {
        return api({
            method: 'GET',
            url: `https://${ location.host }/api/v1/discord/channel/${ channelId }`,
        });
    }
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
        id: 'api-cache-expires',
        type: 'number',
        label: t($settings.$apiCacheExpires.$label),
        caption: t($settings.$apiCacheExpires.$caption),
        icon: PrimeHistory,
        props: {
            placeholder: storage.default('cacheExpires').toString(),
        },
        value:  makeStorageRef('cacheExpires', storage, true, false),
        group: 'cache',
    }, {
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