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
import FilenameHelpComp from "./gui/setting-help/Filename.vue";
import ProviderHelpComp from "./gui/setting-help/Provider.vue";
import { ProviderType } from "./types/base/task.js";
import { DisabledGUI } from "../settings/types.js";
import { BaseDownloadProvider, Feature } from "./types/base/provider.js";
import { Status } from "./types/interface/task.js";
import { GM_registerMenuCommand } from "$";
export { default as gui } from './gui/app.vue';
import DownloadIcon from '~icons/prime/download';
import FileEditIcon from '~icons/prime/file-edit';
import ImageIcon from '~icons/prime/image';
import FolderIcon from '~icons/prime/folder';
import ARALIcon from '~icons/prime/arrow-right-arrow-left';
import AlignJustifyIcon from '~icons/prime/align-justify';

const t = i18n.global.t;
const storage = globalStorage.withKeys('downloader');

// 翻译key前缀
const $downloader = i18nKeys.$downloader;
const $settings = $downloader.$settings;

// 模块定义
export default defineModule({
    id: 'downloader',
    name: t(i18nKeys.$downloader.$name),
});

// 设置项
/**
 * 当前provider  
 * 此变量隶属于{@link providerRelatedDisabled}函数使用
 */
const currentProvider = makeStorageRef('provider', storage);

registerModule({
    id: 'downloader',
    name: t($settings.$label),
    items: [{
        id: 'provider',
        type: 'select',
        label: t($settings.$provider.$label),
        caption: t($settings.$provider.$caption),
        icon: DownloadIcon,
        help: markRaw(ProviderHelpComp),
        props: {
            optionLabel: 'label',
            optionValue: 'value',
            options: Object.keys(providers).map(name => ({
                label: t($settings.$provider.$options + '.' + name),
                value: name,
            })),
        },
        value: makeStorageRef('provider', storage, true, false),
        reload: true,
        group: 'regular',
    }, {
        id: 'filename',
        type: 'text',
        icon: FileEditIcon,
        label: t($settings.$filename.$label),
        help: markRaw(FilenameHelpComp),
        props: {
            placeholder: storage.default('filename'),
        },
        value: makeStorageRef('filename', storage, true, false),
        group: 'regular',
    }, {
        id: 'noCoverFile',
        type: 'switch',
        icon: ImageIcon,
        label: t($settings.$noCoverFile),
        value: makeStorageRef('noCoverFile', storage, true, false),
        group: 'regular',
    }, {
        id: 'abortFiles',
        type: 'select',
        icon: FolderIcon,
        label: t($settings.$abortFiles.$label),
        caption: t($settings.$abortFiles.$caption),
        value: makeStorageRef('abortFiles', storage, true, false),
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
    }, {
        id: 'concurrent',
        type: 'number',
        icon: ARALIcon,
        label: t($settings.$concurrent.$label),
        caption: t($settings.$concurrent.$caption),
        props: {
            placeholder: storage.default('concurrent').toString(),
        },
        value: makeStorageRef('concurrent', storage, true, false),
        disabled: featureRelatedDisabled(
            'concurrent',
            (Object.keys(providers) as ProviderType[]).reduce((text, provider) => {
                const $featureNotSupported = $settings.$concurrent.$featureNotSupported;
                const $provider = $settings.$provider;
                text[provider] = {
                    text: t(
                        $featureNotSupported + '.' + provider, {
                            provider: t($provider.$options + '.' + provider),
                        }
                    ),
                    value: -1,
                };
                return text;
            }, {} as Record<ProviderType, Partial<DisabledGUI>>),
        ),
        group: 'regular',
    }, {
        id: 'textContent',
        type: 'select',
        label: t($settings.$textContent.$label),
        caption: t($settings.$textContent.$caption),
        icon: AlignJustifyIcon,
        props: {
            optionLabel: 'label',
            optionValue: 'value',
            options: ['none', 'txt', 'html'].map(val => ({
                label: t($settings.$textContent.$options + '.' + val),
                value: val,
            })),
        },
        value: makeStorageRef('textContent', storage),
        disabled: featureRelatedDisabled(
            'textContent',
            (Object.keys(providers) as ProviderType[]).reduce((text, provider) => {
                const $featureNotSupported = $settings.$textContent.$featureNotSupported;
                const $provider = $settings.$provider;
                text[provider] = {
                    text: t(
                        $featureNotSupported + '.' + provider, {
                            provider: t($provider.$options + '.' + provider),
                        }
                    ),
                    value: 'none',
                };
                return text;
            }, {} as Record<ProviderType, Partial<DisabledGUI>>),
        ),
        group: 'regular',
    }],
    index: 1,
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

/**
 * 根据当前provider是否支持某一特定feature决定设置项是否禁用
 * @param provider 若当前provider在此列表中，则**不禁用**；反之为禁用
 * @param text 当被禁用时，在界面上展示什么文本提示；数据类型为{ [当前provider]: 文本 }；若某些provider对应属性未设置，则在需要时使用默认的feature-not-supported文本
 * @returns 表示设置项禁用状态的响应式变量，可以直接填入SettingItem的disabled属性
 */
function featureRelatedDisabled(
    feature: Feature,
    gui: Partial<Record<ProviderType, Partial<DisabledGUI>>>) {
    return computed<boolean | DisabledGUI>(() => 
        providers[currentProvider.value].features.includes(feature) ?
            false :
            ({
                text: gui[currentProvider.value]?.text ??
                    t($settings.$featureNotSupported, { provider: currentProvider.value }),
                props: gui[currentProvider.value]?.props ??
                    { class: 'text-yellow-500' },
                value: gui[currentProvider.value]?.value,
            })
    );
}