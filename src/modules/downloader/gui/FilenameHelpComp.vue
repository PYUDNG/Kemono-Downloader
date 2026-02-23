<script setup lang="ts">
import { GM_info, GM_setClipboard } from '$';
import Button from '@/volt/Button.vue';
import { useToast } from 'primevue/usetoast';
import { useI18n } from 'vue-i18n';
import Toast from '@/volt/Toast.vue';

const { t } = useI18n();
const toast = useToast();
const tPrefix = 'downloader.settings.filename.';

const markups = [
    "PostID", "CreatorID", "Service", "P", "Name",
    "Base", "Ext", "Title", "Creator", "Year",
    "Month", "Date", "Hour", "Minute", "Second",
    "Timestamp", "Timetext"
];

/**
 * 将传入的模板字符串用大括号包裹后，复制到剪贴板
 * @param markup 无大括号的模板字符串
 */
function copy(markup: string) {
    const fullMarkup = '{' + markup + '}';
    const callback = () => {
        toast.add({
            summary: t(tPrefix + 'toast.copied'),
            detail: fullMarkup,
            severity: 'info',
            life: 3000,
        });
    };
    if (GM_info.scriptHandler === 'Tampermonkey') {
        GM_setClipboard(fullMarkup, 'text', callback);
    } else {
        GM_setClipboard(fullMarkup, 'text');
        callback();
    }
}
</script>

<template>
    <!-- Header -->
    <div class="font-bold py-2">{{ t(tPrefix + 'help.header') }}</div>

    <!-- 模板 -->
    <div class="grid grid-cols-[min-content_1fr] my-2 border-3 border-solid border-surface-200 dark:border-surface-800">
        <div class="font-bold flex flex-row items-center justify-center py-2 border-r-3 border-b-3 border-solid border-surface-200 dark:border-surface-800">{{ t(tPrefix + 'help.markup') }}</div>
        <div class="font-bold flex flex-row items-center justify-start py-2 px-3 border-b-3 border-solid border-surface-200 dark:border-surface-800">{{ t(tPrefix + 'help.desc') }}</div>
        <template v-for="markup of markups">
            <div class="border-r-3 border-b-1 border-solid border-surface-200 dark:border-surface-800">
                <Button
                    variant="text"
                    :label="'{' + markup + '}'"
                    @click="copy(markup)"
                    pt:root:class="w-full"
                />
            </div>
            <span class="px-3 flex flex-row items-center border-b-1 border-solid border-surface-200 dark:border-surface-800" v-html="t(tPrefix + 'help.templates.' + markup)"></span>
        </template>
    </div>

    <!-- Footer -->
    <div class="font-bold py-2">{{ t(tPrefix + 'help.footer') }}</div>

    <!-- Toast -->
    <Toast />
</template>