import { createShadowApp } from '../ui-utils';
import App from './app.vue';

const { root } = createShadowApp(App, {
    options: {
        app: {
            classes: 'dark',
        }
    },
});

export const toast = (...args: Parameters<typeof root.show>) => root.show(...args);