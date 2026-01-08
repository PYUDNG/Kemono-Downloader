import { createApp } from "vue";
import PrimeVue from 'primevue/config';

/**
 * 记录并控制当前最高Dialog的层级，用于协调z-index层级关系，保证后来者居上
 */
let dialogLayer: number = 0;

/**
 * 创建新的悬浮窗Vue App
 * @param App Vue app
 * @param containerId 装载Shadow DOM的宿主元素ID，留空则不设置
 */
export function createDialog(App: Parameters<typeof createApp>[0], hostId?: string) {
    // ShadowRoot内Container元素的内联样式
    const containerStyles: Record<string, string> = {
        position: 'fixed',
        display: 'flex',
        'align-items': 'center',
        'justify-content': 'center',
        margin: '0',
        border: '0',
        padding: '0',
        left: '0',
        top: '0',
        width: '100vw',
        height: '100vh',
        'z-index': (1000000 + (dialogLayer++)).toString(),
    };
    const containerCssText = Object.entries(containerStyles).map(([key, val]) => `${key}: ${val};`).join(' ');;

    // 创建一个新的Shadow DOM，并在其中创建fixed布局的container，进而建立Vue App
    createApp(App).use(PrimeVue, {
        unstyled: true,
    }).mount(
        (() => {
            const host = document.createElement('div');
            const shadow = host.attachShadow({ mode: 'open' });
            const container = document.createElement('div');
            const app = document.createElement('div');
            container.style.cssText = containerCssText;
            typeof hostId === 'string' && (app.id = hostId);
            import('@/styling.js').then(({ styling }) => styling.applyTo(shadow));
            container.append(app);
            shadow.append(container);
            document.body.append(host);
            return app;
        })(),
    );
}