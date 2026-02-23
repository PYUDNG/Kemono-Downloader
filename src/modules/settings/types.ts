import { Component, Ref } from "vue";
import { CompType } from "./components/SettingInput/SettingInput.vue";
export type { CompType };

/**
 * 设置项
 */
export interface SettingItem {
    /**
     * 模块内唯一设置项ID
     */
    id: string,

    /**
     * 设置项类型
     */
    type: CompType,

    /**
     * 主要描述文本  
     * 占据主要文本区域展示
     */
    label: string;

    /**
     * 次要描述文本  
     * 占据次要文本区域展示
     */
    caption?: string;

    /**
     * 补充描述文本  
     * 默认不展示，用户交互时在额外UI区域展示
     * 接受html代码和自定义Vue组件两种数据
     */
    help?: string | Component;

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

    /**
     * 作为设置项提供时，需要向设置项编辑组件额外传递的props
     */
    props?: Record<string, any>;

    /**
     * 响应式设置项禁用状态  
     * 可以为布尔值表示是否禁用，禁用时也可以为一个表达被禁用原因的字符串（将在设置项UI旁边展示给用户）
     * 设置模块提供了一个`settings`计算属性变量用于获取和监听所有设置项值及其变化  
     * 可以依赖settings创建计算属性值作为disabled属性，以实现根据其他设置判断是否禁用当前设置  
     * 也可以通过监听settings变化实现自定义禁用逻辑
     */
    disabled?: Ref<boolean | string>;

    /**
     * 响应式设置项隐藏状态  
     * 设置模块提供了一个`settings`计算属性变量用于获取和监听所有设置项值及其变化  
     * 可以依赖settings创建计算属性值作为hidden属性，以实现根据其他设置判断是否隐藏当前设置  
     * 也可以通过监听settings变化实现自定义隐藏逻辑
     */
    hidden?: Ref<boolean>;

    /**
     * 该设置是否需要刷新页面才能生效  
     * 如果为true，将会给用户在UI上一个提示
     * @default false
     */
    reload?: boolean;
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