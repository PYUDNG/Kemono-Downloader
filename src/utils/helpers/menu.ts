// 脚本菜单命令工具：注册后标题随界面语言切换实时更新

import { watch } from 'vue';
import i18n from '@/i18n/main.js';
import { GM_registerMenuCommand, GM_unregisterMenuCommand } from '$';

/**
 * 已注册的菜单命令条目
 */
interface MenuEntry {
    /**
     * 稳定命令ID（注册/注销都基于它，保证始终是同一命令）
     */
    id: string;
    /**
     * 返回当前语言下标题文本的函数（内部读取i18n locale，具备响应式）
     */
    translate: () => string;
    /**
     * 命令点击回调
     */
    onClick: (event: MouseEvent | KeyboardEvent) => void;
    /**
     * 最近一次注册返回的命令ID（TM返回数字ID；VM返回id字符串）
     */
    menuId: string | number;
}

/**
 * 全部已注册命令的登记表（按注册顺序）  
 * 语言切换时整体注销后按同一顺序重新注册，保持脚本菜单项顺序不变
 */
const registry: MenuEntry[] = [];

/**
 * 注册脚本菜单命令，标题随界面语言切换实时更新
 * 两个管理器均无可靠修改标题的API（同id重复注册仅TM新版为原地更新，不可依赖），
 * 采用“注销旧命令 → 以新标题重新注册”的方式；
 * 更新时对登记表中所有命令按注册顺序整体注销再整体重注册，避免菜单项顺序被打乱
 * @param id 稳定命令ID
 * @param translate 返回当前语言下标题文本的函数
 * @param onClick 命令点击回调
 */
export function registerLocalizedMenuCommand(
    id: string,
    translate: () => string,
    onClick: (event: MouseEvent | KeyboardEvent) => void,
): void {
    const entry: MenuEntry = { id, translate, onClick, menuId: '' };
    // 按调用顺序入表并立即注册（菜单项顺序 = 注册顺序）
    registry.push(entry);
    entry.menuId = GM_registerMenuCommand(translate(), onClick, { id });
}

// 语言切换（i18n.global.locale变化）时更新全部菜单命令标题
watch(() => i18n.global.locale?.value, () => {
    // 1. 按登记顺序全部注销
    for (const entry of registry) {
        entry.menuId && GM_unregisterMenuCommand(entry.menuId);
    }
    // 2. 按登记顺序全部重新注册（新标题 = 当前语言）
    for (const entry of registry) {
        entry.menuId = GM_registerMenuCommand(entry.translate(), entry.onClick, { id: entry.id });
    }
});
