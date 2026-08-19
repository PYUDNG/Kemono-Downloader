import { ref } from 'vue';

/**
 * 深色模式当前是否生效（由appearance模块根据设置与系统偏好维护）  
 * 供`createShadowApp`等消费方同步`dark`类
 */
export const dark = ref(true);

/**
 * 当前主题色预设id（由appearance模块根据设置维护）  
 * `'custom'`表示使用自定义颜色（见`customColor`）
 */
export const themeColor = ref('default');

/**
 * 自定义主题色（hex），由appearance模块根据设置维护  
 * 当`themeColor`为`'custom'`时，由`buildCustomPalette`生成调色板
 */
export const customColor = ref('#ea712f');

/**
 * 主题色调色板（对应CSS变量`--p-primary-50..950`）  
 * 注：以inline style写入host元素——Chrome中shadow样式表的`:host`声明无法被类选择器覆盖，只能靠行内样式
 */
export interface ThemePalette {
    50: string;
    100: string;
    200: string;
    300: string;
    400: string;
    500: string;
    600: string;
    700: string;
    800: string;
    900: string;
    950: string;
}

const ORANGE_PALETTE: ThemePalette = {
    50: '#fff7ed', 100: '#ffedd5', 200: '#fed7aa', 300: '#fdba74', 400: '#fb923c',
    500: '#ea712f', 600: '#d9480f', 700: '#b43409', 800: '#912408', 900: '#7c2108', 950: '#431404',
};

const BLUE_PALETTE: ThemePalette = {
    50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe', 300: '#93c5fd', 400: '#60a5fa',
    500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8', 800: '#1e40af', 900: '#1e3a8a', 950: '#172554',
};

const GREEN_PALETTE: ThemePalette = {
    50: '#ecfdf5', 100: '#d1fae5', 200: '#a7f3d0', 300: '#6ee7b7', 400: '#34d399',
    500: '#10b981', 600: '#059669', 700: '#047857', 800: '#065f46', 900: '#064e3b', 950: '#022c22',
};

const PURPLE_PALETTE: ThemePalette = {
    50: '#f5f3ff', 100: '#ede9fe', 200: '#ddd6fe', 300: '#c4b5fd', 400: '#a78bfa',
    500: '#8b5cf6', 600: '#7c3aed', 700: '#6d28d9', 800: '#5b21b6', 900: '#4c1d95', 950: '#2e1065',
};

// Pawchive粉（#cc9d97）：按与自定义色相同的白/黑混合比例生成的梯度
const PAWCHIVE_PALETTE: ThemePalette = {
    50: '#f7f0ef', 100: '#f0e2e0', 200: '#e6cecb', 300: '#debfbb', 400: '#d6b1ac',
    500: '#cc9d97', 600: '#ad8580', 700: '#8f6e6a', 800: '#705653', 900: '#523f3c', 950: '#332726',
};

export const DEFAULT_PALETTE: ThemePalette = ORANGE_PALETTE;

/**
 * 主题色预设列表（`custom`走自定义颜色）  
 * 顺序即设置项中的展示顺序：Pawchive/Kemono品牌色在前，通用色居中，自定义最后
 */
export const THEME_COLORS = [
    { id: 'pawchive', palette: PAWCHIVE_PALETTE },
    { id: 'default', palette: ORANGE_PALETTE },
    { id: 'blue', palette: BLUE_PALETTE },
    { id: 'green', palette: GREEN_PALETTE },
    { id: 'purple', palette: PURPLE_PALETTE },
    { id: 'custom', palette: null as ThemePalette | null },
] as const;

/**
 * 解析hex颜色并混合白色/黑色，生成50..950调色板（与`.theme-custom`的color-mix梯度一致）
 * @param hex 基础色（`#rrggbb`）
 */
export function buildCustomPalette(hex: string): ThemePalette {
    const base = parseHex(hex);
    return {
        500: hex,
        400: mix(base, 1, 0.2),
        300: mix(base, 1, 0.35),
        200: mix(base, 1, 0.5),
        100: mix(base, 1, 0.7),
        50: mix(base, 1, 0.85),
        600: mix(base, 0, 0.15),
        700: mix(base, 0, 0.3),
        800: mix(base, 0, 0.45),
        900: mix(base, 0, 0.6),
        950: mix(base, 0, 0.75),
    };
}

/**
 * 解析`#rrggbb`为[r,g,b]
 */
function parseHex(hex: string): [number, number, number] {
    const value = hex.replace('#', '');
    const full = value.length === 3 ?
        value.split('').map(c => c + c).join('') :
        value;
    return [
        parseInt(full.slice(0, 2), 16),
        parseInt(full.slice(2, 4), 16),
        parseInt(full.slice(4, 6), 16),
    ];
}

/**
 * 与白色(white=1)或黑色(white=0)按比例混合
 */
function mix(base: [number, number, number], white: 0 | 1, ratio: number): string {
    const channel = (i: number) => {
        const target = white === 1 ? 255 : 0;
        return Math.round(base[i] + (target - base[i]) * ratio)
            .toString(16).padStart(2, '0');
    };
    return `#${ channel(0) }${ channel(1) }${ channel(2) }`;
}

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
