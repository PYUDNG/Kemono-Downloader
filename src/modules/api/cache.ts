import { GmXmlhttpRequestOption } from "$";
import { globalStorage, makeStorageRef } from "@/storage";
import { Nullable, PromiseOrRaw, TypedBroadcastChannel } from "@/utils/main";
import { DBSchema, IDBPDatabase, openDB } from "idb";
import { computed } from "vue";

const IDB_NAME = 'kemono-downloader.cache';
const STORE_NAME = 'api';

const storage = globalStorage.withKeys('api');

/**
 * 基础缓存项数据结构
 */
interface CacheItem {
    /**
     * 数据最后更新时间
     */
    time: number;

    /**
     * 缓存的响应  
     * 可以为Promise包裹的数据，或者直接的数据
     */
    data: PromiseOrRaw<string>;
}

/**
 * 内存缓存项数据结构
 */
interface MemoryCacheItem extends CacheItem {
    /**
     * 缓存的响应  
     * 类型为一个Promise，可以存储已获取的结果（使用Promise包裹），也可以存储进行中的请求（完成后resolve）
     */
    data: Promise<string>;

    /**
     * 该请求是否已完成  
     * 如果为true，则`data`属性应该为resolved状态  
     * 如果为false，则`data`属性应当为pending状态
     */
    completed: boolean;
}

/**
 * 可序列化的缓存项数据结构（供IndexedDB持久化/BroadcastChannel等使用）
 */
interface SerializableCacheItem extends CacheItem {
    /**
     * 缓存的响应  
     * 应为直接存储的字符串响应数据
     */
    data: string;
}

/**
 * 跨页面更新时，页面间交流所用的数据结构
 */
type UpdateMessage = {
    /**
     * 更新类型：缓存条目更新
     */
    type: 'update';

    /**
     * 更新的缓存键
     */
    key: string;

    /**
     * 更新的缓存项
     */
    item: SerializableCacheItem;
} | {
    /**
     * 更新类型：删除特定缓存条目
     */
    type: 'remove';

    /**
     * 删除的缓存键
     */
    key: string;
} | {
    /**
     * 更新类型：清空缓存
     */
    type: 'clear';
};

interface StoreType extends DBSchema {
    [STORE_NAME]: {
        key: string,
        value: SerializableCacheItem,
    }
}

/** API内存缓存 */
const cache = new Map<string, MemoryCacheItem>();
loadCacheData(cache);

/** 跨页面数据通信通道 */
const channel = new TypedBroadcastChannel<UpdateMessage>('kemono-downloader:api-cache');
// 接收和处理跨页面同步事件
channel.onMessage(update => {
    switch (update.type) {
        case 'update': {
            const { key, item } = update;
            cache.set(key, toMemoryItem(item));
            break;
        }
        case 'remove': {
            cache.delete(update.key);
            break;
        }
        case 'clear': {
            cache.clear();
            break;
        }
    }
});

/** 缓存有效期（分钟） */
const cacheExpires = makeStorageRef('cacheExpires', storage, true, false);
const cacheExpiresMS = computed(() => cacheExpires.value * 60 * 1000);

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
export const saveCache = <C = undefined>(
    request: GmXmlhttpRequestOption<'text', C>,
    data: PromiseOrRaw<string>,
) => {
    // 检查是否为GET请求
    const method = request.method?.toUpperCase();
    if (method && method !== 'GET') return;

    // 合成缓存Key
    const cacheKey = getCacheKey(request);

    // 存入内存缓存
    const item: MemoryCacheItem = {
        time: Date.now(),
        data: Promise.resolve(data),
        completed: !(data instanceof Promise),
    };
    cache.set(cacheKey, item);

    // 仅当缓存数据为已取得的response时才执行的异步任务
    item.completed && toSerializableItem(item).then(serialized => {
        // 跨页面同步缓存
        channel.post({
            type: 'update',
            key: cacheKey,
            item: serialized,
        });

        // 持久化缓存
        updateIndexedDBCache(cacheKey, serialized);
    });
};

/**
 * 根据请求体，取出先前进行的相同请求
 * @param request 请求体
 * @param completed 是否要求请求已完成，默认为false；如果此项为true且缓存中的请求尚未完成，就返回null
 * @returns 相同请求的response或者正在进行的Promise（最终会resolve为response）
 */
export const getCache = <C = undefined>(
    request: GmXmlhttpRequestOption<'text', C>,
    completed: boolean = false,
): Nullable<Promise<string>> => {
    const cacheKey = getCacheKey(request);
    const result = cache.get(cacheKey);
    if (!result) return null;
    if (completed && !result.completed) return null;
    if (Date.now() - result.time > cacheExpiresMS.value) {
        removeCache(request);
        return null;
    }
    return result.data;
};

/**
 * 检查某一请求体是否已有缓存
 * @param request 请求体
 * @param completed 是否要求请求已完成，默认为false；如果此项为true且缓存中的请求尚未完成，就返回false
 * @returns 是否有符合要求的缓存
 */
export const hasCache = <C = undefined>(
    request: GmXmlhttpRequestOption<'text', C>,
    completed: boolean = false,
): boolean => {
    const cacheKey = getCacheKey(request);
    const result = cache.get(cacheKey);
    if (!result) return false;
    if (completed && !result.completed) return false;
    if (Date.now() - result.time > cacheExpiresMS.value) {
        removeCache(request);
        return false;
    }
    return true;
};

/**
 * 清除特定缓存  
 * 注意，由于内部需要将修改写入IndexedDB缓存，因此存在异步调用；虽然函数不会等待该调用完成再返回（函数依然是同步的），但有可能在函数返回后IndexedDB写入依然没有完成
 * @param request 请求体
 * @returns 存在缓存且已清除时返回true，不存在缓存时返回false
 */
export const removeCache = <C = undefined>(request: GmXmlhttpRequestOption<'text', C>): boolean => {
    // 检查是否为GET请求
    const method = request.method?.toUpperCase();
    if (method && method !== 'GET') return false;

    // 合成缓存Key
    const cacheKey = getCacheKey(request);

    // 清除内存缓存
    const exist = cache.has(cacheKey);
    exist && cache.delete(cacheKey);

    // 跨页面同步
    channel.post({
        type: 'remove',
        key: cacheKey,
    });

    // 写入IndexedDB
    removeIndexedDBCache(cacheKey);

    // 返回缓存是否存在
    return exist;
};

/**
 * 清除全部缓存  
 * 注意，由于内部需要将修改写入IndexedDB缓存，因此存在异步调用；虽然函数不会等待该调用完成再返回（函数依然是同步的），但有可能在函数返回后IndexedDB写入依然没有完成
 * @returns 清理的缓存条目数量
 */
export const clearCache = (): number => {
    const count = cache.size;

    // 清理内存缓存
    cache.clear();

    // 跨页面同步
    channel.post({
        type: 'clear',
    });

    // 清理IndexedDB缓存
    clearIndexedDBCache();

    // 返回清理缓存的条目数量
    return count;
}

/**
 * 从IndexedDB数据库中读取API缓存数据
 * @param cache 缓存Map对象，提供时先清空该对象再直接在上更改，未提供时将创建新Map返回
 * @returns 包含了所有IndexedDB中的缓存数据的Map对象。传入cache参数时，返回原对象；未传入cache参数时，返回新创建的Map对象
 */
async function loadCacheData(cache?: Map<string, MemoryCacheItem>) {
    // 准备并清空Map
    cache || (cache = new Map<string, MemoryCacheItem>());
    cache.clear();

    // 从数据库中读取缓存数据
    const db = await openIndexedDB();
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    for await (const cursor of store) {
        const item = cursor.value;
        const cacheKey = cursor.key;
        cache.set(cacheKey, toMemoryItem(item));
    }
    db.close();

    // 返回缓存Map
    return cache;
}

/**
 * 将缓存项目持久化写入IndexedDB缓存
 * @param key 缓存键
 * @param item 缓存项目
 */
async function updateIndexedDBCache(key: string, item: SerializableCacheItem) {
    const db = await openIndexedDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    await store.put(item, key);
    db.close();
}

/**
 * 清空IndexedDB缓存
 */
async function clearIndexedDBCache() {
    const db = await openIndexedDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    await store.clear();
    db.close();
}

/**
 * 删除IndexedDB条目
 */
async function removeIndexedDBCache(key: string) {
    const db = await openIndexedDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    await store.delete(key);
    db.close();
}

/**
 * 打开存储API缓存数据的IndexedDB数据库
 */
async function openIndexedDB() {
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
 * 将内存缓存项转换为可序列化的缓存项  
 * **要求内存缓存项必须为已完成状态**，否则将会抛出错误
 * @param item 已完成的内存缓存项
 * @returns 
 */
async function toSerializableItem(item: MemoryCacheItem): Promise<SerializableCacheItem> {
    if (!item.completed) throw new TypeError('Incomplete MemoryCacheItem');
    return {
        time: item.time,
        data: await item.data,
    };
}

/**
 * 将可序列化的缓存项转换为内存缓存项
 * @param item 已完成的内存缓存项
 * @returns 
 */
function toMemoryItem(item: SerializableCacheItem): MemoryCacheItem {
    return {
        time: item.time,
        data: Promise.resolve(item.data),
        completed: true,
    };
}