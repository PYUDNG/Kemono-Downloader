import { createShadowApp, SingleOrArray } from "@/utils/main";
import { defineModule } from "../types";
import { DownloadProvider, DownloadTaskInfo } from "./types";
import { registerModule } from "../settings/main.js";
import i18n from "@/i18n/main.js";
import { globalStorage, makeStorageRef } from '@/storage.js';
import BrowserDownloadProvider from "./provider/browser/main.js";
import App from './gui/app.vue';
export * as gui from './gui/app.vue';

const t = i18n.global.t;
const storage = globalStorage.withKeys('downloader');

// 模块定义
export default defineModule({
    id: 'downloader',
    name: '下载器',
});

// 设置项
registerModule({
    id: 'downloader',
    name: t('downloader.settings.label'),
    items: [{
        id: 'provider',
        type: 'select',
        label: t('downloader.settings.provider.label'),
        caption: t('downloader.settings.provider.caption'),
        value: makeStorageRef('provider', storage),
        props: {
            optionLabel: 'label',
            optionValue: 'value',
            options: [{
                label: t('downloader.settings.provider.options.browser'),
                value: 'browser',
            }, {
                label: t('downloader.settings.provider.options.fsa'),
                value: 'fsa',
            }, {
                label: t('downloader.settings.provider.options.aria2'),
                value: 'aria2',
            }],
        },
        reload: true,
    }],
});

// 初始化下载器Provider
const provider: DownloadProvider = new ({
    browser: BrowserDownloadProvider,
    fsa: BrowserDownloadProvider,
    aria2: BrowserDownloadProvider,
})[storage.get('provider')];

// 创建GUI
createShadowApp(App, {
    props: { provider }
});

/**
 * 创建下载任务
 */
export function download(tasks: SingleOrArray<DownloadTaskInfo>) {
    tasks = Array.isArray(tasks) ? tasks : [tasks];
    tasks.forEach(task => provider.addTask(task));
}