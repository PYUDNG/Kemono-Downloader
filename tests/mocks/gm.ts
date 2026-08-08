/**
 * `$`（vite-plugin-monkey 虚拟模块）的测试mock
 * 提供内存版 GM_* API；GM_xmlhttpRequest 按注册的响应表返回数据
 */

interface GmRequestOptions {
    url: string;
    method?: string;
    onload?: (response: any) => void;
    onerror?: (response: any) => void;
    onabort?: () => void;
    headers?: Record<string, string>;
    [key: string]: any;
}

/** 内存存储 */
const storage = new Map<string, any>();
/** 监听器表 */
const listeners = new Map<string, Set<(name: string, oldValue?: any, newValue?: any, remote?: boolean) => void>>();
/** GM_xmlhttpRequest 响应表：url -> { status, responseText } */
const responses = new Map<string, { status: number; responseText: string }>();

export const GM_getValue = (key: string, defaultValue?: any) =>
    storage.has(key) ? storage.get(key) : defaultValue;

export const GM_setValue = (key: string, value: any) => {
    const oldValue = storage.get(key);
    storage.set(key, value);
    listeners.get(key)?.forEach(cb => cb(key, oldValue, value, false));
};

export const GM_deleteValue = (key: string) => {
    const oldValue = storage.get(key);
    storage.delete(key);
    listeners.get(key)?.forEach(cb => cb(key, oldValue, undefined, false));
};

export const GM_listValues = () => Array.from(storage.keys());

export const GM_addValueChangeListener = (
    key: string,
    callback: (name: string, oldValue?: any, newValue?: any, remote?: boolean) => void,
) => {
    if (!listeners.has(key)) listeners.set(key, new Set());
    listeners.get(key)!.add(callback);
    return key + '-' + listeners.get(key)!.size;
};

export const GM_xmlhttpRequest = (options: GmRequestOptions) => {
    // 支持测试中异步注册响应
    const registered = responses.get(options.url);
    const respond = () => {
        if (registered) {
            options.onload?.({
                response: registered.responseText,
                responseText: registered.responseText,
                status: registered.status,
                responseHeaders: '',
                finalUrl: options.url,
                readyState: 4,
            });
        } else {
            options.onerror?.({
                error: 'no response registered for ' + options.url,
                status: 0,
                readyState: 4,
            });
        }
    };
    queueMicrotask(respond);
    return { abort: () => options.onabort?.() };
};

export const GM_download = (_options: any) => ({ abort: () => {} });

export const GM_registerMenuCommand = () => 0;

export const GM_setClipboard = (_text: string, _type?: string, callback?: () => void) => {
    callback?.();
};

export const GM_openInTab = () => ({});

export const GM_info = {
    script: {
        name: 'test',
        version: '0.0.0-test',
        description: '',
        namespace: 'test',
        matches: [],
        grant: [],
    },
    scriptHandler: 'vitest',
    scriptVersion: '0.0.0-test',
    scriptMetaStr: '',
    platform: { os: { name: 'node', version: '' } },
    browser: { name: 'node', version: '' },
    scriptUpdateURL: '',
    scriptWillUpdate: false,
    scriptSource: '',
    scriptUrl: '',
    sandbox: {} as any,
};

// #region 测试辅助

/** 注册GM_xmlhttpRequest响应（返回注册数量） */
export const __setResponse = (url: string, status: number, data: unknown) => {
    responses.set(url, {
        status,
        responseText: typeof data === 'string' ? data : JSON.stringify(data),
    });
    return responses.size;
};

/** 清空GM_xmlhttpRequest响应表 */
export const __clearResponses = () => responses.clear();

/** 清空内存存储 */
export const __clearStorage = () => storage.clear();
// #endregion
