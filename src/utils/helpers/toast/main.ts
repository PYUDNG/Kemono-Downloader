import { createShadowApp } from '../ui-utils';
import App from './app.vue';

const { root } = createShadowApp(App, {
    options: {
        app: {
            classes: 'dark',
        }
    },
});

const toast = (...args: Parameters<typeof root.add>) => root.add(...args);
toast.add = (...args: Parameters<typeof root.add>) => root.add(...args);
toast.remove = (...args: Parameters<typeof root.remove>) => root.remove(...args);

export { toast };