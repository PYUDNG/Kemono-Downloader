import { createShadowApp, PromiseOrRaw, SingleOrArray } from "@/utils/main";
import { defineModule } from "../types";
import App from './app.vue';
import { SettingGroup, SettingItem, SettingModule } from "./types";
import { computed, reactive, ref, watch } from "vue";
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
 * 注册一个或多个设置项到已有模块
 * @param id 模块id
 * @param items 新设置项
 */
export function registerItem(id: string, items: SingleOrArray<SettingItem>) {
    const module = modules.value.find(m => m.id === id);
    if (!module) throw new TypeError(`cannot find module with id ${id}`);
    
    items = Array.isArray(items) ? items : [items];
    const reactiveItems = items.map(item => reactive(item));
    module.items.push(...reactiveItems);
}

/**
 * 注册一个新设置组到已有模块
 * @param id 模块id
 * @param group 新设置组
 */
export function registerGroup(id: string, group: SettingGroup) {
    const module = modules.value.find(m => m.id === id);
    if (!module) throw new TypeError(`cannot find module with id ${id}`);
    
    Array.isArray(module.groups) ?
        module.groups.push(group) :
        module.groups = [group];
}

/**
 * 辅助函数，监听特定设置模块注册后回调  
 * 如果不提供回调函数，则返回一个当指定设置模块注册后resolve的Promise
 * @param id 监听目标模块的id
 * @param callback 回调函数，不提供时切换到Promise模式
 */
export function onModuleRegistered(id: string): Promise<void> 
export function onModuleRegistered(id: string, callback: Function): void;
export function onModuleRegistered(id: string, callback?: Function): PromiseOrRaw<void> {
    const { promise, resolve } = Promise.withResolvers<void>();
    const handle = watch(modules, modules => {
        if (modules.some(m => m.id === id)) {
            try {
                (callback ?? resolve)();
            } finally {
                handle.stop();
            }
        }
    }, { deep: true, immediate: true });
    return callback ? undefined : promise;
}