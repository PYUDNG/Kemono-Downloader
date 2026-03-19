import { GM_getValue, GM_setValue, GM_deleteValue, GM_listValues, GM_addValueChangeListener } from "$";
import { deepEqual, HintedString, UserscriptStorage } from "@/utils/main.js";
import { ref, watch } from "vue";
import { ProviderType } from "./modules/downloader/types/base/task.js";
import { LogPage } from "./modules/debugging/types.js";

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
             * 文件名命名模板
             */
            filename: '{Name}' as string,

            /**
             * 是否不下载封面图文件
             */
            noCoverFile: false as boolean,

            /**
             * 取消下载任务时，如何处理该任务中已下载的文件
             */
            abortFiles: 'prompt' as 'prompt' | 'delete' | 'preserve',

            /**
             * 不同provider自己的设置空间
             */
            providerSettings: {
                browser: {},
                fsa: {},
                aria2: {
                    endpoint: 'http://127.0.0.1:6800/jsonrpc',
                    secret: '' as string,
                    dir: '' as string,
                    interval: 1 as number,
                },
            },
        },
        settings: {
            /**
             * 设置项输入时是否保持帮助文本常态化显示（如果有）
             */
            helpOnInput: true as boolean,
        },
        debugging: {
            saveLogs: false as boolean,
            /** 可以存入任何可序列化的数据，数据格式取决于你的序列化方法 */
            logs: [] as LogPage[],
        },
    }
);

/**
 * 生成某一存储项的响应式变量，存储值与变量值之间实时同步
 * @param key 存储键
 * @param storage 用户存储管理器实例
 * @param autoClear 当响应式变量被修改为空值时，是否从存储空间删除此条目以恢复默认值；默认为false，为true时`['', null, undefined]`中的值被认为是空值，也可以传入自己的空值数组以自定义
 * @param useDefaultValue 当默认值实际未写入存储时，变量值是否设置为默认值，为false时，变量值为undefined；默认为true
 * @returns 
 */
export function makeStorageRef<
    K extends HintedString<keyof D & string>,
    D extends Record<string, any>
>(
    key: K,
    storage: UserscriptStorage<D> = globalStorage as unknown as UserscriptStorage<D>,
    autoClear: boolean | any[] = ['', null, undefined],
    useDefaultValue: boolean = true,
) {
    const val = ref(storage.get(key));
    autoClear === true && (autoClear = [null, undefined, '']);
    autoClear === false && (autoClear = []);

    storage.watch(key, (_key, _oldVal, newVal, _remote) => {
        // 仅当存储和变量确实不再同步时，才更新变量值
        if (!deepEqual(val.value, newVal)) {
            // 接收到的新值有可能确实是存储中的实际值，也有可能在存储中此键已不存在，此时回调的值为默认值
            if (storage.has(key) || useDefaultValue) {
                // 是实际值 或者 指定了使用默认值
                val.value = newVal;
            } else {
                // 是默认值 并且 指定了不使用默认值
                val.value = undefined;
            }
        }
    });
    watch(val, value => {
        if (autoClear.includes(value)) {
            // 当为空值时，删除存储条目以回退到默认值
            storage.has(key) && storage.delete(key)
        } else {
            // 不为空值，就需要考虑是否写入存储
            if (!deepEqual(storage.get(key), value)) {
                // 当存储和变量不同步时，写入存储
                storage.set(key, value);
            } else {
                // 变量和存储值一致，一般来说不需要写入存储
                if (!storage.has(key) && value !== undefined) {
                    // 但是如果存储值未写入且变量值不是代表未写入的undefined，
                    // 那就说明存储（空的）和变量（不是空的）还是不同步（只不过都表现为默认值而通过了值相等性对比）
                    // 此时就得写入一下存储了
                    storage.set(key, value);
                }
            }
        }
    });
    return val;
};
