import { computed, markRaw } from 'vue';
import { globalStorage, makeStorageRef } from '@/storage.js';
import { onModuleRegistered, registerGroup, registerItem } from '@/modules/settings/main.js';
import FilenameHelpComp from '@/modules/downloader/gui/setting-help/Filename.vue';
import i18n, { i18nKeys } from '@/i18n/main.js';
import FileEditIcon from '~icons/prime/file-edit';
import type { Site } from './types.js';

const t = i18n.global.t;
const storage = globalStorage.withKeys('downloader');
const $filename = i18nKeys.$downloader.$settings.$filename;

/**
 * 注册站点专属文件名模板设置项（优先级高于通用模板）  
 * 在站点adapter模块加载时调用
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

    onModuleRegistered('downloader', () => {
        registerGroup('downloader', {
            id: site.id,
            index: 3,
            name: site.label,
        });

        registerItem('downloader', [{
            id: 'site-filename',
            type: 'text',
            label: t($filename.$label),
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
