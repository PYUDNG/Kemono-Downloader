import { Component, createApp, h, reactive, ref, Ref } from "vue";
import type { ComponentExposed, ComponentProps } from 'vue-component-type-helpers'
import PrimeVue from 'primevue/config';
import { $CrE, CreateElementOptions } from "./dom-utils";
import i18n from '@/i18n/main.js';
import Ripple from 'primevue/ripple';
import ToastService from 'primevue/toastservice';
import ConfirmationService from "primevue/confirmationservice";
import { Nullable } from "../main";

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

    // 屏蔽Shadown DOM内常见事件冒泡，预防性阻止Shadow DOM和页面互相干扰
    // 例如：在Dialog的InputText内按下左右箭头时，不触发页面翻页
    // 已知缺陷：当Dialog打开但未focus在任一输入元素上时，按下左右键依然会触发翻页
    const events = Array.isArray(stopPropagation) ? stopPropagation : [
        'click', 'dblclick', 'auxclick',
        'mousedown', 'mouseup', 'mousewheel', 'wheel',
        'touchstart', 'touchend',
        'pointerdown', 'pointerup', 'pointerenter', 'pointerleave', 'pointermove', 'pointerout', 'pointerover',
        'contextmenu', 'scroll', 'scrollend',
        'keydown', 'keyup', 'keypress',
        'input', 'copy', 'paste', 'cut', 'compositionstart', 'compositionupdate', 'compositionend',
        'drag', 'dragstart', 'dragend', 'dragenter', 'dragleave', 'dragover', 'drop',
    ];
    stopPropagation && events.forEach(name => appElm.addEventListener(name, e => e.stopPropagation()));

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
    const rootComponent = reactive(expose!.component.exposed) as ComponentExposed<T>;

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
