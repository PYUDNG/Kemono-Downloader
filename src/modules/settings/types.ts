import { Component, Ref } from "vue";
import { CompType } from "./components/SettingInput/SettingInput.vue";
export type { CompType };

export interface DisabledGUI {
    /**
     * 作为额外副标题向用户展示的、有关设置项被禁用的原因
     */
    text: string;

    /**
     * 该副标题元素v-bind绑定属性
     */
    props?: Record<string, any>;

    /**
     * 当被禁用时设置项应展示的占位值  
     * 此内容仅在被禁用项的UI展示，不会影响存储中的值
     */
    value?: any;
}

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
     * - [当用于与设置UI交互并修改此设置时] 监听此值变化、验证是否合法并更新到存储（或其他副作用）（或不合法时回退到旧值）
     */
    value: Ref<any>;

    /**
     * 作为设置项提供时，需要向设置项编辑组件额外传递的props
     */
    props?: Record<string, any>;

    /**
     * 响应式设置项禁用状态  
     * 可以为布尔值表示是否禁用，禁用时也可以为一个表达被禁用原因的额外显示的设置副标题对象
     * 设置模块提供了一个`settings`计算属性变量用于获取和监听所有设置项值及其变化  
     * 可以依赖settings创建计算属性值作为disabled属性，以实现根据其他设置判断是否禁用当前设置  
     * 也可以通过监听settings变化实现自定义禁用逻辑
     */
    disabled?: Ref<boolean | DisabledGUI>;

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

    /**
     * 设置项所属组id  
     * 如果提供，所有具有相同组id的设置项将在UI中被合并显示在同一区域  
     * 如果部分设置项提供了组id、另一些没有提供，没有提供组名的将被显示在设置项列表最上方，且不以分组UI包含显示
     */
    group?: string;
};

export interface SettingGroup {
    /**
     * 全局唯一组ID
     */
    id: string;
    
    /**
     * 组名，显示在UI中
     */
    name: string;

    /**
     * 设置项组的排序位置，数值越小越靠前  
     * 此值应该是一个整数，且建议大于0
     */
    index: number;
};

/**
 * 模块的设置
 */
export interface SettingModule {
    /**
     * 模块全局唯一ID
     */
    id: string;
    
    /**
     * 模块名 / 描述文本
     */
    name: string;

    /**
     * 模块的设置项
     */
    items: SettingItem[];

    /**
     * 分组配置  
     * - 必须包含所有设置项所使用的组
     * - 如果某组没有设置项将在UI中创建空组
     * - 没有设置项使用分组功能时可以省略
     */
    groups?: SettingGroup[];
}