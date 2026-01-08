import { GM_addValueChangeListener, GM_deleteValue, GM_getValue, GM_listValues, GM_setValue, GmAddValueChangeListenerType, GmValueListenerId } from "$";
import { ref, watch } from "vue";

export interface GM_Storage {
    GM_getValue: typeof GM_getValue,
    GM_setValue: typeof GM_setValue,
    GM_deleteValue: typeof GM_deleteValue,
    GM_listValues: typeof GM_listValues,
    GM_addValueChangeListener: typeof GM_addValueChangeListener,
}

export class UserscriptStorage<D extends Record<string, any>> {
    private storage: GM_Storage;
    private defaultValues: D;
    private static readonly EmptyValue: unique symbol = Symbol('Empty Value');

    /**
     * 用户脚本存储管理器
     * @param storage 访问脚本存储空间的函数/方法
     * @param defaultValues 脚本存储的默认值对象
     */
    constructor(
        storage: GM_Storage,
        defaultValues: D,
    ) {
        this.storage = storage;
        this.defaultValues = defaultValues;
    }

    /**
     * 读取存储值，当值不存在时返回默认值
     * @param name 存储键
     * @param defaultVal 本次调用的默认值，优先级高于创建当前实例时传入的总默认值对象
     * @returns 
     */
    get<
        K extends string,
        T = D[K],
    >(
        name: K,
        defaultVal: T | typeof UserscriptStorage.EmptyValue = UserscriptStorage.EmptyValue
    ):
        typeof defaultVal extends D[K] ?
            // 当本次调用默认值类型与默认值对象中此键类型一致时，返回类型为此类型
            D[K] :
            // 不一致时
            (typeof defaultVal extends typeof UserscriptStorage.EmptyValue ?
                // 本次调用未提供默认值时
                (K extends keyof D ?
                    // 默认值对象中存在此键，返回值类型为默认值对象中此键的值
                    D[K] :
                    // 默认值对象中无此键时，返回值类型为any（取决于实际已存储的值）
                    any) :
                // 本地调用提供了默认值时，返回值类型为本次提供的默认值的类型
                T
            )
    {
        const EmptyValue: typeof UserscriptStorage.EmptyValue = UserscriptStorage.EmptyValue;

        // 默认值
        defaultVal = defaultVal !== UserscriptStorage.EmptyValue ?
            // 若本次调用提供了默认值，则使用本次提供的默认值
            defaultVal :
            // 若本次调用未提供默认值
            Object.hasOwn(this.defaultValues, name) ?
                // 总默认值对象中有本次访问的键的默认值，就使用它
                this.defaultValues[name] :
                // 总默认值对象中也没有本次访问的键的默认值，则默认为空值
                EmptyValue;
        
        // 从脚本存储中读取值
        const value = this.storage.GM_getValue(name, defaultVal);

        // 当读取到空值时，说明脚本存储中尚无此键，返回undefined
        // 其余情况则要么读取到了值，要么为上述默认值，可直接返回
        return (value === EmptyValue ? undefined : value) as unknown as ReturnType<typeof this.get<K, T>>;
    }

    /**
     * 写入存储值，当未提供存储值时，将默认值写入存储；若默认值对象中也无此键，则什么都不做  
     * **注意：写入默认值前请先检查存储中此键是否已有值，否则可能会导致已有值被覆盖**
     * @param name 存储键
     * @param value 存储值
     */
    set<
        K extends string,
    >(
        name: K,
        value: (K extends keyof D ? D[K] : any) | typeof UserscriptStorage.EmptyValue = UserscriptStorage.EmptyValue
    ): void {
        if (value === UserscriptStorage.EmptyValue) {
            // 未提供值，写入默认值
            Object.hasOwn(this.defaultValues, name) &&
                this.storage.GM_setValue(name, this.defaultValues[name]);
        } else {
            // 写入提供的存储值
            this.storage.GM_setValue(name, value);
        }
    }

    /**
     * 判断存储中是否已**写入**了某键（未写入仅有默认值返回false）
     * @param name 存储键
     * @returns 该键是否已写入存储
     */
    has(name: string) {
        const EmptyValue = UserscriptStorage.EmptyValue;
        return this.storage.GM_getValue(name, EmptyValue) !== EmptyValue;
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
    delete(name: string): void {
        this.storage.GM_deleteValue(name);
    }

    watch(name: string, callback: Parameters<GmAddValueChangeListenerType>[1]): GmValueListenerId {
        return this.storage.GM_addValueChangeListener(name, callback);
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