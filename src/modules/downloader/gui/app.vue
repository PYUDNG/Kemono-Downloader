<script setup lang="ts">
import Dialog from '@/components/Dialog.vue';
import { DownloadProvider } from '../types';
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

// props
const { provider } = defineProps<{
    provider: DownloadProvider
}>();

const visible = ref(false);

export function show() {
    visible.value = true;
}

export function hide() {
    visible.value = false;
}
</script>

<template>
    <Dialog v-model="visible" :title="t('downloader.gui.title')">
        <TabLayout>
        </TabLayout>
    </Dialog>
</template>