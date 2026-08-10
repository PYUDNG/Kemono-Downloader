import { ref } from 'vue';

/**
 * 深色模式当前是否生效（由appearance模块根据设置与系统偏好维护）  
 * 供`createShadowApp`等消费方同步`dark`类
 */
export const dark = ref(true);

/**
 * 当前主题色预设id（由appearance模块根据设置维护）  
 * 供`createShadowApp`等消费方同步`theme-{id}`类
 */
export const themeColor = ref('default');

/**
 * 主题色预设列表（对应style.css中的`.theme-{id}`调色板类）
 */
export const THEME_COLORS = [
    { id: 'default' },
    { id: 'blue' },
    { id: 'green' },
    { id: 'purple' },
] as const;

/**
 * 解析界面locale  
 * `language`为`'auto'`时使用浏览器语言（vue-i18n会按子标签自动收窄，如`'zh-TW'`→`'zh'`）
 * @param language 用户设置的语言
 * @param navigatorLanguage 浏览器语言（如`navigator.language`）
 */
export function resolveLocale(language: string, navigatorLanguage: string): string {
    return language === 'auto' ? navigatorLanguage : language;
}
