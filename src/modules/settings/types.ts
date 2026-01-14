import { Ref } from "vue";
import { CompType } from "./components/SettingInput/SettingInput.vue";
export type { CompType };

/**
 * 设置项
 */
export interface SettingItem {
    /**
     * 设置项类型
     */
    type: CompType,

    /**
     * 主要描述文本
     */
    label: string;

    /**
     * 次要描述文本
     */
    caption?: string;

    /**
     * 图标
     */
    icon?: string;

    /**
     * 响应式设置项值  
     * 设置项提供者（调用方）应：
     * - [注册设置时] 读取存储以提供初始值
     * - [当存储变化时] 监听存储变化并更新此值
     * - [当用于与设置UI交互并修改此设置时] 监听此值变化、验证是否合法并更新到存储（或不合法时回退到旧值）
     */
    value: Ref<any>;
};

/**
 * 模块的设置
 */
export interface SettingModule {
    /**
     * 模块全局唯一ID
     */
    id: string,
    
    /**
     * 模块名 / 描述文本
     */
    name: string,

    /**
     * 模块的设置项
     */
    items: SettingItem[],
}