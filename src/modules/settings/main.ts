import { createShadowApp } from "@/utils/main";
import { defineModule } from "../types";
import App from './app.vue';
import { SettingItem, SettingModule } from "./types";
import { computed, reactive, ref } from "vue";
import { GM_registerMenuCommand } from "$";
import i18n from "@/i18n/main";

const t = i18n.global.t;

/**
 * 全部设置模块
 */
export const modules = ref<SettingModule[]>([]);

/**
 * 全部设置模块的值
 */
export const settings = computed(() => modules.value.reduce(
    (settings, module) => {
        const moduleSettings = module.items.reduce(
            (moduleSettings, item) => {
                moduleSettings[item.id] = item.value
                return moduleSettings;
            },
            {} as Record<string, any>
        );
        settings[module.id] = moduleSettings;
        return settings;
    },
    {} as Record<string, any>
));

export default defineModule({
    id: 'settings',
    name: '设置',
    checkers: {
        type: 'switch',
        value: true,
    },
    async enter() {
        const { root } = createShadowApp(App, {
            props: { modules },
            options: {
                app: {
                    classes: 'dark'
                },
            },
        });

        GM_registerMenuCommand(t('settings.menu.label'), () => root.visible = true);
    },
});

/**
 * 注册设置模块
 * @param module 设置模块
 */
export function registerModule(module: SettingModule) {
    if (modules.value.some(m => m.id === module.id)) throw TypeError(`duplicate id ${module.id}`);
    modules.value.push(reactive(module));
}

/**
 * 注册设置项
 * @param module 设置项
 */
export function registerItem(id: string, item: SettingItem) {
    const module = modules.value.find(m => m.id === id);
    if (!module) throw new TypeError(`cannot find module with id ${id}`);
    module.items.push(reactive(item));
}

