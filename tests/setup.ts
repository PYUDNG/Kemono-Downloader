/**
 * 测试环境setup：为Node环境补齐浏览器全局
 */

// 浏览器location（站点adapter依赖）
Object.defineProperty(globalThis, 'location', {
    value: {
        host: 'kemono.cr',
        hostname: 'kemono.cr',
        href: 'https://kemono.cr/fanbox/user/8062849',
        pathname: '/fanbox/user/8062849',
        search: '',
        hash: '',
        protocol: 'https:',
        origin: 'https://kemono.cr',
    },
    configurable: true,
    writable: true,
});

// 浏览器window（src/hooks.ts 依赖）
Object.defineProperty(globalThis, 'window', {
    value: {
        console: console,
        fetch: globalThis.fetch,
        EventTarget: EventTarget,
    },
    configurable: true,
    writable: true,
});

// 最小document桩（src/utils/helpers/ui-utils.ts 模块级会重写addEventListener）
Object.defineProperty(globalThis, 'document', {
    value: {
        addEventListener: () => {},
        head: { append: () => {} },
        createElement: () => ({}),
    },
    configurable: true,
    writable: true,
});
