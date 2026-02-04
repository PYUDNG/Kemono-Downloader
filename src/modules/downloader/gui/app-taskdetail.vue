<script setup lang="ts">
import Dialog from '@/components/Dialog.vue';
import { IDownloadProvider, IDownloadTask } from '../types/interface/main.ts';
import { provide, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import TaskItem from './components/TaskItem.vue';
import { providerInjectionKey } from './utils.js';

const { t } = useI18n();

// props
const { provider, tasks } = defineProps<{
    /**
     * 展示的任务所属的provider实例
     */
    provider: IDownloadProvider;

    /**
     * 需要展示的任务列表
     */
    tasks: IDownloadTask[];
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
const internalTasks = ref<IDownloadTask[]>([]);

/**
 * 更新任务列表的方法
 */
function updateTasks(newTasks: IDownloadTask[]) {
    internalTasks.value = [...newTasks];
}

/**
 * 显示对话框并设置任务
 */
function showWithTasks(tasks: IDownloadTask[]) {
    updateTasks(tasks);
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
        v-model="visible"
        :title="t('downloader.gui.title')"
        class="w-[80vw] h-[80vh]"
        :z-index="1000020"
    >
        <!-- Hello -->
        <TaskItem
            v-for="task of internalTasks"
            :key="task.id"
            :task="task"
            is-subtask
        />
    </Dialog>
</template>