import { SingleOrArray } from "../main.js";

/** DOM检测选项 */
interface DetectDomOptions<E extends HTMLElement = HTMLElement> {
    root?: Node;
    selector?: string | string[];
    attributes?: boolean;
    callback?: (element: E) => void;
}

/**
 * 检测DOM元素出现
 * @overload
 * @param selector - 选择器
 * @returns Promise<HTMLElement>
 */
/**
 * 检测DOM元素出现
 * @overload
 * @param options - 检测选项
 * @returns MutationObserver
 */
/**
 * 检测DOM元素出现
 * @overload
 * @param root - 根节点
 * @param selectors - 选择器
 * @param attributes - 是否观察属性变化
 * @param callback - 回调函数
 * @returns MutationObserver
 */
export function detectDom(selector: string | string[]): Promise<HTMLElement>;
export function detectDom<E extends HTMLElement>(options: DetectDomOptions<E>): MutationObserver;
export function detectDom(
    root: Node,
    selectors?: SingleOrArray<string>,
    attributes?: boolean,
    callback?: (element: HTMLElement) => void
): MutationObserver;
export function detectDom(
    rootOrSelectorOrOptions: Node | string | string[] | DetectDomOptions,
    selectors?: string | string[],
    attributes?: boolean,
    callback?: (element: HTMLElement) => void
): MutationObserver | Promise<HTMLElement> {
    // 解析参数
    let config: {
        selectors: string[];
        root: Node;
        attributes: boolean;
        callback: ((element: HTMLElement) => void) | null;
    };

    if (rootOrSelectorOrOptions instanceof Node) {
        // 处理 (root, selectors?, attributes?, callback?) 形式
        config = {
            selectors: Array.isArray(selectors) ? selectors : [selectors || ''],
            root: rootOrSelectorOrOptions,
            attributes: attributes || false,
            callback: callback || null
        };
    } else if (typeof rootOrSelectorOrOptions === 'object' && !(rootOrSelectorOrOptions instanceof Node)) {
        // 处理 options 形式
        const options = rootOrSelectorOrOptions as DetectDomOptions;
        config = {
            selectors: Array.isArray(options.selector) ? options.selector : [options.selector || ''],
            root: options.root || document,
            attributes: options.attributes || false,
            callback: options.callback || null
        };
    } else {
        // 处理 selector 形式 (返回Promise)
        const selector = rootOrSelectorOrOptions as string | string[];
        return new Promise(resolve => {
            detectDom(document, selector, false, resolve);
        });
    }

    // 检查是否已存在元素
    const checkExisting = () => {
        const elements = selectAll(config.root, config.selectors);
        if (elements.length > 0) {
            elements.forEach(elm => {
                config.callback?.(elm);
            });
            return true;
        }
        return false;
    };

    if (checkExisting()) {
        const observer = new MutationObserver(() => { });
        observer.disconnect();
        return observer;
    }

    // 创建观察者
    const observer = new MutationObserver((mutations) => {
        const addedNodes: Node[] = [];

        mutations.forEach(mutation => {
            if (mutation.type === 'childList') {
                addedNodes.push(...mutation.addedNodes);
            } else if (mutation.type === 'attributes' && mutation.target) {
                addedNodes.push(mutation.target);
            }
        });

        const matchedNodes = new Set<HTMLElement>();
        addedNodes.forEach(node => {
            if (node instanceof HTMLElement && matches(node, config.selectors)) {
                matchedNodes.add(node);
            }
            const children = selectAll(node as Element, config.selectors);
            children.forEach(child => matchedNodes.add(child));
        });

        matchedNodes.forEach(node => {
            config.callback?.(node);
            // 如果是Promise模式，找到第一个就断开观察
            if (!config.callback) {
                observer.disconnect();
            }
        });
    });

    // 开始观察
    observer.observe(config.root, {
        childList: true,
        subtree: true,
        attributes: config.attributes,
    });

    return observer;
}

/** 辅助函数：检查元素是否匹配任一选择器 */
function matches(element: HTMLElement, selectors: string[]): boolean {
    return selectors.some(selector => element.matches(selector));
}

/** 辅助函数：选择所有匹配的元素 */
function selectAll(root: Node, selectors: string[]): HTMLElement[] {
    if (!(root instanceof Element || root instanceof Document || root instanceof DocumentFragment)) {
        return [];
    }

    return selectors.flatMap(selector => {
        return Array.from(root.querySelectorAll<HTMLElement>(selector));
    });
}

export interface CreateElementOptions {
    /** 通过 element[key] = value 赋值给元素的属性 */
    props?: Partial<HTMLElement>;

    /** 通过 element.setAttribute(key, value) 为元素设置的属性 */
    attrs?: Record<string, string>;

    /** 元素的类名，支持传入 类名属性字符串 或 类名数组 */
    classes?: SingleOrArray<string>;

    /** 元素的内联样式，支持传入 样式属性字符串 或 样式数据对象 */
    styles?: string | Partial<CSSStyleDeclaration>;

    /** 元素的事件监听器数组 */
    listeners?: Parameters<typeof HTMLElement.prototype.addEventListener>[]
}

export function $CrE<K extends keyof HTMLElementTagNameMap>(tag: K, options?: CreateElementOptions): HTMLElementTagNameMap[K]
export function $CrE<K extends keyof HTMLElementDeprecatedTagNameMap>(tag: K, options?: CreateElementOptions): HTMLElementDeprecatedTagNameMap[K]
export function $CrE(tag: string, options: CreateElementOptions = {}): HTMLElement {
    const elm = document.createElement(tag);

    // props
    for (const [key, val] of Object.entries(options.props ?? {})) Reflect.set(elm, key, val);

    // attrs
    for (const [key, val] of Object.entries(options.attrs ?? {})) elm.setAttribute(key, val);

    // classes
    Object.hasOwn(options, 'classes') && (elm.className = Array.isArray(options.classes) ? options.classes.join(' ') : options.classes ?? '');

    // styles
    typeof options.styles === 'string' ? (elm.style.cssText = options.styles) : Object.assign(elm.style, options.styles);

    // listeners
    options.listeners?.forEach(args => elm.addEventListener(...args));

    return elm;
}
