import { createShadowApp } from "@/utils/main";
import { defineModule } from "../types.js";
import * as providers from './providers/main.js';
import { IDownloadProvider, ProviderType } from "./types/interface/main.js";
import { registerModule } from "../settings/main.js";
import i18n from "@/i18n/main.js";
import { globalStorage, makeStorageRef } from '@/storage.js';
import App from './gui/app.vue';
import AppTaskDetail from './gui/app-taskdetail.vue';
import { markRaw, reactive } from "vue";
import { PostInfo } from "../api/types/common.js";
import { rootTaskDetailInjectionKey } from "./gui/utils.js";
import FilenameHelpComp from "./gui/FilenameHelpComp.vue";
export { default as gui } from './gui/app.vue';

const t = i18n.global.t;
const storage = globalStorage.withKeys('downloader');

// 模块定义
export default defineModule({
    id: 'downloader',
    name: '下载器',
});

// 设置项
const tSettingsPrefix = 'downloader.settings.';
registerModule({
    id: 'downloader',
    name: t(tSettingsPrefix + 'label'),
    items: [{
        id: 'provider',
        type: 'select',
        icon: 'pi pi-download',
        label: t(tSettingsPrefix + 'provider.label'),
        caption: t(tSettingsPrefix + 'provider.caption'),
        value: makeStorageRef('provider', storage),
        props: {
            optionLabel: 'label',
            optionValue: 'value',
            options: Object.keys(providers).map(name => ({
                label: t(tSettingsPrefix + 'provider.options.' + name),
                value: name,
            })),
        },
        reload: true,
    }, {
        id: 'filename',
        type: 'text',
        icon: 'pi pi-file',
        label: t(tSettingsPrefix + 'filename.label'),
        help: markRaw(FilenameHelpComp),
        value: makeStorageRef('filename', storage),
    }, {
        id: 'noCoverFile',
        type: 'switch',
        icon: 'pi pi-image',
        label: t(tSettingsPrefix + 'no-cover-file'),
        value: makeStorageRef('noCoverFile', storage),
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