<script setup lang="ts">
import { IDownloadTask, IFileDownloadTask } from '../../types/interface/task';
import { IPostDownloadTask } from '../../types/interface/post.js';
import PostTaskItem from './PostTaskItem.vue';
import FileTaskItem from './FileTaskItem.vue';

// 类型守卫函数
function isPostTask(task: IDownloadTask): task is IPostDownloadTask {
    return task.type === 'post';
}
function isFileTask(task: IDownloadTask): task is IFileDownloadTask {
    return task.type === 'file';
}

// props
const { task, isSubtask = false } = defineProps<{
    /**
     * 任务实例
     */
    task: IDownloadTask;

    /**
     * 当前task是否从属于某父级task
     * @default false
     */
    isSubtask?: boolean;
}>();

</script>

<template>
    <!-- 根据任务类型展示对应的Item UI Component -->
    <PostTaskItem v-if="isPostTask(task)" :task="task" :isSubtask="isSubtask" />
    <FileTaskItem v-if="isFileTask(task)" :task="task" :isSubtask="isSubtask" />
</template>