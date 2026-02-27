<script setup lang="ts">
import { inject, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { providerInjectionKey } from '../utils';
import BaseTaskItem from './BaseTaskItem.vue';
import { stringifyBytes } from '@/utils/main.js';
import { BaseFileDownloadTask } from '../../types/base/task.js';

const { t } = useI18n();
const tsCommonPrefix = 'downloader.gui.task-component.common.';
const tsFilePrefix = 'downloader.gui.task-component.file.';

// props
const { task, isSubtask = false } = defineProps<{
    /**
     * 文件下载任务实例
     */
    task: BaseFileDownloadTask;

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
 * 适配Progress类型的数值转字符串：当数值为-1时，展示“未知”；其余数值展示原值的字符串表示
 * @param num 进度数值
 * @param formatter 数值不为-1时，将数值转化为字符串的方法；不提供时，调用该数值的.toString方法
 */
const toProgressString = (num: number, formatter?: (num: number) => string) =>
    num > -1 ?
        formatter ? formatter(num) : num.toString() :
        t(tsCommonPrefix + 'unknown');

/**
 * 用户停止下载任务
 * @param task 任务实例，和props传入的task应当相同
 * @param deleteFiles 是否删除已下载的文件
 */
async function abort(task: BaseFileDownloadTask, deleteFiles: boolean) {
    loading.value = true;
    await task.abort(deleteFiles);
    loading.value = false;
}

/**
 * 用户移除下载任务
 * @param task 任务实例，和props传入的task应当相同
 * @param deleteFiles 是否删除已下载的文件
 */
async function remove(task: BaseFileDownloadTask, deleteFiles: boolean) {
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
async function restart(task: BaseFileDownloadTask, deleteFiles: boolean) {
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
                t(tsFilePrefix + 'caption', {
                    // 仅当进度数字都大于-1（即为有意义值）、且总量大于零（可以作为除数）时
                    percentage: (task.progress.finished | (task.progress.total - 1)) > 0 ?
                        Math.floor(task.progress.finished / task.progress.total * 100 * 100) / 100 : '0',
                    finished: toProgressString(task.progress.finished, stringifyBytes),
                    total: toProgressString(task.progress.total, stringifyBytes),
                })
            }}
        </template>
    </BaseTaskItem>
</template>
