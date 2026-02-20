import { createI18n } from 'vue-i18n';
import * as zh from './zh/main.js';
import * as en from './en/main.js';

const i18n = createI18n({
    legacy: false,
    locale: navigator.language,
    fallbackLocale: 'en',
    messages: {
        'zh': zh['zh-Hant'],
        'zh-CN': zh['zh-Hans'],
        'zh-Hans': zh['zh-Hans'],
        'en': en.en,
    }
});

export default i18n;