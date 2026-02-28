import { DBSchema, IDBPDatabase, openDB } from "idb";
import { FeatureNotSupportedError } from "../../types/base/error";
import { Nullable } from "@/utils/main";
import { ref, watch } from "vue";
const IDB_NAME = 'kemono-downloader.provider.fsa';
const STORE_NAME = 'filesystem-handle';
const KEY = 'download-directory';
const DIR_PICKER_ID = 'download-directory';

interface StoreType extends DBSchema {
    [STORE_NAME]: {
        key: typeof KEY,
        value: FileSystemDirectoryHandle,
    }
}

/**
 * 具备读写权限的下载目录Handle
 */
let dlDirHandle = ref<Nullable<FileSystemDirectoryHandle>>(null);
getHandleFromIndexedDB().then(handle => handle && (dlDirHandle.value = handle));

/**
 * 获取用于存储下载的文件的用户指定的目录，其逻辑如下：
 * 1. 首先尝试从内存缓存中取出先前获取的Handle（如果有）
*      - 检查permission是否可以读写，如果不支持就向用户请求权限
 * 2. 其次尝试从IndexedDB中取出之前保存的Handle（如果有）
 *     - 检查permission是否可以读写，如果不支持就向用户请求权限
 * 3. 如果上面两步都没有获取到具备权限的Handle，就请求新的目录Handle（读写模式）
 * 
 * **如果是首次调用或权限缺失，则需要[瞬态用户激活](https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/User_activation)**
 * 
 * @returns 一个可读写的目录Handle的Promise；如果由于某种原因出错了（浏览器不支持，用户拒绝授权，IndexedDB出错等），将会以该错误拒绝
 */
export async function getDownloadDirectoryHandle(): Promise<FileSystemDirectoryHandle> {
    checkCompatibility(true);

    // 从内存缓存中取得先前获取的handle
    if (dlDirHandle.value && await ensurePermission(dlDirHandle.value, 'readwrite'))
        return dlDirHandle.value;

    // 从IndexedDB取得先前存储的handle
    const storedHandle = await getHandleFromIndexedDB();

    // 当获取到了存储的handle且拥有权限时返回存储的handle，否则申请新的handle
    if (storedHandle && await ensurePermission(storedHandle, 'readwrite')) {
        // 返回存储的handle
        dlDirHandle.value = storedHandle;
        return storedHandle;
    } else {
        // 申请新的handle
        const newHandle = await requestNewHandle();
        return newHandle;
    }
}

/**
 * 尝试从IndexedDB读取handle，如果没有就返回undefined
 */
export async function getHandleFromIndexedDB() {
    const db = await openIndexedDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const storedHandle = await store.get(KEY);
    db.close();
    return storedHandle;
}

/**
 * 将IndexedDB中存储的文件目录Handle更新为给定Handle
 */
export async function updateIndexedDBHandle(handle: FileSystemDirectoryHandle) {
    const db = await openIndexedDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    store.put(handle, KEY);
    db.close();
}

/**
 * 打开存储文件目录Handle的IndexedDB数据库
 */
export async function openIndexedDB() {
    const checkObjectStore = (database: IDBPDatabase<StoreType>) => database.objectStoreNames.contains(STORE_NAME) || database.createObjectStore(STORE_NAME);
    const database = await openDB<StoreType>(IDB_NAME, 1, {
        upgrade(database, _oldVersion, _newVersion, _transaction, _event) {
            checkObjectStore(database);
        },
    });
    checkObjectStore(database);
    return database;
}

/**
 * 检查并请求权限  
 * @returns 是否最终拥有权限
 */
export async function ensurePermission(
    handle: FileSystemHandle,
    mode: FileSystemPermissionMode = 'readwrite',
): Promise<boolean> {
    if ('queryPermission' in handle) {
        // 支持权限检查，需要先检查权限
        let permission = await handle.queryPermission({ mode });

        // 循环检查权限，最多检查3次（防止无限循环；虽然里理论上连续三次prompt权限缺失不太可能发生）
        for (let i = 0; i < 3; i++) {
            switch (permission) {
                // 权限已获得，直接返回handle
                case 'granted':
                    return true;

                // 权限需要向用户申请
                case 'prompt':
                    permission = await handle.requestPermission({ mode });
                    break;

                // 权限已被拒绝，则请求并返回新的handle
                case 'denied':
                    return false;
            }
        }

        // 三次权限检查/申请后依然无法取得权限，说明拥护操作有误或者在主动拒绝授权，此时抛出错误
        throw new Error('cannot get directory readwrite permission');
    } else {
        // 不支持权限检查，默认权限已获得，直接返回handle
        return true;
    }
}

/**
 * 通过showDirectoryPicker向用户申请新的具有读写权限的目录handle  
 * 并存储到IndexdDB和内存缓存
 */
export async function requestNewHandle() {
    checkCompatibility(true);

    // 获取新的handle
    const handle = await window.showDirectoryPicker({
        id: DIR_PICKER_ID,
        mode: 'readwrite',
        startIn: 'downloads',
    });

    // 将新handle存储到内存缓存
    dlDirHandle.value = handle;

    // 将新handle存储到IndexedDB
    await updateIndexedDBHandle(dlDirHandle.value);
    return handle;
}

/**
 * 监听下载文件夹（句柄）变化，变化时回调
 */
export function watchDirChange(
    callback: (
        newHandle: Nullable<FileSystemDirectoryHandle>,
        oldHandle: Nullable<FileSystemDirectoryHandle> | undefined,
    ) => any,
    immediate: boolean = false,
) {
    watch(dlDirHandle, callback, { immediate });
}

/**
 * 检查当前浏览器是否支持fsa下载器
 * @param throwError 不支持时是否抛出错误，默认为false
 * @returns 布尔值，是否支持
 */
export function checkCompatibility(throwError: boolean = false): boolean {
    const compatible = 'showDirectoryPicker' in window;
    if (!compatible && throwError)
        throw new FeatureNotSupportedError('window.showDirectoryPicker not supported on your browser', 'fsa');
    return compatible;
}

/**
 * 递归/顺序获取或创建文件系统中的深层目录句柄
 * @param rootHandle 根文件夹目录handle
 * @param dirPath 需要获取的目录相对于根文件夹的路径
 * @param create 当文件/目录不存在时是否创建，默认为true；此项若为false，遇到文件/目录不存在时会抛出错误
 */
export async function getDirectoryHandleRecursive(
    rootHandle: FileSystemDirectoryHandle,
    dirPath: string,
    create: boolean = true,
): Promise<FileSystemDirectoryHandle> {
    // 规范化路径：将路径按 '/' 分割，过滤掉空字符串（如 '//' 或首尾 '/'）
    const parts: string[] = dirPath.replaceAll('\\', '/').split('/').filter(Boolean);
    if (parts.length === 0) return rootHandle;

    // 逐级获取目录
    let currentDirHandle = rootHandle;
    for (const dirName of parts) {
        // 逐级获取目录句柄
        currentDirHandle = await currentDirHandle.getDirectoryHandle(dirName, { create });
    }

    return currentDirHandle;
}

/**
 * 递归/顺序获取或创建文件系统中的深层文件句柄
 * @param rootHandle 根文件夹目录handle
 * @param filePath 需要获取的文件相对于根文件夹的路径
 * @param create 当文件/目录不存在时是否创建，默认为true；此项若为false，遇到文件/目录不存在时会抛出错误
 */
export async function getFileHandleRecursive(
    rootHandle: FileSystemDirectoryHandle,
    filePath: string,
    create: boolean = true,
): Promise<FileSystemFileHandle> {
    // 规范化路径：将路径按 '/' 分割，过滤掉空字符串（如 '//' 或首尾 '/'）
    const parts: string[] = filePath.replaceAll('\\', '/').split('/').filter(Boolean);
    if (parts.length === 0) throw new Error("Invalid path: Path cannot be empty.");

    // 提取文件名（最后一项）
    const fileName = parts.pop() as string;

    // 获取目标文件的父级目录
    const dirHandle = await getDirectoryHandleRecursive(rootHandle, parts.join('/'));

    // 获取文件句柄
    return await dirHandle.getFileHandle(fileName, { create });
}

/**
 * 极简进度信息接口
 */
export interface DownloadProgress {
    received: number; // 当前已接收字节数
    total: number;    // 文件总字节数 (若无法获取则为 0)
}

/**
 * 流式下载Kemono资源文件并写入已有的文件句柄
 * @param url 下载地址
 * @param fileHandle 已获取的 FileSystemFileHandle 实例
 * @param onProgress 进度回调函数
 */
export async function streamDownloadToFileHandle(
    url: string,
    fileHandle: FileSystemFileHandle,
    onProgress?: (progress: DownloadProgress) => void
): Promise<void> {
    // 发起请求
    const response = await fetch(url, { mode: 'cors' });

    if (!response.ok)
        throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);

    // 准备流读取器与文件写入流
    const total = Number(response.headers.get('Content-Length')) || 0;
    const reader = response.body?.getReader();

    if (!reader)
        throw new Error('ReadableStream not supported on this response.');

    // 创建可写流
    const writable = await fileHandle.createWritable({
        keepExistingData: false,
        // @ts-ignore `mode`参数存在，但项目使用的ts类型库'@types/wicg-file-system-access'尚未实现此类型
        mode: 'exclusive',
    });

    let received = 0;

    try {
        // 线性流式处理：读取 -> 写入 -> 回调
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            await writable.write(value);
            received += value.length;

            // 进度回调
            onProgress && onProgress({ received, total });
        }
    } catch (error) {
        // 可以在此处处理写入中断逻辑
        throw error;
    } finally {
        // 关闭文件可写流
        await writable.close();
        reader.releaseLock();
    }
}
