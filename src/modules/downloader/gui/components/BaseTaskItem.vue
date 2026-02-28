<script setup lang="ts" generic="T extends BaseDownloadTask = BaseDownloadTask">
import ProgressBar from '@/volt/ProgressBar.vue';
import type { Status } from '../../types/interface/main.js';
import { useI18n } from 'vue-i18n';
import { computed, ref } from 'vue';
import Button from '@/volt/Button.vue';
import ConfirmDialog from '@/volt/ConfirmDialog.vue';
import { useConfirm } from 'primevue/useconfirm';
import { globalStorage, makeStorageRef } from '@/storage';
import { v4 as uuid } from 'uuid';
import { supports } from './utils.js';
import { BaseDownloadTask } from '../../types/base/task.js';
import Checkbox from '@/volt/Checkbox.vue';
import ExclamationTriangleIcon from '@primevue/icons/exclamationtriangle';

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
    restart: [task: T, deleteFiles: boolean];
    abort: [task: T, deleteFiles: boolean];
    remove: [task: T, deleteFiles: boolean];
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
        paused: 'bg-grey-700',
        queue: 'bg-primary',
        ongoing: 'bg-primary',
        complete: 'bg-green-600',
        aborted: 'bg-grey-700',
        error: 'bg-red-600'
    } [task.progress.status],
    percentage: task.progress.total > -1 && task.progress.finished > -1 ?
        task.progress.finished / task.progress.total * 100 : 0,
    hasPercentage: task.progress.total > -1 && task.progress.finished > -1,
}, task.progress));
const progreebarMode = computed(() => ({
    init: 'indeterminate',
    paused: 'determinate',
    queue: 'determinate',
    ongoing: progress.value.hasPercentage ? 'determinate' : 'indeterminate',
    complete: 'determinate',
    aborted: 'determinate',
    error: 'determinate'
})[task.progress.status] as 'determinate' | 'indeterminate');

const confirm = useConfirm();
/** 当前provider是否支持abortFiles功能 */
const abortFilesSupported = computed(() => supports(task, 'abortFiles'));
/** 用户设定的如何处理已下载文件设置 */
const abortFiles = makeStorageRef('abortFiles', storage);
/** 是否展示删除文件复选框 */
const showCheckbox = computed(() => abortFiles.value === 'prompt' && abortFilesSupported.value);
/** 控制是否删除已下载文件的勾选状态 */
const deleteFilesChecked = ref(false);
/** 复选框的id，用于和label相关联 */
const checkboxId = 'confirm-checkbox-' + uuid();
/** 是否真正删除已下载文件文件 */
const deleteFiles = computed(() =>
    abortFilesSupported.value && {
        prompt: deleteFilesChecked.value,
        preserve: false,
        delete: true,
    }[abortFiles.value]
);

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
 * 任务是否可以用户主动暂停/解除暂停
 */
const pausable = supports(task, 'pause') && isStatus('paused', 'ongoing');

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

    // 重置复选框选中状态
    deleteFilesChecked.value = false;

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
            emit('restart', task, deleteFiles.value);
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

    // 重置复选框选中状态
    deleteFilesChecked.value = false;

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
            emit('abort', task, deleteFiles.value);
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

    // 重置复选框选中状态
    deleteFilesChecked.value = false;

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
            emit('remove', task, deleteFiles.value);
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
 * 根据任务类型展示对应的图标
 */
const icon = computed(() => ({
    download: 'pi pi-download',
    file: 'pi pi-file',
    post: 'pi pi-file',
    posts: 'pi pi-folder',
})[task.type] as string);
</script>

<template>
    <!-- 确认对话框 -->
    <ConfirmDialog :group="confirmDialogGroup" html>
        <template #content="{ message, html }">
            <div class="flex flex-col">
                <!-- 上方图标/文字内容 -->
                <div class="pt-0 px-5 pb-5 flex items-center gap-4">
                    <ExclamationTriangleIcon class="size-6" />
                    <span v-if="html" v-html="message.message"></span>
                    <span v-else>{{ message.message }}</span>
                </div>
                <!-- 下方删除文件复选框 -->
                <div v-if="showCheckbox" class="pt-0 px-5 pb-5 flex flex-row justify-between items-center">
                    <label :for="checkboxId">{{ t(tsCommonPrefix + 'confirm-delete-files') }}</label>
                    <Checkbox v-model="deleteFilesChecked" :input-id="checkboxId" />
                </div>
            </div>
        </template>
    </ConfirmDialog>

    <!-- 主要任务内容 -->
    <div
        class="w-full flex flex-col px-3 py-2 hover:bg-surface-800 transition-colors duration-200"
        v-ripple
        @click="$emit('click', $event, task)"
    >
        <!-- 上方主要空间 -->
        <div class="flex flex-row relative items-center">
            <!-- 左侧图标/缩略图 -->
            <div class="flex flex-row justify-center items-center h-full min-w-10 min-h-10 relative px-3 py-2">
                <!-- 如果是图片且已经下载完毕，就加载为缩略图 -->
                <!-- 缩略图尚未实现 -->
                <!-- 没有缩略图时，展示图标 -->
                <i :class="[icon]" class="max-w-full max-h-full absolute left-1/2 top-1/2 -translate-1/2 text-2xl flex justify-center items-center"></i>
            </div>
            
            <!-- 中间文字区域 -->
            <div class="flex flex-col flex-1 px-3 py-2">
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
            <div class="flex items-center px-3 py-2">
                <!-- 额外操作按钮插槽 -->
                <slot name="extraActions" :task="task" />

                <!-- 暂停下载任务按钮 -->
                <Button
                    v-show="pausable"
                    :icon="task.progress.status === 'paused' ? 'pi pi-play' : 'pi pi-pause'"
                    variant="text"
                    :loading="loading"
                    @click="task.progress.status === 'paused' ? task.unpause() : task.pause()"
                    :title="t(tsCommonPrefix + (task.progress.status === 'paused' ? 'unpause' : 'pause'))"
                    pt:root:class="p-2"
                />

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