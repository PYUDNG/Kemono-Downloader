<script setup lang="ts">
import { inject, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { providerInjectionKey } from '../utils.js';
import BaseTaskItem from './BaseTaskItem.vue';
import AppTaskDetail from '../app-taskdetail.vue';
import { createShadowApp } from '@/utils/main.js';
import { BasePostDownloadTask } from '../../types/base/post.js';

const { t } = useI18n();
const tsCommonPrefix = 'downloader.gui.task-component.common.';
const tsPostPrefix = 'downloader.gui.task-component.post.';

// props
const { task, isSubtask = false } = defineProps<{
    /**
     * Post下载任务实例
     */
    task: BasePostDownloadTask;

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
 */
const toProgressString = (num: number) => num > -1 ? num.toString() : t(tsCommonPrefix + 'unknown');

/**
 * 用户停止下载任务
 * @param task 任务实例，和props传入的task应当相同
 */
async function abort(task: BasePostDownloadTask) {
    loading.value = true;
    await task.abort();
    loading.value = false;
}

/**
 * 用户移除下载任务
 * @param task 任务实例，和props传入的task应当相同
 */
async function remove(task: BasePostDownloadTask) {
    loading.value = true;
    await task.abort();
    provider.removeTask(task.id);
    loading.value = false;
}

/**
 * 用户重新开始下载任务
 * @param task 任务实例，和props传入的task应当相同
 */
async function restart(task: BasePostDownloadTask) {
    loading.value = true;
    await task.abort();
    task.run();
    loading.value = false;
}

/**
 * 用户查看任务详情
 * @param _e 点击事件
 * @param task 任务实例，和props传入的task应当相同
 */
function detail(_e: PointerEvent, task: BasePostDownloadTask) {
    // 创建并展示子任务窗口
    const { host, app, root } = createShadowApp(AppTaskDetail, {
        props: { provider, tasks: [], name: task.name },
        options: {
            app: {
                classes: 'dark'
            }
        }
    });
    root.showWithTasks(task.subTasks, task.name);

    // 当子任务窗口隐藏（被关闭）时销毁它
    watch(() => root.visible, (newVal, oldVal) => {
        if (!newVal && oldVal) {
            app.unmount();
            host.remove();
        }
    });
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
        @click="detail"
    >
        <!-- 标题插槽：当post api尚未加载完成时，先展示占位文本 -->
        <template #title>
            {{ task.name ?? t(tsCommonPrefix + 'title-nodata') }}
        </template>

        <!-- 副标题-进度文本插槽 -->
        <template #progress>
            {{ t(tsPostPrefix + 'caption', {
                total: toProgressString(task.progress.total),
                finished: toProgressString(task.progress.finished),
            }) }}
        </template>
    </BaseTaskItem>
</template>
