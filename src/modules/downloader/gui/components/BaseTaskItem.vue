<script setup lang="ts" generic="T extends IDownloadTask = IDownloadTask">
import ProgressBar from '@/volt/ProgressBar.vue';
import type { IDownloadTask, Status } from '../../types/interface/main.js';
import { useI18n } from 'vue-i18n';
import { computed, ref } from 'vue';
import Button from '@/volt/Button.vue';
import ConfirmDialog from '@/volt/ConfirmDialog.vue';
import { useConfirm } from 'primevue/useconfirm';
import { globalStorage } from '@/storage';
import { v4 as uuid } from 'uuid';

const { t } = useI18n();
const storage = globalStorage.withKeys('downloader');
const tsCommonPrefix = 'downloader.gui.task-component.common.';

// props
const { task, isSubtask = false, loading = false } = defineProps<{
    /**
     * 下载任务实例
     */
    task: T;

    /**
     * 当前task是否从属于某父级task
     * @default false
     */
    isSubtask?: boolean;

    /**
     * 加载状态下，不允许点击操作按钮
     * @default false
     */
    loading?: boolean;
}>();

// emits
const emit = defineEmits<{
    restart: [task: T];
    abort: [task: T];
    remove: [task: T];
    click: [event: PointerEvent, task: T];
}>();

// 插槽定义
defineSlots<{
    /**
     * 标题插槽
     */
    title?: (props: { task: any }) => any;

    /**
     * 副标题-状态文本插槽
     * @param props 
     */
    status?: (props: { task: any }) => any;

    /**
     * 副标题-进度文本插槽
     * @param props 
     */
    progress?: (props: { task: any }) => any;
    
    /**
     * 副标题文字插槽  
     * 使用此插槽则会覆盖status和progress插槽
     */
    caption?: (props: { task: any }) => any;
    
    /**
     * 额外操作按钮插槽
     */
    extraActions?: (props: { task: any }) => any;
    
    /**
     * 点击事件插槽（用于自定义点击行为）
     */
    default?: (props: { task: any }) => any;
}>();

/**
 * 适配Progress类型的数值转字符串：当数值为-1时，展示“未知”；其余数值展示原值的字符串表示
 * @param num 进度数值
 */
const toProgressString = (num: number) => num > -1 ? num.toString() : t(tsCommonPrefix + 'unknown');
const progress = computed(() => Object.assign({
    color: {
        init: 'bg-grey-700',
        queue: 'bg-primary',
        ongoing: 'bg-primary',
        complete: 'bg-green-600',
        aborted: 'bg-grey-700',
        error: 'bg-red-600'
    } [task.progress.status],
    percentage: task.progress.finished / task.progress.total * 100,
    hasPercentage: task.progress.total > -1 && task.progress.finished > -1,
}, task.progress));
const progreebarMode = computed(() => ({
    init: 'indeterminate',
    queue: 'indeterminate',
    ongoing: progress.value.hasPercentage ? 'determinate' : 'indeterminate',
    complete: 'determinate',
    aborted: 'determinate',
    error: 'determinate'
})[task.progress.status] as 'determinate' | 'indeterminate');

const confirm = useConfirm();
const removeFiles = ref(storage.get('removeFiles')); // 控制是否删除文件的勾选状态

/**
 * ConfirmDialog 分组名称  
 * 随机生成后缀内容以和其他TaskItem区分
 */
const confirmDialogGroup = `remove-task:${ uuid() }`;

/**
 * 返回一个判断当前任务状态是否为指定状态之一的计算属性变量
 * @param acceptedStatusList 接受的任务状态列表
 */
const isStatus = (...acceptedStatusList: Status[]) => computed(() => acceptedStatusList.includes(task.progress.status));

/**
 * 任务是否可以用户主动终止
 */
const abortable = isStatus('queue', 'ongoing');

/**
 * 任务是否可以用户主动重新开始
 */
const restartable = isStatus('ongoing', 'complete', 'aborted', 'error');

/**
 * 任务是否可以用户主动移除
 */
const removable = computed(() => !isSubtask);
/**
 * 用户重新开始下载任务
 */
const confirmRestart = function(e?: PointerEvent | KeyboardEvent) {
    e?.stopPropagation();

    // 重置勾选状态
    removeFiles.value = storage.get('removeFiles');

    const tsConfirmPrefix = tsCommonPrefix + 'confirm-restart.';
    confirm.require({
        group: confirmDialogGroup,
        appendTo: 'self',
        message: t(
            tsConfirmPrefix + 'message',
            { name: task.name },
            { escapeParameter: true }
        ),
        header: t(tsConfirmPrefix + 'header'),
        accept: () => {
            emit('restart', task);
            storage.set('removeFiles', removeFiles.value);
        },
        acceptProps: {
            label: t(tsConfirmPrefix + 'accept'),
        },
        rejectProps: {
            label: t(tsConfirmPrefix + 'reject'),
        }
    });
}

/**
 * 用户停止下载任务
 */
const confirmAbort = function(e?: PointerEvent | KeyboardEvent) {
    e?.stopPropagation();

    // 重置勾选状态
    removeFiles.value = storage.get('removeFiles');

    const tsConfirmPrefix = tsCommonPrefix + 'confirm-abort.';
    confirm.require({
        group: confirmDialogGroup,
        appendTo: 'self',
        message: t(
            tsConfirmPrefix + 'message',
            { name: task.name },
            { escapeParameter: true }
        ),
        header: t(tsConfirmPrefix + 'header'),
        accept: () => {
            // 停止下载任务
            emit('abort', task);
            storage.set('removeFiles', removeFiles.value);
        },
        acceptProps: {
            label: t(tsConfirmPrefix + 'accept'),
        },
        rejectProps: {
            label: t(tsConfirmPrefix + 'reject'),
        }
    });
}

/**
 * 用户移除下载任务
 */
const confirmRemove = function(e?: PointerEvent | KeyboardEvent) {
    e?.stopPropagation();

    // 重置勾选状态
    removeFiles.value = storage.get('removeFiles');

    const tsConfirmPrefix = tsCommonPrefix + 'confirm-remove.';
    confirm.require({
        group: confirmDialogGroup,
        appendTo: 'self',
        message: t(
            tsConfirmPrefix + 'message',
            { name: task.name },
            { escapeParameter: true }
        ),
        header: t(tsConfirmPrefix + 'header'),
        accept: () => {
            // 移除下载任务
            emit('remove', task);
            storage.set('removeFiles', removeFiles.value);
        },
        acceptProps: {
            label: t(tsConfirmPrefix + 'accept'),
        },
        rejectProps: {
            label: t(tsConfirmPrefix + 'reject'),
        }
    });
}
</script>

<template>
    <!-- 确认对话框 -->
    <ConfirmDialog :group="confirmDialogGroup" html />

    <!-- 主要任务内容 -->
    <div
        class="w-full flex flex-col px-3 py-2 hover:bg-surface-800 transition-colors duration-200"
        v-ripple
        @click="$emit('click', $event, task)"
    >
        <!-- 上方主要空间 -->
        <div class="flex flex-row">
            <!-- 左侧文字区域 -->
            <div class="flex flex-col flex-1">
                <div class="text-base">
                    <!-- 标题插槽 -->
                    <slot name="title" :task="task">
                        {{ task.name }}
                    </slot>
                </div>
                <div class="text-sm text-surface-500 dark:text-surface-400 flex flex-row items-center">
                    <!-- 副标题插槽 -->
                    <slot name="caption" :task="task">
                        <span class="mr-3">
                            <!-- 副标题-状态文本插槽 -->
                            <slot name="status" :task="task">
                                {{ t(tsCommonPrefix + task.progress.status) }}
                            </slot>
                        </span>
                        <span>
                            <!-- 副标题-进度文本插槽 -->
                            <slot name="progress" :task="task">
                                {{
                                    t(tsCommonPrefix + 'caption', {
                                        total: toProgressString(task.progress.total),
                                        finished: toProgressString(task.progress.finished),
                                    })
                                }}
                            </slot>
                        </span>
                    </slot>
                </div>
            </div>

            <!-- 右侧操作按钮 -->
            <div class="flex items-center">
                <!-- 额外操作按钮插槽 -->
                <slot name="extraActions" :task="task" />

                <!-- 重新下载任务按钮 -->
                <Button
                    v-show="restartable"
                    icon="pi pi-refresh"
                    variant="text"
                    :loading="loading"
                    @click="confirmRestart"
                    :title="t(tsCommonPrefix + 'confirm-restart.label')"
                    pt:root:class="p-2"
                />

                <!-- 停止下载任务按钮 -->
                <Button
                    v-show="abortable"
                    icon="pi pi-stop"
                    variant="text"
                    :loading="loading"
                    @click="confirmAbort"
                    :title="t(tsCommonPrefix + 'confirm-abort.label')"
                    pt:root:class="p-2"
                />

                <!-- 移除下载任务按钮 -->
                <Button
                    v-show="removable"
                    icon="pi pi-trash"
                    variant="text"
                    :loading="loading"
                    @click="confirmRemove"
                    :title="t(tsCommonPrefix + 'confirm-remove.label')"
                    pt:root:class="p-2"
                />
            </div>
        </div>

        <!-- 下方进度条 -->
        <ProgressBar
            :mode="progreebarMode"
            :value="progress.percentage"
            pt:root:class="h-1 mt-1"
            :pt:value:class="[ progress.color, 'transition-colors' ]"
        >
            <!-- Volt进度条默认自带一个百分比文字，这里我们需要去掉它 -->
            <span></span>
        </ProgressBar>
    </div>
</template>