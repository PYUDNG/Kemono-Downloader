import { createShadowApp } from "@/utils/main";
import { defineModule } from "../types";
import App from './app.vue';
import { SettingItem, SettingModule } from "./types";
import { ref } from "vue";
import { globalStorage, makeStorageRef } from "@/storage.js";
import i18n from '@/i18n/main.js';

const t = i18n.global.t;
const modules = ref<SettingModule[]>([]);

export default defineModule({
    id: 'settings',
    name: '设置',
    checkers: {
        type: 'switch',
        value: true,
    },
    async enter() {
        createShadowApp(App, {
            props: { modules },
            options: {
                app: {
                    classes: 'dark'
                },
            },
        });
    },
});

const storageSystem = globalStorage.withKeys('system');
const storageDownloader = globalStorage.withKeys('downloader');

registerModule({
    id: '__system__',
    name: t('system.settings.label'),
    items: [{
        label: t('system.settings.nickname.label'),
        caption: t('system.settings.nickname.caption'),
        type: 'text',
        icon: 'user-edit',
        value: makeStorageRef('nickname', storageSystem),
    }, {
        label: t('system.settings.autoLogin'),
        type: 'switch',
        icon: 'check-circle',
        value: makeStorageRef('autoLogin', storageSystem),
    }],
});

registerModule({
    id: 'downloader',
    name: t('downloader.settings.label'),
    items: [{
        label: t('downloader.settings.domain.label'),
        caption: t('downloader.settings.domain.caption'),
        type: 'text',
        icon: 'link',
        value: makeStorageRef('domain', storageDownloader),
    }],
});

/**
 * 注册设置模块
 * @param module 设置模块
 */
export function registerModule(module: SettingModule) {
    if (modules.value.some(m => m.id === module.id)) throw TypeError(`duplicate id ${module.id}`);
    modules.value.push(module);
}

/**
 * 注册设置项
 * @param module 设置项
 */
export function registerItem(id: string, item: SettingItem) {
    const module = modules.value.find(m => m.id === id);
    if (!module) throw new TypeError(`cannot find module with id ${id}`);
    module.items.push(item);
}