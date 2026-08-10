// 外观设置模块：界面语言 / 深色模式 / 主题色

import { computed, watch } from 'vue';
import { globalStorage, makeStorageRef } from '@/storage.js';
import { defineModule } from '@/modules/types.js';
import { registerModule } from '@/modules/settings/main.js';
import i18n, { i18nKeys } from '@/i18n/main.js';
import { dark, themeColor, customColor, THEME_COLORS, resolveLocale, resolveDark } from './state.js';
import TranslateIcon from '~icons/material-symbols/translate';
import ContrastIcon from '~icons/material-symbols/contrast';
import PaletteIcon from '~icons/material-symbols/palette';

const t = i18n.global.t;
const storage = globalStorage.withKeys('appearance');
const $appearance = i18nKeys.$appearance;

// —— 语言：初始locale须在本模块最先加载时生效（modules/main.ts中appearance位于首位）——

const language = makeStorageRef('language', storage, true, false);
const applyLanguage = (value: string) => {
    i18n.global.locale.value = resolveLocale(value, navigator.language) as typeof i18n.global.locale.value;
};
applyLanguage(language.value);
watch(language, applyLanguage);

// —— 深色模式 ——

const darkMode = makeStorageRef('darkMode', storage, true, false);
const media = window.matchMedia?.('(prefers-color-scheme: dark)');
const applyDark = () => {
    dark.value = resolveDark(darkMode.value, !!media?.matches);
};
applyDark();
watch(darkMode, applyDark);
media?.addEventListener?.('change', applyDark);

// —— 主题色 ——

const theme = makeStorageRef('themeColor', storage, true, false);
watch(theme, value => {
    themeColor.value = value;
}, { immediate: true });

// —— 自定义主题色 ——

const custom = makeStorageRef('customColor', storage, true, false);
watch(custom, value => {
    customColor.value = value;
}, { immediate: true });

export default defineModule({
    id: 'appearance',
    name: t($appearance.$settings.$label),
});

// —— 设置注册 ——

registerModule({
    id: 'appearance',
    name: computed(() => t($appearance.$settings.$label)),
    // 位于「站点设置」之后、「关于」之前
    index: 3,
    items: [{
        id: 'language',
        type: 'select',
        label: computed(() => t($appearance.$settings.$language.$label)),
        caption: computed(() => t($appearance.$settings.$language.$caption)),
        icon: TranslateIcon,
        props: {
            optionLabel: 'label',
            optionValue: 'value',
            options: computed(() => (['auto', 'zh-Hans', 'zh-Hant', 'en'] as const).map(val => ({
                label: t($appearance.$settings.$language.$options + '.' + val),
                value: val,
            }))),
        },
        value: language,
        group: 'regular',
    }, {
        id: 'dark-mode',
        type: 'select',
        label: computed(() => t($appearance.$settings.$darkMode.$label)),
        caption: computed(() => t($appearance.$settings.$darkMode.$caption)),
        icon: ContrastIcon,
        props: {
            optionLabel: 'label',
            optionValue: 'value',
            options: computed(() => (['system', 'light', 'dark'] as const).map(val => ({
                label: t($appearance.$settings.$darkMode.$options + '.' + val),
                value: val,
            }))),
        },
        value: darkMode,
        group: 'regular',
    }, {
        id: 'theme-color',
        type: 'select',
        label: computed(() => t($appearance.$settings.$themeColor.$label)),
        caption: computed(() => t($appearance.$settings.$themeColor.$caption)),
        icon: PaletteIcon,
        props: {
            optionLabel: 'label',
            optionValue: 'value',
            options: computed(() => THEME_COLORS.map(({ id }) => ({
                label: t($appearance.$settings.$themeColor.$options + '.' + id),
                value: id,
            }))),
        },
        value: theme,
        group: 'regular',
    }, {
        id: 'custom-color',
        type: 'color',
        label: computed(() => t($appearance.$settings.$customColor.$label)),
        caption: computed(() => t($appearance.$settings.$customColor.$caption)),
        icon: PaletteIcon,
        // 仅当主题色选择“自定义”时展示
        hidden: computed(() => theme.value !== 'custom'),
        value: custom,
        group: 'regular',
    }],
    groups: [{
        id: 'regular',
        name: computed(() => t($appearance.$settings.$group)),
        index: 1,
    }],
});
