import { createApp, ref, Ref } from "vue";
import PrimeVue from 'primevue/config';
import { $CrE, CreateElementOptions } from "./dom-utils";
import i18n from '@/i18n/main.js';

interface ShadowAppCreationOptions {
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
    props?: Record<string, any>,

    /**
     * 内部元素创建附加选项
     */
    options?: Partial<Record<'host' | 'app', CreateElementOptions>>,
}
const defaultOptions: ShadowAppCreationOptions = {
    host: null,
    init: { mode: 'open' },
    props: {},
    options: {},
};

/**
 * 挂载Shadowroot，并在其中创建Vue App
 * @param hostId 
 * @returns 创建的Vue app
 */
export function createShadowApp(
    app: any,
    options: ShadowAppCreationOptions = defaultOptions,
) {
    const { host, init, props } = Object.assign({}, defaultOptions, options);
    const hostElm: HTMLElement =
        host instanceof HTMLElement ? host : document.body.appendChild($CrE('div', options.options?.host ?? {}));
    typeof host === 'string' && hostElm.setAttribute('id', host);
    
    const shadow = hostElm.attachShadow(init!);
    import('@/styling').then(styling => styling.styling.applyTo(shadow));

    const appElm = $CrE('div', options.options?.app ?? {});
    shadow.append(appElm);

    const appInstance = createApp(app, props).use(i18n).use(PrimeVue, { unstyled: true }).mount(appElm);
    return appInstance;
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
