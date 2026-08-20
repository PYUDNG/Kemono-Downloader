// 脚本菜单命令工具：注册后标题随界面语言切换实时更新

import { watch } from 'vue';
import i18n from '@/i18n/main.js';
import { GM_registerMenuCommand, GM_unregisterMenuCommand } from '$';

/**
 * 注册脚本菜单命令，标题随界面语言切换实时更新
 * 两个管理器均无直接修改标题的API，采用“注销旧命令 → 以新标题重新注册”的方式（菜单项会移到菜单末尾，可接受）
 * @param id 稳定命令ID（注册/注销都基于它，保证始终是同一命令）
 * @param translate 返回当前语言下标题文本的函数（内部读取i18n locale，具备响应式）
 * @param onClick 命令点击回调
 */
export function registerLocalizedMenuCommand(
    id: string,
    translate: () => string,
    onClick: (event: MouseEvent | KeyboardEvent) => void,
): void {
    /** 最近一次注册返回的命令ID（TM返回数字ID；VM返回id字符串） */
    let menuId: string | number = '';

    const register = () => {
        // 先注销旧命令再重新注册；新标题 = 当前语言
        menuId && GM_unregisterMenuCommand(menuId);
        menuId = GM_registerMenuCommand(translate(), onClick, { id });
    };

    register();
    // 语言切换（i18n.global.locale变化）时更新标题
    watch(() => i18n.global.locale?.value, register);
}
