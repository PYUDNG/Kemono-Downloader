import { requestJson, toast } from "@/utils/main.js";
import { defineModule } from "../types.js";
import type { GmXmlhttpRequestOption } from "$";
import type { APIErrorResponse } from "./types/common.js";
import i18n, { i18nKeys } from "@/i18n/main.js";
import { groupExists, onModuleRegistered, registerGroup, registerItem } from "../settings/main.js";
import { ref } from "vue";
import PrimeTrash from '~icons/prime/trash';
import PrimeHistory from '~icons/prime/history';
import { clearCache, getCache, hasCache, removeCache, saveCache } from "./cache.js";
import { globalStorage, makeStorageRef } from "@/storage.js";

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
 * 发送api请求到当前站点服务器（站点无关：URL由站点adapter构造）
 * @returns response的Promise
 */
export async function apiRequest<C = undefined>(
    request: GmXmlhttpRequestOption<'text', C>,
    options: ApiOptions = defaultOptions,
) {
    // 检查是否可以使用缓存
    if (options.cache && hasCache(request))
        return JSON.parse(await getCache(request)!);

    // Kemono系站点API要求headers标明Accept:text/css
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
    } catch (err) {
        // 发生错误，清除缓存，并抛出错误
        removeCache(request);
        throw err;
    }

    // 返回response
    return response;
}

/**
 * 判断API响应是否为错误响应
 */
export function isErrorResponse(data: any): data is APIErrorResponse {
    return Object.hasOwn(data, 'error');
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
        value: makeStorageRef('cacheExpires', storage, true, false),
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
