import { createI18n } from 'vue-i18n';
import * as zh from './zh/main.js';
import * as en from './en/main.js';
import * as ja from './ja/main.js';
import * as ko from './ko/main.js';
import * as fr from './fr/main.js';
import * as de from './de/main.js';
import * as es from './es/main.js';
import * as ru from './ru/main.js';

const i18n = createI18n({
    legacy: false,
    locale: navigator.language,
    fallbackLocale: 'en',
    messages: {
        'zh': zh['zh-Hant'],
        'zh-CN': zh['zh-Hans'],
        'zh-Hans': zh['zh-Hans'],
        'en': en.en,
        'ja': ja.ja,
        'ja-JP': ja.ja,
        'ko': ko.ko,
        'ko-KR': ko.ko,
        'fr': fr.fr,
        'fr-FR': fr.fr,
        'de': de.de,
        'de-DE': de.de,
        'es': es.es,
        'es-ES': es.es,
        'ru': ru.ru,
        'ru-RU': ru.ru,
    }
});

export default i18n;