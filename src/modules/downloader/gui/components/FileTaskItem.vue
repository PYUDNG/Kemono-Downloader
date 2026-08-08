<script setup lang="ts">
import { inject, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { providerInjectionKey } from '../utils';
import BaseTaskItem from './BaseTaskItem.vue';
import { stringifyBytes } from '@/utils/main.js';
import { i18nKeys } from '@/i18n/utils.js';
import type { Status, TaskLike } from '../../types/model.js';

const { t } = useI18n();
const $common = i18nKeys.$downloader.$gui.$taskComponent.$common;
const $file = i18nKeys.$downloader.$gui.$taskComponent.$file;
const $save = i18nKeys.$downloader.$gui.$taskComponent.$save;

// props
const { task, isSubtask = false } = defineProps<{
    /**
     * 文件任务实例（网络下载或内存保存）
     */
    task: TaskLike & { type: 'file' };

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
        t($common.$unknown);

/**
 * 用户停止下载任务
 * @param task 任务实例，和props传入的task应当相同
 * @param deleteFiles 是否删除已下载的文件
 */
async function abort(task: TaskLike, deleteFiles: boolean) {
    loading.value = true;
    await task.abort(deleteFiles);
    loading.value = false;
}

/**
 * 用户移除下载任务
 * @param task 任务实例，和props传入的task应当相同
 * @param deleteFiles 是否删除已下载的文件
 */
async function remove(task: TaskLike, deleteFiles: boolean) {
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
async function restart(task: TaskLike, deleteFiles: boolean) {
    loading.value = true;
    await task.abort(deleteFiles);
    task.run();
    loading.value = false;
}

/**
 * 用户暂停下载任务
 * @param task 任务实例，和props传入的task应当相同
 * @param deleteFiles 是否删除已下载的文件
 */
async function pause(task: TaskLike) {
    loading.value = true;
    await task.pause();
    loading.value = false;
}

/**
 * 用户取消暂停下载任务
 * @param task 任务实例，和props传入的task应当相同
 * @param deleteFiles 是否删除已下载的文件
 */
async function unpause(task: TaskLike) {
    loading.value = true;
    await task.unpause();
    loading.value = false;
}

/**
 * 用户重试下载任务
 * @param task 任务实例，和props传入的task应当相同
 * @param deleteFiles 是否删除已下载的文件
 */
async function retry(task: TaskLike) {
    loading.value = true;
    await task.retry();
    loading.value = false;
}
</script>

<template>
    <BaseTaskItem
        :task="task"
        :is-subtask="isSubtask"
        :loading="loading"
        :copy="task.target.kind === 'download' ? { label: t($file.$copyLink), value: task.target.url! } : undefined"
        @abort="abort"
        @remove="remove"
        @restart="restart"
        @pause="pause"
        @unpause="unpause"
        @retry="retry"
    >
        <!-- 副标题-进度文本插槽 -->
        <template #progress>
            <!-- 内存资源：瞬时保存，无进度百分比 -->
            <template v-if="task.target.kind === 'save'">
                {{
                    ({
                        ongoing: t($save.$caption.$ongoing),
                        complete: t($save.$caption.$complete),
                    } as Partial<Record<Status, string>>) [task.progress.status] ?? ''
                }}
            </template>
            <!-- 网络资源：下载进度 -->
            <template v-else>
                {{
                    // 根据进度状态展示副标题
                    t($file.$caption, {
                        // 仅当进度数字都大于-1（即为有意义值）、且总量大于零（可以作为除数）时
                        percentage: (task.progress.finished | (task.progress.total - 1)) > 0 ?
                            Math.floor(task.progress.finished / task.progress.total * 100 * 100) / 100 : '0',
                        finished: toProgressString(task.progress.finished, stringifyBytes),
                        total: toProgressString(task.progress.total, stringifyBytes),
                    })
                }}
            </template>
        </template>
    </BaseTaskItem>
</template>
