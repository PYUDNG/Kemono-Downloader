import { GM_xmlhttpRequest, GmXmlhttpRequestOption, GmResponseTypeMap } from "$";

/**
 * 以Promise或async/await语法调用的GM_xmlhttpRequest
 * @param options {@link GM_xmlhttpRequest}的options参数
 * @returns Promise形式的返回值
 */
export function request<
    R extends keyof GmResponseTypeMap,
    C = undefined
>(
    options: GmXmlhttpRequestOption<R, C>
): Promise<GmResponseTypeMap[R]> {
    const { promise, reject, resolve } = Promise.withResolvers<GmResponseTypeMap[R]>();
    GM_xmlhttpRequest({
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
    return promise;
}

/**
 * 用于获取json响应的、以Promise或async/await语法调用的GM_xmlhttpRequest
 * @param options {@link GM_xmlhttpRequest}的options参数
 * @returns Promise<any>形式的返回值
 */
export async function requestJson<
    C = undefined
>(
    options: GmXmlhttpRequestOption<'text', C>
): Promise<any> {
    const responseText = await request(options);
    const json = JSON.parse(responseText);
    return json;
}

/**
 * 用于获取Document响应的、以Promise或async/await语法调用的GM_xmlhttpRequest
 * @param options {@link GM_xmlhttpRequest}的options参数
 * @param type 解析文档的类型
 * @returns Promise<Document>形式的返回值
 */
export async function requestDocument<
    C = undefined
>(
    options: GmXmlhttpRequestOption<'text', C>,
    type: DOMParserSupportedType = 'text/html',
): Promise<Document> {
    const responseText = await request(options);
    const parser = new DOMParser();
    const doc = parser.parseFromString(responseText, type);
    return doc;
}