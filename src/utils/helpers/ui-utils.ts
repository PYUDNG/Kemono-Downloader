import { Component, computed, createApp, h, reactive, ref, Ref } from "vue";
import type { ComponentExposed, ComponentProps } from 'vue-component-type-helpers'
import PrimeVue from 'primevue/config';
import { $CrE, CreateElementOptions } from "./dom-utils";
import i18n from '@/i18n/main.js';
import Ripple from 'primevue/ripple';
import ToastService from 'primevue/toastservice';
import ConfirmationService from "primevue/confirmationservice";
import { Nullable } from "../main";
import type Popover from "@/volt/Popover.vue";

interface ShadowAppCreationOptions<
    C extends Component
> {
    /**
     * 挂载Shadow DOM的HTML元素 或 元素的id  
     * 提供HTMLElement时，将直接挂载在该元素上  
     * 提供string时，将在body下创建一个新的div元素挂载shadow dom，并设置其id  
     * 省略时，将在body下创建一个新的div元素挂载shadow dom，不设置id
     */
    host?: HTMLElement | string | null,

    /**
     * shadowroot初始化选项
     */
    init?: ShadowRootInit,

    /**
     * 传递给根组件的props
     */
    props?: ComponentProps<C>,//Record<string, any>,

    /**
     * 应用级别的provide
     */
    provides?: Record<string | symbol, any>,

    /**
     * 内部元素创建附加选项
     */
    options?: Partial<Record<'host' | 'app', CreateElementOptions>>,

    /**
     * 阻止ShadowDOM内部事件冒泡到主文档  
     * 可以传入布尔值，也可以传入一个自定义的事件名称列表
     * @default true
     */
    stopPropagation?: boolean | string[],
}
const defaultOptions: Required<ShadowAppCreationOptions<Component>> = {
    host: null,
    init: { mode: 'open' },
    props: {},
    options: {},
    provides: {},
    stopPropagation: true,
};

// Fix: 重写document上的addEventListener，使得event.target可以获取到Shadow DOM内的元素
document.addEventListener = function(
    ...args: Parameters<typeof EventTarget.prototype.addEventListener>
): ReturnType<typeof EventTarget.prototype.addEventListener> {
    const [type, listener, options] = args;
    if (!listener) return;

    const wrappedListener = function(this: any, event: Event) {
        // 参数处理：提取事件处理器函数
        const handler = isEventListener(listener) ? listener : listener.handleEvent;

        // 当Shadow DOM的mode为'open'时，composedPath可以强制返回真实的原始节点
        const realTarget = event.composedPath()[0] || event.target;

        // 只有当原始 target 是 Shadow Host 时，才进行伪装
        // 这样可以确保非 Shadow DOM 的普通元素逻辑不受任何影响
        const needsProxy = event.target && 'shadowRoot' in event.target && event.target.shadowRoot && event.target !== realTarget;
        if (!needsProxy)
            // 当非shadowroot事件时，不进行event包装
            return handler.call(this, event);

        // 创建一个 Proxy 来拦截对 target 的访问
        const eventProxy = new Proxy(event, {
            get(target, prop: keyof Event) {
                if (prop === 'target') {
                    return event.composedPath()[0] || target.target;
                }
                return target[prop];
            }
        });
        return handler.call(this, eventProxy);
    };
    
    return EventTarget.prototype.addEventListener.call(this, type, wrappedListener, options);

    function isEventListener(listener: EventListenerOrEventListenerObject): listener is EventListener {
        return !('handleEvent' in listener);
    } 
};

// 异步导入styling，防止循环导入初始化死锁
let styling = import('@/styling.js');

/**
 * 挂载Shadowroot，并在其中创建Vue App
 * @param hostId 
 * @returns 创建的Vue app的根组件实例
 */
export function createShadowApp<
    T extends Component,
>(
    app: T,
    options: ShadowAppCreationOptions<T> = defaultOptions,
) {
    // 创建挂载Shadown DOM的宿主元素
    const { host, init, props, provides, stopPropagation } = Object.assign({}, defaultOptions, options);
    const hostElm: HTMLElement =
        host instanceof HTMLElement ? host : document.body.appendChild($CrE('div', options.options?.host ?? {}));
    typeof host === 'string' && hostElm.setAttribute('id', host);
    
    // 挂载Shadow DOM
    const shadow = hostElm.attachShadow(init);
    styling.then(styling => styling.styling.applyTo(shadow));

    // 在Shadow DOM中创建vue挂载元素
    const appElm = $CrE('div', options.options?.app ?? {});
    shadow.append(appElm);

    // 使用自定义的rem单位大小
    appElm.classList.add('text-base');

    // 滚动条样式
    appElm.classList.add('scrollbar-light', 'dark:scrollbar-dark');

    // 屏蔽Shadown DOM内常见事件冒泡，预防性阻止Shadow DOM和页面互相干扰
    // 例如：在Dialog的InputText内按下左右箭头时，不触发页面翻页
    // 已知缺陷：当Dialog打开但未focus在任一输入元素上时，按下左右键依然会触发翻页
    // 例外
    // - mouseup需要向上冒泡，以供Dialog监听拖动-释放事件，用于拖动窗口标题栏
    // - touchstart需要向上冒泡，以供popoverLogic监听任意位置点击，用于自动隐藏popover
    const events = Array.isArray(stopPropagation) ? stopPropagation : [
        'click', 'dblclick', 'auxclick',
        'mousedown', 'mousewheel', 'wheel',
        'touchend',
        'pointerdown', 'pointerup', 'pointerenter', 'pointerleave', 'pointermove', 'pointerout', 'pointerover',
        'contextmenu', 'scroll', 'scrollend',
        'keydown', 'keyup', 'keypress',
        'input', 'copy', 'paste', 'cut', 'compositionstart', 'compositionupdate', 'compositionend',
        'drag', 'dragstart', 'dragend', 'dragenter', 'dragleave', 'dragover', 'drop',
    ];
    stopPropagation && events.forEach(name => appElm.addEventListener(name, e => e.stopPropagation(), { passive: true }));

    // 创建应用实例
    // 为了保持根组件props的响应性，采用以下workaround，参考此issue：
    // https://github.com/vuejs/core/issues/4874#issuecomment-959008724
    // https://github.com/vuejs/core/issues/4874#issuecomment-1353941493
    let expose: Nullable<ComponentExposed<T>> = null;
    const appInstance = createApp({
        render: () => expose = h(app, props) as typeof expose
    })
        .use(i18n)
        .use(PrimeVue, {
            unstyled: true,
            ripple: true,
        })
        .use(ConfirmationService)
        .use(ToastService)
        .directive('ripple', Ripple);
    Reflect.ownKeys(provides).forEach(key => appInstance.provide(key, provides[key]));

    // 挂载应用并获得根组件实例
    //const rootComponent = appInstance.mount(appElm) as ComponentExposed<T>;
    appInstance.mount(appElm);
    const rootComponent = reactive(Object.assign({}, expose!.component.exposed)) as ComponentExposed<T>;

    // 返回根组件实例
    return {
        /** 挂载Shadow DOM的宿主元素 */
        host: hostElm,
        /** Vue App */
        app: appInstance,
        /** Vue 根组件实例 */
        root: rootComponent,
    };
}

/**
 * 根据viewport纵横比判断布局为横版还是竖版，并包装为一个Vue响应式变量
 * @param ratio 横:纵 临界比例，当大于这个比例时认为是横版布局，否则竖版布局；数值越小越偏向横版，数值越大越偏向纵版；默认为1
 * @returns （根据viewport纵横比）当前是横版还是竖版布局，跟随viewport大小实时更新
 */
export function getLayoutRef(ratio: number = 1): Ref<'vertical' | 'horizontal'> {
    const layout = ref<'vertical' | 'horizontal'>('vertical');
    let animationFrameId: number | null = null;

    const updateLayout = () => {
        layout.value = window.innerWidth / window.innerHeight > ratio ? 'horizontal' : 'vertical';
    };

    const handleResize = () => {
        if (animationFrameId !== null) {
            cancelAnimationFrame(animationFrameId);
        }
        animationFrameId = requestAnimationFrame(updateLayout);
    };

    updateLayout();
    window.addEventListener('resize', handleResize);

    return layout;
}

/**
 * z-index管理器
 * 用于管理全局的z-index层级，确保后创建的元素覆盖在先创建的元素之上
 */
class ZIndexManager {
    private baseZIndex: number;
    private currentZIndex: number;
    private static instance: ZIndexManager;

    private constructor(baseZIndex: number = 1000000) {
        this.baseZIndex = baseZIndex;
        this.currentZIndex = baseZIndex;
    }

    /**
     * 获取单例实例
     */
    public static getInstance(): ZIndexManager {
        if (!ZIndexManager.instance) {
            ZIndexManager.instance = new ZIndexManager();
        }
        return ZIndexManager.instance;
    }

    /**
     * 获取下一个可用的z-index值
     * @returns 下一个z-index值
     */
    public getNextZIndex(): number {
        this.currentZIndex += 10; // 每次增加10，留出空间给内部元素
        return this.currentZIndex;
    }

    /**
     * 重置z-index计数器
     * @param baseZIndex 可选的基础z-index值
     */
    public reset(baseZIndex?: number): void {
        if (baseZIndex !== undefined) {
            this.baseZIndex = baseZIndex;
        }
        this.currentZIndex = this.baseZIndex;
    }

    /**
     * 获取当前z-index值
     */
    public getCurrentZIndex(): number {
        return this.currentZIndex;
    }

    /**
     * 设置基础z-index值
     */
    public setBaseZIndex(baseZIndex: number): void {
        this.baseZIndex = baseZIndex;
        if (this.currentZIndex < baseZIndex) {
            this.currentZIndex = baseZIndex;
        }
    }
}

export const zIndexManager = ZIndexManager.getInstance();

/**
 * 将传入的字节数转化为`'10MB'`、`'2.34GB'`这样的格式化文本  
 * 单位选用规则：若以某更大单位表示时数字依然大于1，则以此更大单位表示
 * @param bytes 字节数
 */
export function stringifyBytes(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    let value = bytes;
    let unitIndex = 0;
    
    while (value >= 1024 && unitIndex < units.length - 1) {
        value /= 1024;
        unitIndex++;
    }

    // 保留两位小数，但如果是整数则显示整数
    const formattedValue = value % 1 === 0 ? value.toString() : value.toFixed(2);
    return `${formattedValue}${units[unitIndex]}`;
}

/**
 * 从给定HTML代码渲染成Text纯文本
 * @param html HTML代码
 */
export function extractText(html: string): string {
    return $CrE('div', {
        props: { innerHTML: html }
    }).innerText;
}

/**
 * 获取随resize事件实时更新的viewport大小
 * @returns 代表视口大小的对象: `{ height: window.innerHeight, width: window.innerWidth }`
 */
export function getViewport() {
    const viewport = ref<{
        height: number;
        width: number;
    }>({
        height: window.innerHeight,
        width: window.innerWidth,
    });
    window.addEventListener('resize', () => {
        viewport.value.height = window.innerHeight;
        viewport.value.width = window.innerWidth;
    });
    return viewport;
}

/**
 * 根据视口宽度，是否采用移动端布局
 * @returns 响应式变量，是否为移动端布局
 */
export function getIsMobileLayout() {
    const MIN_DISPLAY_WIDTH = 48 * 14; // TailwindCSS的md前缀，设置为48rem
    const viewport = getViewport();
    const useMobileLayout = computed(() => viewport.value.width < MIN_DISPLAY_WIDTH);
    return useMobileLayout;
}

/**
 * 根据userAgent判断当前是否运行在一个移动端浏览器上
 * @returns 布尔值（**不是**响应式变量），是否运行在移动端浏览器上
 */
export function isMobileAgent() {
    return /(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|ipad|iris|kindle|Android|Silk|lge |maemo|midp|mmp|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows (ce|phone)|xda|xiino/i.test(navigator.userAgent)
}

export interface PopoverLogicOptions<
    P extends any[],
> {
    /**
     * 防抖时长（单位：毫秒）  
     * 在显示Popover前后的防抖时段区间内，所有隐藏调用都会失效
     * @default 100
     */
    debounce?: number;

    /**
     * 在调用popover.show之前的hook回调，可以拦截show调用  
     * 如果在调用事件处理器函数时，在事件对象后添加了自定义的参数，将会传递到这里来
     * @param e 触发show调用的事件
     * @param params 自定义参数
     * @returns false表示取消show调用，任意其他值表示正常执行show
     */
    beforeShow?(e: Event, ...params: P): any;

    /**
     * 在调用popover.hide之前的hook回调，可以拦截hide调用
     * @param e 触发hide调用的事件
     * @returns false表示取消hide调用，任意其他值表示正常执行hide
     */
    beforeHide?(e: Event): any;
}

/**
 * 统筹Volt Popover组件的展示与隐藏逻辑  
 * 支持光标和触屏点击
 * @param popover Popover组件实例
 * @returns 一组事件处理器函数，将其绑定到DOM元素上即可自动触发Popover展示和隐藏
 */
export function popoverLogic<
    P extends any[],
>(
    popover: ComponentExposed<typeof Popover>,
    { debounce = 100, beforeShow, beforeHide }: PopoverLogicOptions<P> = {},
) {
    let isTouchScreen = false;
    let handle: Nullable<number> = null;
    let lastShowEvent: Event = new Event('placeholder-event');

    const show = (e: Event, ...params: P) => {
        // 显示可以打断/取消隐藏
        if (handle !== null) {
            clearTimeout(handle);
            handle = null;
        }
        lastShowEvent = e;
        // beforeShow钩子
        if (beforeShow?.(e, ...params) === false) return;
        // 显示Popover
        popover.show(e);
    };
    const hide = (e: Event) => {
        // 如果当前事件就是先前触发show的事件，则不隐藏
        if (e === lastShowEvent) return;
        // 规划：从现在开始到防抖时间后，执行隐藏，期间可以被显示打断/取消
        handle = setTimeout(() => {
            // beforeHide钩子
            if (beforeHide?.(e) === false) return;
            // 隐藏popover
            popover.hide();
        }, debounce);
    };

    // 触屏模式下，点击DOM其他位置时自动隐藏Popover
    const controller = new AbortController();
    document.addEventListener('touchstart', e => {
        isTouchScreen = true;
        // 隐藏
        hide(e);
    }, { signal: controller.signal });

    return {
        onTouchStart(e: TouchEvent, ...params: P) {
            isTouchScreen = true;
            show(e, ...params);
        },

        onMouseEnter(e: MouseEvent, ...params: P) {
            if (isTouchScreen) return;
            show(e, ...params);
        },

        onMouseLeave(e: MouseEvent) {
            if (isTouchScreen) return;
            hide(e);
        },

        /**
         * 当不在使用此处理器时应调用此方法  
         * 以清理所添加的全局事件监听器
         */
        destroy() {
            controller.abort();
        }
    };
}
