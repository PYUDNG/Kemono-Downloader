/**
 * 模块在URL变化后应执行的生命周期动作
 * - `'enter'`：未激活 → 激活，加载页面功能
 * - `'leave'`：激活 → 未激活，卸载页面功能
 * - `'remount'`：保持激活但URL已变（同类型页面跳转），先卸后挂，重新注入页面级UI
 */
export type ModuleAction = 'enter' | 'leave' | 'remount';

/**
 * 判定模块在URL变化后的生命周期动作（纯函数，loader决策核心）
 * @param prevActive 变更前是否激活
 * @param currActive 变更后是否激活
 * @param urlChanged URL是否发生变化
 * @param remountOnUrlChange 模块是否声明了"同类型跳转时重新挂载"
 */
export function decideModuleActions(
    prevActive: boolean,
    currActive: boolean,
    urlChanged: boolean,
    remountOnUrlChange: boolean,
): ModuleAction[] {
    // 未激活 → 激活：进入
    if (!prevActive && currActive) return ['enter'];
    // 激活 → 未激活：离开
    if (prevActive && !currActive) return ['leave'];
    // 保持激活且URL已变：页面级模块重新挂载（先卸后挂）
    if (prevActive && currActive && remountOnUrlChange && urlChanged) return ['remount'];
    // 其余情况（保持激活、URL未变等）：无动作
    return [];
}
