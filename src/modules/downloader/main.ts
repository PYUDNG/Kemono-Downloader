import { createShadowApp } from "@/utils/main";
import { defineModule } from "../types.js";
import * as providers from './providers/main.js';
import { IDownloadProvider, ProviderType } from "./types/interface/main.js";
import { registerModule } from "../settings/main.js";
import i18n from "@/i18n/main.js";
import { globalStorage, makeStorageRef } from '@/storage.js';
import App from './gui/app.vue';
import AppTaskDetail from './gui/app-taskdetail.vue';
import { reactive } from "vue";
import { PostInfo } from "../api/types/common.js";
import { rootTaskDetailInjectionKey } from "./gui/utils.js";
export { default as gui } from './gui/app.vue';

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
            options: Object.keys(providers).map(name => ({
                label: t('downloader.settings.provider.options.' + name),
                value: name,
            })),
        },
        reload: true,
    }, {
        id: 'filename',
        type: 'text',
        label: t('downloader.settings.filename.label'),
        help: t('downloader.settings.filename.help'),
        value: makeStorageRef('filename', storage),
    }],
});

// 初始化下载器Provider
const providerType: ProviderType = storage.get('provider');
const provider: IDownloadProvider = reactive(new providers[providerType]);

// 创建GUI
const { app, root: rootTaskDetail } = createShadowApp(AppTaskDetail, {
    props: { provider, tasks: [], name: null },
    options: {
        app: {
            classes: 'dark'
        }
    }
});
app.provide(rootTaskDetailInjectionKey, rootTaskDetail);

const { root } = createShadowApp(App, {
    props: { provider },
    options: {
        app: {
            classes: 'dark'
        },
    },
    provides: {
        [rootTaskDetailInjectionKey]: rootTaskDetail
    }
});

export function downloadPost(info: PostInfo) {
    const taskId = provider.downloadPost(info);
    const status = provider.tasks.find(t => t.id === taskId)!.progress.status;
    root.tab = status;
    root.visible = true;
}

export function downloadPosts(name: string, infos: PostInfo[]) {
    const taskId = provider.downloadPosts(name, infos);
    const status = provider.tasks.find(t => t.id === taskId)!.progress.status;
    root.tab = status;
    root.visible = true;
}