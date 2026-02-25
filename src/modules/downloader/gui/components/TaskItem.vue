<script setup lang="ts">
import PostTaskItem from './PostTaskItem.vue';
import FileTaskItem from './FileTaskItem.vue';
import PostsTaskItem from './PostsTaskItem.vue';
import { BaseDownloadTask, BaseFileDownloadTask } from '../../types/base/task';
import { BasePostDownloadTask, BasePostsDownloadTask } from '../../types/base/post';

// 类型守卫函数
function isFileTask(task: BaseDownloadTask): task is BaseFileDownloadTask {
    return task.type === 'file';
}
function isPostTask(task: BaseDownloadTask): task is BasePostDownloadTask {
    return task.type === 'post';
}
function isPostsTask(task: BaseDownloadTask): task is BasePostsDownloadTask {
    return task.type === 'posts';
}

// props
const { task, isSubtask = false } = defineProps<{
    /**
     * 任务实例
     */
    task: BaseDownloadTask;

    /**
     * 当前task是否从属于某父级task
     * @default false
     */
    isSubtask?: boolean;
}>();

</script>

<template>
    <!-- 根据任务类型展示对应的Item UI Component -->
    <FileTaskItem v-if="isFileTask(task)" :task="task" :isSubtask="isSubtask" />
    <PostTaskItem v-if="isPostTask(task)" :task="task" :isSubtask="isSubtask" />
    <PostsTaskItem v-if="isPostsTask(task)" :task="task" :isSubtask="isSubtask" />
</template>