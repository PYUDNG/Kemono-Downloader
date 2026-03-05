import { createShadowApp } from "@/utils/main";
import { defineModule } from "../types.js";
import * as providers from './providers/main.js';
import { registerModule } from "../settings/main.js";
import i18n, { i18nKeys } from "@/i18n/main.js";
import { globalStorage, makeStorageRef } from '@/storage.js';
import App from './gui/app.vue';
import AppTaskDetail from './gui/app-taskdetail.vue';
import { computed, markRaw, reactive } from "vue";
import { PostInfo } from "../api/types/common.js";
import { rootTaskDetailInjectionKey } from "./gui/utils.js";
import FilenameHelpComp from "./gui/FilenameHelpComp.vue";
import { ProviderType } from "./types/base/task.js";
import { DisabledGUI } from "../settings/types.js";
import { BaseDownloadProvider } from "./types/base/provider.js";
import { Status } from "./types/interface/task.js";
import { GM_registerMenuCommand } from "$";
export { default as gui } from './gui/app.vue';

const t = i18n.global.t;
const storage = globalStorage.withKeys('downloader');

// 翻译key前缀
const $downloader = i18nKeys.$downloader;
const $settings = $downloader.$settings;

// 模块定义
export default defineModule({
    id: 'downloader',
    name: '下载器',
});

// 设置项
registerModule({
    id: 'downloader',
    name: t($settings.$label),
    items: [{
        id: 'provider',
        type: 'select',
        icon: 'pi pi-download',
        label: t($settings.$provider.$label),
        caption: t($settings.$provider.$caption),
        value: makeStorageRef('provider', storage),
        props: {
            optionLabel: 'label',
            optionValue: 'value',
            options: Object.keys(providers).map(name => ({
                label: t($settings.$provider.$options + '.' + name),
                value: name,
            })),
        },
        reload: true,
        group: 'regular',
    }, {
        id: 'filename',
        type: 'text',
        icon: 'pi pi-file',
        label: t($settings.$filename.$label),
        help: markRaw(FilenameHelpComp),
        value: makeStorageRef('filename', storage),
        group: 'regular',
    }, {
        id: 'noCoverFile',
        type: 'switch',
        icon: 'pi pi-image',
        label: t($settings.$noCoverFile),
        value: makeStorageRef('noCoverFile', storage),
        group: 'regular',
    }, {
        id: 'abortFiles',
        type: 'select',
        icon: 'pi pi-folder',
        label: t($settings.$abortFiles.$label),
        caption: t($settings.$abortFiles.$caption),
        value: makeStorageRef('abortFiles', storage),
        props: {
            optionLabel: 'label',
            optionValue: 'value',
            options: ['prompt', 'delete', 'preserve'].map(action => ({
                label: t($settings.$abortFiles.$options + '.' + action),
                value: action,
            })),
        },
        disabled: (function() {
            const provider = makeStorageRef('provider', storage);
            return computed(() => 
                providers[provider.value].features.includes('abortFiles') ?
                    false :
                    ({
                        text: t($settings.$featureNotSupported, {
                            provider: t($settings.$provider.$options + '.' + provider.value),
                        }),
                        props: {
                            class: 'text-yellow-500'
                        },
                        value: 'preserve',
                    } satisfies DisabledGUI)
            );
        }) (),
        group: 'regular',
    }],
    groups: [{
        id: 'regular',
        name: t($settings.$group),
        index: 1,
    }],
});

// 初始化下载器Provider
const providerType: ProviderType = storage.get('provider');
const provider: BaseDownloadProvider = reactive(new providers[providerType]);

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

GM_registerMenuCommand(t($downloader.$showUi), _e => showUI('ongoing'))

export async function downloadPost(info: PostInfo) {
    const taskId = await Promise.resolve(provider.downloadPost(info));
    const status = provider.tasks.find(t => t.id === taskId)!.progress.status;
    root.tab = status;
    root.visible = true;
}

export async function downloadPosts(name: string, infos: PostInfo[]) {
    const taskId = await Promise.resolve(provider.downloadPosts(name, infos));
    const status = provider.tasks.find(t => t.id === taskId)!.progress.status;
    root.tab = status;
    root.visible = true;
}

export function showUI(tab?: Status) {
    tab && (root.tab = tab);
    root.visible = true;
}