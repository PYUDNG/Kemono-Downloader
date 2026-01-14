import { Checker, SingleOrArray } from "@/utils/main";

/**
 * 代表一个页面上的一个功能，通过匹配页面并执行声明周期钩子方法在页面上执行功能
 */
export interface Module<C = undefined> {
    /**
     * 全局唯一ID，此ID应与定义该Module的ES模块的具名导出名一致
     */
    id: string,

    /**
     * 模块的用户可见名称
     */
    name: string,

    /**
     * 多个checker之间的关系：
     * - 'or': 任一checker满足即可匹配此页面
     * - 'and': 所有checker均满足才能匹配此页面
     * @default 'and'
     */
    mode?: 'and' | 'or',

    /**
     * 在进行checker判断前需要达到的document.readyState加载阶段  
     * 注：虽然会尽可能早地进行判断，但无法保证在刚刚达到注明的阶段时就进行判断并执行相关回调；但一定会保证执行判断及回调前至少达到这个阶段
     */
    readyState?: DocumentReadyState,

    /**
     * 页面匹配规则
     */
    checkers: SingleOrArray<Checker>,

    /**
     * [生命周期钩子] 进入页面
     */
    enter?: Function,

    /**
     * [生命周期钩子] 离开页面
     */
    leave?: Function,

    /**
     * [生命周期钩子] 进入或离开页面  
     * 执行顺序在enter和leave之后
     */
    toggle?: Function,

    /**
     * [生命周期钩子] 保持全程不在此页面上的同时，从一个不是此页面的页面，切换到另一个不是此页面的其它页面
     */
    background?: Function,

    /**
     * 生命周期钩子之间的共享变量空间
     */
    context?: C,
}

export function defineModule<C>(module: Module<C>): Module<C> {
    return module;
}