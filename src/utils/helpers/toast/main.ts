import { createShadowApp, persistShadowHost } from '../ui-utils';
import App from './app.vue';

const { host, root } = createShadowApp(App, {
    options: {
        app: {},
    },
});
// 常驻UI：宿主SPA重渲染会移除body下的元素，注册后自动挂回
persistShadowHost(host);

const toast = (...args: Parameters<typeof root.add>) => root.add(...args);
toast.add = (...args: Parameters<typeof root.add>) => root.add(...args);
toast.remove = (...args: Parameters<typeof root.remove>) => root.remove(...args);

export { toast };