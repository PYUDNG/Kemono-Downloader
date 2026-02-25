<script setup lang="ts">
import Dialog from '@/volt/Dialog.vue';
import { provide, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import TaskItem from './components/TaskItem.vue';
import { providerInjectionKey } from './utils.js';
import { Nullable } from '@/utils/main.ts';
import { BaseDownloadTask } from '../types/base/task.ts';
import { BaseDownloadProvider } from '../types/base/provider.ts';

const { t } = useI18n();

// props
const { provider, tasks } = defineProps<{
    /**
     * 展示的任务所属的provider实例
     */
    provider: BaseDownloadProvider;

    /**
     * 需要展示的任务列表
     */
    tasks: BaseDownloadTask[];

    /**
     * 父级任务名称
     */
    name: Nullable<string>;
}>();

// provides
provide(providerInjectionKey, provider);

/**
 * 窗口可见性
 */
const visible = ref(false);

/**
 * 内部管理的任务列表（响应式）
 */
const internalTasks = ref<BaseDownloadTask[]>([]);

/**
 * 内部管理的父级任务名称（响应式
 */
const internalName = ref<Nullable<string>>(null);

/**
 * 更新任务列表的方法
 */
function updateTasks(newTasks: BaseDownloadTask[]) {
    internalTasks.value = [...newTasks];
}

/**
 * 显示对话框并设置任务
 */
function showWithTasks(tasks: BaseDownloadTask[], name: Nullable<string>) {
    updateTasks(tasks);
    internalName.value = name;
    visible.value = true;
}

watch(() => tasks, val => updateTasks(val), { immediate: true, deep: true });

// expose
defineExpose({
    visible,
    tasks: internalTasks,
    updateTasks,
    showWithTasks
});
</script>

<template>
    <Dialog
        v-model:visible="visible"
        :header="internalName ? t('downloader.gui.title-detail', { name: internalName }) : t('downloader.gui.title-detail-noname')"
        class="w-[80vw] h-[80vh]"
        append-to="self"
        dismissable-mask
        modal
    >
        <TaskItem
            v-for="task of internalTasks"
            :key="task.id"
            :task="task"
            is-subtask
        />
    </Dialog>
</template>