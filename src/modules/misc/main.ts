// 辅助功能模块：目前包含「下载守护」（关闭前确认 / 标题标识）
// 未来其他杂项辅助功能可在此模块下新增 SettingGroup

import { computed, watch } from 'vue';
import { globalStorage, makeStorageRef } from '@/storage.js';
import { defineModule } from '@/modules/types.js';
import { registerModule } from '@/modules/settings/main.js';
import i18n, { i18nKeys } from '@/i18n/main.js';
import { downloadState } from '@/modules/downloader/main.js';
import TabCloseIcon from '~icons/material-symbols/tab-close';
import TitleIcon from '~icons/material-symbols/title';

const t = i18n.global.t;
const storage = globalStorage.withKeys('misc');
const $misc = i18nKeys.$misc;

export default defineModule({
    id: 'misc',
    name: t($misc.$settings.$label),
});

// —— 下载守护：设置项 ——

const confirmClose = makeStorageRef('confirmClose', storage, true, false);
const titleIndicator = makeStorageRef('titleIndicator', storage, true, false);

registerModule({
    id: 'misc',
    name: computed(() => t($misc.$settings.$label)),
    // 位于「下载器」之后、「站点设置」之前
    index: 1.5,
    items: [{
        id: 'confirm-close',
        type: 'switch',
        label: computed(() => t($misc.$settings.$confirmClose.$label)),
        caption: computed(() => t($misc.$settings.$confirmClose.$caption)),
        icon: TabCloseIcon,
        value: confirmClose,
        group: 'download-guard',
    }, {
        id: 'title-indicator',
        type: 'switch',
        label: computed(() => t($misc.$settings.$titleIndicator.$label)),
        caption: computed(() => t($misc.$settings.$titleIndicator.$caption)),
        icon: TitleIcon,
        value: titleIndicator,
        group: 'download-guard',
    }],
    groups: [{
        id: 'download-guard',
        name: computed(() => t($misc.$settings.$downloadGuard)),
        index: 1,
    }],
});

// —— 下载守护：关闭前确认 ——

const onBeforeUnload = (e: BeforeUnloadEvent) => {
    if (downloadState.value === 'none') return;
    e.preventDefault();
    e.returnValue = '';
};
watch(confirmClose, enabled => {
    if (enabled) window.addEventListener('beforeunload', onBeforeUnload);
    else window.removeEventListener('beforeunload', onBeforeUnload);
}, { immediate: true });

// —— 下载守护：标题标识 ——

const MARKERS: Record<'downloading' | 'paused', string> = {
    downloading: '[↓] ',
    paused: '[⏸] ',
};
const MARKER_RE = /^\[[↓⏸]\] /;

let titleObserver: MutationObserver | null = null;

/**
 * 应用当前状态的标题标记  
 * 无论站点把标题改成什么，都只替换/保留 Marker 之后的内容，前面始终是当前状态的 Marker
 */
const applyMarker = (state: 'downloading' | 'paused') => {
    const marker = MARKERS[state];
    if (!document.title.startsWith(marker)) {
        document.title = marker + document.title.replace(MARKER_RE, '');
    }
};

/** 清除标题标记（保留站点自己的标题内容） */
const clearMarker = () => {
    document.title = document.title.replace(MARKER_RE, '');
};

/**
 * 根据当前下载状态与设置项，同步标题标记与observer挂载  
 * 下载/暂停期间：前置标记并挂observer（站点自行改标题时重新补上）；
 * 无活动任务（完成/已终止/出错）时：清除标记并断开observer
 */
const syncTitle = () => {
    if (!titleIndicator.value) {
        titleObserver?.disconnect();
        titleObserver = null;
        clearMarker();
        return;
    }
    if (downloadState.value === 'none') {
        clearMarker();
        titleObserver?.disconnect();
    } else {
        applyMarker(downloadState.value);
        // 监听整个 <html>：既能捕获 <title> 文本变化（document.title 赋值同样触发），
        // 也能捕获 <title> 元素被站点整体替换的情况
        titleObserver ??= new MutationObserver(() => {
            if (downloadState.value !== 'none') applyMarker(downloadState.value);
        });
        titleObserver.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
    }
};

watch(titleIndicator, syncTitle, { immediate: true });

// 下载状态变化时切换标记（↓ ↔ ⏸）或清除标记
watch(downloadState, syncTitle);
