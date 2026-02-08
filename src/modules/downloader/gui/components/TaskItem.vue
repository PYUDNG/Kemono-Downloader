<script setup lang="ts">
import { IDownloadTask, IFileDownloadTask } from '../../types/interface/task';
import { IPostDownloadTask, IPostsDownloadTask } from '../../types/interface/post.js';
import PostTaskItem from './PostTaskItem.vue';
import FileTaskItem from './FileTaskItem.vue';
import PostsTaskItem from './PostsTaskItem.vue';

// 类型守卫函数
function isFileTask(task: IDownloadTask): task is IFileDownloadTask {
    return task.type === 'file';
}
function isPostTask(task: IDownloadTask): task is IPostDownloadTask {
    return task.type === 'post';
}
function isPostsTask(task: IDownloadTask): task is IPostsDownloadTask {
    return task.type === 'posts';
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
    <FileTaskItem v-if="isFileTask(task)" :task="task" :isSubtask="isSubtask" />
    <PostTaskItem v-if="isPostTask(task)" :task="task" :isSubtask="isSubtask" />
    <PostsTaskItem v-if="isPostsTask(task)" :task="task" :isSubtask="isSubtask" />
</template>