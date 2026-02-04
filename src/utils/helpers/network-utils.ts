import { GM_xmlhttpRequest, GmXmlhttpRequestOption, GmResponseTypeMap, GM_download, GmDownloadOptions, GM_info } from "$";
import { logger as globalLogger } from "./js-utils";

const logger = globalLogger.withPath('network-utils');

/**
 * 以Promise或async/await语法调用的GM_xmlhttpRequest
 * @param options {@link GM_xmlhttpRequest}的options参数
 * @param signal 一个{@link AbortSignal}，当被abort时abort请求
 * @returns Promise形式的返回值
 */
export function request<
    R extends keyof GmResponseTypeMap,
    C = undefined
>(
    options: GmXmlhttpRequestOption<R, C>,
    signal?: AbortSignal
): Promise<GmResponseTypeMap[R]> {
    const { promise, reject, resolve } = Promise.withResolvers<GmResponseTypeMap[R]>();
    const { abort } = GM_xmlhttpRequest({
        ...options,
        onload(response) {
            resolve(response.response);
            options.onload?.call(this, response);
        },
        onerror(response) {
            reject(response);
            options.onerror?.call(this, response);
        },
        onabort() {
            reject();
            options.onabort?.();
        },
    });
    signal?.addEventListener('abort', () => abort());
    return promise;
}

/**
 * 用于获取json响应的、以Promise或async/await语法调用的GM_xmlhttpRequest
 * @param options {@link GM_xmlhttpRequest}的options参数
 * @param signal 一个{@link AbortSignal}，当被abort时abort请求
 * @returns Promise<any>形式的返回值
 */
export async function requestJson<
    C = undefined
>(
    options: GmXmlhttpRequestOption<'text', C>,
    signal?: AbortSignal
): Promise<any> {
    const responseText = await request(options, signal);
    const json = JSON.parse(responseText);
    return json;
}

/**
 * 用于获取Document响应的、以Promise或async/await语法调用的GM_xmlhttpRequest
 * @param options {@link GM_xmlhttpRequest}的options参数
 * @param type 解析文档的类型
 * @param signal 一个{@link AbortSignal}，当被abort时abort请求
 * @returns Promise<Document>形式的返回值
 */
export async function requestDocument<
    C = undefined
>(
    options: GmXmlhttpRequestOption<'text', C>,
    type: DOMParserSupportedType = 'text/html',
    signal?: AbortSignal
): Promise<Document> {
    const responseText = await request(options, signal);
    const parser = new DOMParser();
    const doc = parser.parseFromString(responseText, type);
    return doc;
}

/**
 * 使用{@link GM_download}下载文件，并返回一个在onload时resolve的Promise
 * @param options {@link GM_download}选项
 * @param signal 一个{@link AbortSignal}，当被abort时abort下载任务
 * @returns 
 */
export async function download(options: GmDownloadOptions, signal?: AbortSignal) {
    const { promise, reject, resolve } = Promise.withResolvers<void>();
    const { abort } = GM_download({
        ...options,
        onload() {
            // 实际上Tampermonkey提供了一个参数包含响应信息，但是vite-plugin-monkey的类型认为没有，因此通过arguments访问
            // Violentmonkey也提供了一个参数，但仅有loaded/mode/total信息，因此不能完全依赖参数
            const status = arguments[0]?.status ?? null;
            status === null || status < 400 ? resolve() : reject();
            options.onload?.call(this);
        },
        onerror(err) {
            reject(err);
            options.onerror?.call(this, err);
        },
        onabort(e: any) {
            reject(e);
            // @ts-ignore
            options.onabort?.call(this, e);
        }
    } as GmDownloadOptions);
    signal?.addEventListener('abort', () => abort());
    return promise;
}
