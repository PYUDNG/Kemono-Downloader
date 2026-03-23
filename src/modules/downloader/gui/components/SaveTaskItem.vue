<script setup lang="ts">
import { inject, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { providerInjectionKey } from '../utils';
import BaseTaskItem from './BaseTaskItem.vue';
import { BaseSavefileTask } from '../../types/base/task.js';
import { i18nKeys } from '@/i18n/utils.js';
import { Status } from '../../types/interface/task.js';

const { t } = useI18n();
const $save = i18nKeys.$downloader.$gui.$taskComponent.$save;

// props
const { task, isSubtask = false } = defineProps<{
    /**
     * 文件下载任务实例
     */
    task: BaseSavefileTask;

    /**
     * 当前task是否从属于某父级task
     */
    isSubtask?: boolean;
}>();

// injects
const provider = inject(providerInjectionKey)!;

/**
 * 加载状态  
 * 当前任务是否正在执行某些独占操作且不允许再进行额外操作时，将此置为true
 */
const loading = ref(false);

/**
 * 用户停止下载任务
 * @param task 任务实例，和props传入的task应当相同
 * @param deleteFiles 是否删除已下载的文件
 */
async function abort(task: BaseSavefileTask, deleteFiles: boolean) {
    loading.value = true;
    await task.abort(deleteFiles);
    loading.value = false;
}

/**
 * 用户移除下载任务
 * @param task 任务实例，和props传入的task应当相同
 * @param deleteFiles 是否删除已下载的文件
 */
async function remove(task: BaseSavefileTask, deleteFiles: boolean) {
    loading.value = true;
    await task.abort(deleteFiles);
    provider.removeTask(task.id);
    loading.value = false;
}

/**
 * 用户重新开始下载任务
 * @param task 任务实例，和props传入的task应当相同
 * @param deleteFiles 是否删除已下载的文件
 */
async function restart(task: BaseSavefileTask, deleteFiles: boolean) {
    loading.value = true;
    await task.abort(deleteFiles);
    task.run();
    loading.value = false;
}
</script>

<template>
    <BaseTaskItem
        :task="task"
        :is-subtask="isSubtask"
        :loading="loading"
        @abort="abort"
        @remove="remove"
        @restart="restart"
    >
        <!-- 副标题-进度文本插槽 -->
        <template #progress>
            {{
                // 根据进度状态展示副标题
                ({
                    ongoing: t($save.$caption.$ongoing),
                    complete: t($save.$caption.$complete),
                } as Partial<Record<Status, string>>) [task.progress.status] ?? ''
            }}
        </template>
    </BaseTaskItem>
</template>
