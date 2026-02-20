import { GM_getValue, GM_setValue, GM_deleteValue, GM_listValues, GM_addValueChangeListener } from "$";
import { deepEqual, HintedString, UserscriptStorage } from "@/utils/main.js";
import { ref, watch } from "vue";
import { ProviderType } from "./modules/downloader/types/interface/main.js";

/**
 * 全局作用域的用户存储管理器
 */
export const globalStorage = new UserscriptStorage(
    { GM_getValue, GM_setValue, GM_deleteValue, GM_listValues, GM_addValueChangeListener },
    {
        downloader: {
            /**
             * 使用哪种下载器
             */
            provider: 'browser' as ProviderType,

            /**
             * 移除下载任务时，是否默认勾选“同时删除已下载文件”复选框
             */
            removeFiles: true as boolean,

            /**
             * 文件名命名模板
             */
            filename: '{Name}' as string,

            /**
             * 不同provider自己的设置空间
             */
            providerSettings: {} as Record<string, unknown>,
        },
        settings: {
            /**
             * 设置项输入时是否保持帮助文本常态化显示（如果有）
             */
            helpOnInput: true as boolean,
        },
    }
);

/**
 * 生成某一存储项的响应式变量，存储值与变量值之间实时同步
 * @param key 存储键
 * @param storage 用户存储管理器实例
 * @returns 
 */
export function makeStorageRef<
    K extends HintedString<keyof D & string>,
    D extends Record<string, any>
>(
    key: K,
    storage: UserscriptStorage<D> = globalStorage as unknown as UserscriptStorage<D>
) {
    const val = ref(storage.get(key));
    storage.watch(key, (_key, _oldVal, newVal, _remote) =>
        // 当存储和变量确实不再同步时，更新变量值
        deepEqual(val.value, newVal) || (val.value = newVal)
    );
    watch(val, value => 
        // 当存储和变量确实不再同步时，写入存储
        deepEqual(storage.get(key), value) || storage.set(key, value)
    );
    return val;
};
