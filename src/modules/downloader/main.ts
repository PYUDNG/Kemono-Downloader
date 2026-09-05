import { createShadowApp, persistShadowHost, registerLocalizedMenuCommand } from "@/utils/main";
import { defineModule } from "../types.js";
import * as providers from './providers/main.js';
import { registerModule } from "../settings/main.js";
import i18n, { i18nKeys } from "@/i18n/main.js";
import { globalStorage, makeStorageRef } from '@/storage.js';
import App from './gui/app.vue';
import AppTaskDetail from './gui/app-taskdetail.vue';
import { computed, markRaw, reactive } from "vue";
import { rootTaskDetailInjectionKey } from "./gui/utils.js";
import FilenameHelpComp from "./gui/setting-help/Filename.vue";
import ProviderHelpComp from "./gui/setting-help/Provider.vue";
import { ProviderType } from "./types/base/provider.js";
import { DisabledGUI } from "../settings/types.js";
import { BaseDownloadProvider, Feature } from "./types/base/provider.js";
import { Status } from "./types/model.js";
import { getFilenameTemplate } from "./utils/main.js";
import type { ExpandFn, Resource } from "./types/model.js";
export { default as gui } from './gui/app.vue';
import DownloadIcon from '~icons/prime/download';
import FileEditIcon from '~icons/prime/file-edit';
import ImageIcon from '~icons/prime/image';
import FolderIcon from '~icons/prime/folder';
import ARALIcon from '~icons/prime/arrow-right-arrow-left';
import AlignJustifyIcon from '~icons/prime/align-justify';
import PrimeRefresh from '~icons/prime/refresh'

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
    name: computed(() => t($settings.$label)),
    items: [{
        id: 'provider',
        type: 'select',
        label: computed(() => t($settings.$provider.$label)),
        caption: computed(() => t($settings.$provider.$caption)),
        icon: DownloadIcon,
        help: markRaw(ProviderHelpComp),
        props: {
            optionLabel: 'label',
            optionValue: 'value',
            options: computed(() => Object.keys(providers).map(name => ({
                label: t($settings.$provider.$options + '.' + name),
                value: name,
            }))),
        },
        value: makeStorageRef('provider', storage, true, false),
        reload: true,
        group: 'regular',
    }, {
        id: 'filename',
        type: 'text',
        icon: FileEditIcon,
        label: computed(() => t($settings.$filename.$label)),
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
        label: computed(() => t($settings.$noCoverFile)),
        value: makeStorageRef('noCoverFile', storage, true, false),
        group: 'regular',
    }, {
        id: 'downloadOriginalImage',
        type: 'switch',
        icon: ImageIcon,
        label: computed(() => t($settings.$downloadOriginalImage.$label)),
        caption: computed(() => t($settings.$downloadOriginalImage.$caption)),
        value: makeStorageRef('downloadOriginalImage', storage, true, false),
        group: 'regular',
    }, {
        id: 'textContent',
        type: 'select',
        label: computed(() => t($settings.$textContent.$label)),
        caption: computed(() => t($settings.$textContent.$caption)),
        icon: AlignJustifyIcon,
        props: {
            optionLabel: 'label',
            optionValue: 'value',
            options: computed(() => ['none', 'txt', 'html'].map(val => ({
                label: t($settings.$textContent.$options + '.' + val),
                value: val,
            }))),
        },
        value: makeStorageRef('textContent', storage, true, false),
        disabled: featureRelatedDisabled(
            'textContent',
            provider => ({
                text: t(
                    $settings.$textContent.$featureNotSupported + '.' + provider, {
                        provider: t($settings.$provider.$options + '.' + provider),
                    }
                ),
                value: 'none',
            }),
        ),
        group: 'regular',
    }, {
        id: 'concurrent',
        type: 'number',
        icon: ARALIcon,
        label: computed(() => t($settings.$concurrent.$label)),
        caption: computed(() => t($settings.$concurrent.$caption)),
        props: {
            placeholder: storage.default('concurrent').toString(),
        },
        value: makeStorageRef('concurrent', storage, true, false),
        disabled: featureRelatedDisabled(
            'concurrent',
            provider => ({
                text: t(
                    $settings.$concurrent.$featureNotSupported + '.' + provider, {
                        provider: t($settings.$provider.$options + '.' + provider),
                    }
                ),
                value: -1,
            }),
        ),
        group: 'regular',
    }, {
        id: 'auto-retry',
        type: 'number',
        label: computed(() => t($settings.$autoRetry.$label)),
        caption: computed(() => t($settings.$autoRetry.$caption)),
        icon: PrimeRefresh,
        props: {
            placeholder: storage.default('autoRetry').toString(),
        },
        value: makeStorageRef('autoRetry', storage, true, false),
        group: 'regular',
    }, {
        id: 'abortFiles',
        type: 'select',
        icon: FolderIcon,
        label: computed(() => t($settings.$abortFiles.$label)),
        caption: computed(() => t($settings.$abortFiles.$caption)),
        value: makeStorageRef('abortFiles', storage, true, false),
        props: {
            optionLabel: 'label',
            optionValue: 'value',
            options: computed(() => ['prompt', 'delete', 'preserve'].map(action => ({
                label: t($settings.$abortFiles.$options + '.' + action),
                value: action,
            }))),
        },
        disabled: (function() {
            const provider = makeStorageRef('provider', storage);
            return computed(() => 
                providers[provider.value as ProviderType].features.includes('abortFiles') ?
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
    index: 1,
    groups: [{
        id: 'regular',
        name: computed(() => t($settings.$group)),
        index: 1,
    }],
});

// 初始化下载器Provider
const providerType: ProviderType = storage.get('provider');
const provider = reactive(new providers[providerType]) as unknown as BaseDownloadProvider;

// 创建GUI
const { host: hostTaskDetail, app, root: rootTaskDetail } = createShadowApp(AppTaskDetail, {
    props: { provider, tasks: [], name: null },
    options: {
        app: {},
    }
});
app.provide(rootTaskDetailInjectionKey, rootTaskDetail);
// 常驻UI：宿主SPA重渲染会移除body下的元素，注册后自动挂回
persistShadowHost(hostTaskDetail);

const { host, root } = createShadowApp(App, {
    props: { provider },
    options: {
        app: {},
    },
    provides: {
        [rootTaskDetailInjectionKey]: rootTaskDetail
    }
});
persistShadowHost(host);

registerLocalizedMenuCommand('kd-show-ui', () => t($downloader.$showUi), () => showUI('ongoing'))

/**
 * 下载一个资源（资源树根）  
 * 页面流工厂在调用前先用站点adapter将下载意图解析为资源
 * @param resource 站点adapter解析出的资源
 * @param expand 站点adapter提供的展开函数
 * @param siteId 站点ID（用于解析站点专属文件名模板）
 */
export async function downloadResource(resource: Resource, expand: ExpandFn, siteId?: string) {
    const template = getFilenameTemplate(siteId);
    // 注：provider的download可能为异步（如fsa需先获取目录句柄），统一await后取得任务ID
    const taskId = await Promise.resolve(provider.download(resource, expand, template));
    const status = provider.tasks.find(t => t.id === taskId)!.progress.status;
    root.tab = status;
    root.visible = true;
}

export function showUI(tab?: Status) {
    tab && (root.tab = tab);
    root.visible = true;
}

/**
 * 当前下载状态（任务执行状态的高层聚合）  
 * - `'downloading'`: 存在执行中的任务（init/queue/ongoing），优先级最高
 * - `'paused'`: 无执行中任务，但存在已暂停任务
 * - `'none'`: 既无执行中也无暂停任务
 */
export const downloadState = computed<'none' | 'downloading' | 'paused'>(() => {
    const tasks = provider.tasks;
    if (tasks.some(t => ['init', 'queue', 'ongoing'].includes(t.progress.status))) return 'downloading';
    if (tasks.some(t => t.progress.status === 'paused')) return 'paused';
    return 'none';
});

/**
 * 根据当前provider是否支持某一特定feature决定设置项是否禁用
 * @param provider 若当前provider支持此feature，则**不禁用**；反之为禁用
 * @param gui 当被禁用时，在界面上展示什么文本提示；入参为当前provider，
 *            返回{ text, value }等提示信息（工厂形式：在响应式计算内调用，保证文本随语言实时更新）
 * @returns 表示设置项禁用状态的响应式变量，可以直接填入SettingItem的disabled属性
 */
function featureRelatedDisabled(
    feature: Feature,
    gui: (provider: ProviderType) => Partial<DisabledGUI> | undefined) {
    return computed<boolean | DisabledGUI>(() => {
        const provider = currentProvider.value as ProviderType;
        const entry = gui(provider);
        return providers[provider].features.includes(feature) ?
            false :
            ({
                text: entry?.text ??
                    t($settings.$featureNotSupported, { provider }),
                props: entry?.props ??
                    { class: 'text-yellow-500' },
                value: entry?.value,
            })
    });
}
