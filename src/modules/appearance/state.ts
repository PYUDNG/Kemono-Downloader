import { ref } from 'vue';

/**
 * 深色模式当前是否生效（由appearance模块根据设置与系统偏好维护）  
 * 供`createShadowApp`等消费方同步`dark`类
 */
export const dark = ref(true);

/**
 * 当前主题色预设id（由appearance模块根据设置维护）  
 * `'custom'`表示使用自定义颜色（见`customColor`）  
 * 供`createShadowApp`等消费方同步`theme-{id}`类
 */
export const themeColor = ref('default');

/**
 * 自定义主题色（hex），由appearance模块根据设置维护  
 * 当`themeColor`为`'custom'`时，通过`--appearance-color`变量驱动`.theme-custom`调色板
 */
export const customColor = ref('#ea712f');

/**
 * 主题色预设列表（对应style.css中的`.theme-{id}`调色板类；`custom`走自定义色）
 */
export const THEME_COLORS = [
    { id: 'default' },
    { id: 'blue' },
    { id: 'green' },
    { id: 'purple' },
    { id: 'custom' },
] as const;

/**
 * 解析深色模式是否生效  
 * `darkMode`为`'system'`时跟随系统偏好
 * @param darkMode 用户设置的深色模式
 * @param systemDark 系统当前是否为深色
 */
export function resolveDark(darkMode: string, systemDark: boolean): boolean {
    return darkMode === 'dark' || (darkMode === 'system' && systemDark);
}

/**
 * 解析界面locale  
 * `language`为`'auto'`时使用浏览器语言（vue-i18n会按子标签自动收窄，如`'zh-TW'`→`'zh'`）
 * @param language 用户设置的语言
 * @param navigatorLanguage 浏览器语言（如`navigator.language`）
 */
export function resolveLocale(language: string, navigatorLanguage: string): string {
    return language === 'auto' ? navigatorLanguage : language;
}
