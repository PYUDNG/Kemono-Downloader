import { GM_addValueChangeListener, GM_deleteValue, GM_getValue, GM_listValues, GM_setValue, GmAddValueChangeListenerType, GmValueListenerId } from "$";
import { ref, watch } from "vue";
import { HintedString } from "../main.js";

export interface GM_Storage {
    GM_getValue: typeof GM_getValue,
    GM_setValue: typeof GM_setValue,
    GM_deleteValue: typeof GM_deleteValue,
    GM_listValues: typeof GM_listValues,
    GM_addValueChangeListener: typeof GM_addValueChangeListener,
}

/**
 * 用户存储管理器
 */
export class UserscriptStorage<D extends Record<string, any>> {
    private storage: GM_Storage;
    private defaultValues: D;

    /**
     * 用户脚本存储管理器
     * @param storage 访问脚本存储空间的函数/方法
     * @param defaultValues 脚本存储的默认值对象
     */
    constructor(
        storage: GM_Storage,
        defaultValues?: D,
    ) {
        this.storage = storage;
        this.defaultValues = defaultValues ?? {} as D;
    }

    /**
     * 读取存储值，当值不存在时返回默认值
     * @param name 存储键
     * @param defaultVal 本次调用的默认值，优先级高于创建当前实例时传入的总默认值对象
     * @returns 
     */
    get<
        K extends HintedString<string & keyof D>,
        T = undefined,
    >(
        name: K,
        defaultVal?: T
    ):
        typeof defaultVal extends undefined ?
            // 本次调用未提供默认值时
            K extends keyof D ?
                // 默认值对象中存在此键，返回值类型为默认值对象中此键的值
                D[K] :
                // 默认值对象中无此键时，返回值类型为any（取决于实际已存储的值）
                any :
            // 本地调用提供了默认值时，返回值类型为本次提供的默认值的类型
            T
    {
        // 默认值
        defaultVal = defaultVal !== undefined ?
            // 若本次调用提供了默认值，则使用本次提供的默认值
            defaultVal :
            // 若本次调用未提供默认值
            Object.hasOwn(this.defaultValues, name) ?
                // 总默认值对象中有本次访问的键的默认值，就使用它
                this.defaultValues[name] :
                // 总默认值对象中也没有本次访问的键的默认值，则默认为空值
                undefined;
        
        // 从脚本存储中读取值
        const value = this.storage.GM_getValue(name, defaultVal);

        // 当读取到空值时，说明脚本存储中尚无此键，返回undefined
        // 其余情况则要么读取到了值，要么为上述默认值，可直接返回
        return value as unknown as ReturnType<typeof this.get<K, T>>;
    }

    /**
     * 写入存储值
     * @param name 存储键
     * @param value 存储值
     * @param writeDefault 当存储值为undefined时是否写入默认值
     */
    set<
        K extends keyof D,
    >(
        name: K,
        value: D[K],
    ): void;
    set(name: string, value: unknown): void;
    set(name: string, value: any) {
        this.storage.GM_setValue(name, value);
    }

    /**
     * 判断存储中是否已**写入**了某键（未写入仅有默认值返回false）
     * @param name 存储键
     * @returns 该键是否已写入存储
     */
    has<
        K extends HintedString<string & keyof D>
    >(name: K) {
        return this.storage.GM_getValue(name, undefined) !== undefined;
    }

    /**
     * 列出所有存储中可访问的键（默认情况下，包含存储中不存在，但已提供默认值的键）
     * @param noDefaults 是否排除默认值，仅列出存储中实际存在的键
     */
    list(noDefaults: boolean = false): string[] {
        if (noDefaults) {
            return this.storage.GM_listValues();
        } else {
            const set = new Set<string>();
            const storageKeys = this.storage.GM_listValues();
            const defaultKeys = Object.keys(this.defaultValues);
            [...storageKeys, ...defaultKeys].forEach(key => set.add(key));
            return Array.from(set);
        }
    }

    /**
     * 删除存储键
     * @param name 存储键
     */
    delete<
        K extends HintedString<string & keyof D>
    >(name: K): void {
        this.storage.GM_deleteValue(name);
    }

    /**
     * 监听存储值的变化
     * @param name 存储键
     * @param callback 
     * @returns 用户脚本管理器{@link GM_addValueChangeListener}返回的监听器ID
     */
    watch(name: string, callback: Parameters<GmAddValueChangeListenerType>[1]): GmValueListenerId {
        return this.storage.GM_addValueChangeListener(name, callback);
    }

    /**
     * 将传入的key作为命名空间，其值所对应的Object作为存储空间，生成一个子存储空间的{@link UserscriptStorage}实例
     * @param key 存储空间所用键
     * @returns 子存储空间的{@link UserscriptStorage}实例
     */
    withKeys<K extends string>(key: K): UserscriptStorage<
        K extends keyof D ?
            D[K] :
            {}
    > {
        const self = this;
        const isObject = (val: any): val is Record<string, any> => typeof val === 'object' && val !== null;
        const getStorageObject = () => {
            const obj = self.get(key);
            if (!isObject(obj))
                throw new TypeError(`substorage with key ${key} is not an object`);
            return obj;
        };

        const storage = new UserscriptStorage(
            {
                GM_getValue<T = any>(subKey: string, defaultValue?: T ): T {
                    const obj = getStorageObject();
                    if (Object.hasOwn(obj, subKey)) return obj[subKey] as T;
                    return defaultValue as T;
                },
                GM_setValue(subKey: string, value: unknown): void {
                    const obj = getStorageObject();
                    obj[subKey] = value;
                    self.set(key, obj);
                },
                GM_deleteValue(subKey: string): void {
                    const obj = getStorageObject();
                    delete obj[subKey];
                    self.set(key, obj);
                },
                GM_listValues(): string[] {
                    const obj = getStorageObject();
                    return Object.keys(obj);
                },
                GM_addValueChangeListener<T = any>(
                    subKey: string,
                    callback: (
                        name: string,
                        oldValue?: T,
                        newValue?: T,
                        remote?: boolean,
                    ) => void
                ): GmValueListenerId {
                    return self.storage.GM_addValueChangeListener(key, async (_name: string, oldVal?: T, newVal?: T, remote?: boolean) => {
                        // 如果更新前后存储空间值均不是object，则均视为默认值，两默认值一定相等无更改，无需callback
                        if (!isObject(oldVal) && !isObject(newVal)) return;
                        // 无论更新前还是更新后不是object，均视为默认值
                        if (!isObject(oldVal)) oldVal = self.get(key);
                        if (!isObject(newVal)) newVal = self.get(key);
                        // 如果使用默认值后依然有值不是object（比如未提供默认值的情况），则报错
                        if (!isObject(oldVal) || !isObject(newVal))
                            throw new TypeError(`substorage with key ${key} is not an object`);
                        // 更新前后存储值结合默认值，取得更新前后的实际读取值
                        const oldSubVal = Object.hasOwn(oldVal, subKey) ?
                            oldVal[subKey] :
                            Object.hasOwn(storage.defaultValues, subKey) ? storage.defaultValues[subKey] : undefined;
                        const newSubVal = Object.hasOwn(newVal, subKey) ?
                            newVal[subKey] :
                            Object.hasOwn(storage.defaultValues, subKey) ? storage.defaultValues[subKey] : undefined;
                        // 当更新前后值未改变时无需callback
                        const deepEqual = (await import('./js-utils.js')).deepEqual;
                        if (deepEqual(oldVal[subKey], newVal[subKey])) return;
                        // 确定存储空间值存在且监听值发生了改变，回调
                        callback(subKey, oldSubVal, newSubVal, remote);
                    });
                }
            },
            Object.hasOwn(this.defaultValues, key) ? this.defaultValues[key] : {}
        ) as UserscriptStorage<K extends keyof D ? D[K] : {}>;

        return storage;
    }
}

/**
 * 用户脚本CSS样式管理器
 */
export class UserscriptStyling {
    /**
     * 所有用户脚本样式CSS代码
     */
    private styles = ref<Record<string, string>>({});

    /**
     * 在`document.head`中插入的css代码
     * 
     * 注意：一般情况下不应在head中直接插入css代码，除非技术限制必须这么做  
     * 比如：`@font-face`规则在Shadow DOM中不生效，此时可插入到`document.head`
     */
    private headCSS = ref<string>('');

    constructor() {
        const headStyle = document.createElement('style');
        document.head.append(headStyle);
        watch(this.headCSS, val => headStyle.innerHTML = val);
    }

    /**
     * 设置一个样式
     * @param id 样式id，全局唯一
     * @param css 样式css代码
     */
    setStyle(id: string, css: string): void {
        this.styles.value[id] = css;
    }

    /**
     * 获取一个样式的css代码
     * @param id 样式id
     */
    getStyle(id: string): string | null {
        return Object.hasOwn(this.styles.value, id) ? this.styles.value[id] : null;
    }

    /**
     * 删除一个样式
     * @param id 样式id
     * @returns 若成功删除返回true，若给定id对应样式不存在返回false
     */
    deleteStyle(id: string): boolean {
        if (Object.hasOwn(this.styles.value, id)) {
            delete this.styles.value[id];
            return true;
        } else {
            return false;
        }
    }

    /**
     * 将所有样式**持续**应用到给定目标  
     * 当管理器的样式有所改变时，实时更改应用的样式
     * @param doc 应用目标
     * @returns 取消应用样式到该目标的方法
     */
    applyTo(doc: Document | ShadowRoot): () => void {
        const doApply = () => {
            let fontFaceCSS: string[] = [];
            const stylesheets = Object.values(this.styles.value).map(css => {
                // 制作成CSSStyleSheet
                const sheet = new CSSStyleSheet();
                sheet.replaceSync(css);

                // @font-face在Shadow DOM中不生效，需要手动将其提取后添加到<head>
                fontFaceCSS.push(
                    Array.from(sheet.cssRules)
                    .filter(r => r instanceof CSSFontFaceRule)
                    .map(r => r.cssText).join('\n')
                );

                return sheet;
            });

            doc.adoptedStyleSheets = stylesheets;
            this.headCSS.value = fontFaceCSS.join('\n');
        };
        doApply();
        const handle = watch(this.styles, doApply, { deep: true });
        const abort = () => {
            handle.stop();
            doc.adoptedStyleSheets = [];
        };
        return abort;
    }
}
