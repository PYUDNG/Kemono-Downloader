import I18nResource from "./zh/zh-Hans.js";

type KebabToCamel<S extends string> = 
    S extends `${infer First}-${infer Rest}`
        ? `${First}${KebabToCamel<Capitalize<Rest>>}`
        : S;

type PrefixedKeyMap<T> = string & {
    // camelCase 版本
    [K in keyof T as `$${string & KebabToCamel<string & K>}`]: T[K] extends string
        ? string
        : PrefixedKeyMap<T[K]>;
} & {
    // 原始 kebab-case 版本（必需）
    [K in keyof T as string & K extends `${infer _}-${infer __}` 
        ? `$${string & K}` 
        : never]: T[K] extends string
            ? string
            : PrefixedKeyMap<T[K]>;
};

type I18nKeyObj<T extends Record<string, any>> = PrefixedKeyMap<T>;

// 工具函数：kebab-case 转 camelCase
const kebabToCamel = (str: string): string => {
    return str.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
};

const makeI18nKeyObj = <T extends Record<string, any>>(
    root: T, 
    path: string[] = []
): I18nKeyObj<T> => {
    const baseObj: any = {};
    
    for (const key of Object.keys(root)) {
        const newPath = path.concat(key);
        const value = root[key];
        const camelKey = kebabToCamel(key);
        
        // 主要使用 camelCase 版本
        const mainKey = `$${camelKey}`;
        
        if (typeof value === 'string') {
            // 字符串叶子节点
            const pathString = newPath.join('.');
            baseObj[mainKey] = pathString;
            
            // 如果原始 key 是 kebab-case，也添加原始版本
            if (camelKey !== key) {
                const originalKey = `$${key}`;
                baseObj[originalKey] = pathString;
            }
        } else if (value && typeof value === 'object') {
            // 分支节点：递归加深
            const nestedObj = makeI18nKeyObj(value, newPath);
            baseObj[mainKey] = nestedObj;
            
            // 如果原始 key 是 kebab-case，也添加原始版本
            if (camelKey !== key) {
                const originalKey = `$${key}`;
                baseObj[originalKey] = nestedObj;
            }
        } else {
            // 其他类型叶子节点
            const pathString = newPath.join('.');
            baseObj[mainKey] = pathString;

            // 如果原始 key 是 kebab-case，也添加原始版本
            if (camelKey !== key) {
                const originalKey = `$${key}`;
                baseObj[originalKey] = pathString;
            }
        }
    }
    
    // 创建字符串对象
    const result = Object.assign(new String(path.join('.')), baseObj);
    
    return result as I18nKeyObj<T>;
};

// i18nKeys.$components.$postsSelector.$list.$search === 'components.posts-selector.list.search'
export const i18nKeys = makeI18nKeyObj(I18nResource);
