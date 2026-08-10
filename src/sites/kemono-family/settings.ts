import { computed, markRaw } from 'vue';
import { globalStorage, makeStorageRef } from '@/storage.js';
import { onModuleRegistered, registerGroup, registerItem, registerModule } from '@/modules/settings/main.js';
import FilenameHelpComp from '@/modules/downloader/gui/setting-help/Filename.vue';
import i18n, { i18nKeys } from '@/i18n/main.js';
import FileEditIcon from '~icons/prime/file-edit';
import type { Site } from '../types.js';

const t = i18n.global.t;
const storage = globalStorage.withKeys('downloader');
const $filename = i18nKeys.$downloader.$settings.$filename;
const $sites = i18nKeys.$sites;

// 站点设置模块：收纳所有站点的专属设置（与下载器模块解耦，下载器模块只负责provider设置）
registerModule({
    id: 'sites',
    name: computed(() => t($sites.$settings.$label)),
    // 位于「下载器」之后、「关于」之前
    index: 2,
    items: [],
    groups: [],
});

/**
 * 注册站点专属文件名模板设置项（优先级高于通用模板）  
 * 在站点adapter模块加载时调用，设置项注册到「站点设置」模块
 * @param site 站点adapter
 */
export function registerSiteFilenameSetting(site: Site): void {
    const filenameBySite = makeStorageRef('filenameBySite', storage, false);

    /**
     * 站点专属文件名模板设置项的值（读写`filenameBySite[site.id]`）
     */
    const siteFilename = computed<string>({
        get: () => filenameBySite.value[site.id] ?? '',
        set: (value) => {
            filenameBySite.value = { ...filenameBySite.value, [site.id]: value };
        },
    });

    onModuleRegistered('sites', () => {
        registerGroup('sites', {
            id: site.id,
            index: 3,
            name: site.label,
        });

        registerItem('sites', [{
            id: 'site-filename',
            type: 'text',
            label: computed(() => t($filename.$label)),
            help: markRaw(FilenameHelpComp),
            icon: FileEditIcon,
            props: {
                placeholder: storage.default('filename'),
            },
            value: siteFilename,
            group: site.id,
        }]);
    });
}
