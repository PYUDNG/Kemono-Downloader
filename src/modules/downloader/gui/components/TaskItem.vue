<script setup lang="ts">
import SaveTaskItem from './SaveTaskItem.vue';
import FileTaskItem from './FileTaskItem.vue';
import PostTaskItem from './PostTaskItem.vue';
import PostsTaskItem from './PostsTaskItem.vue';
import type { IFileDownloadTask, ISavefileTask, ITask } from '../../types/interface/task';
import type { IPostDownloadTask, IPostsDownloadTask } from '../../types/interface/post';

// 类型守卫函数
function isSaveTask(task: ITask): task is ISavefileTask {
    return task.type === 'savefile';
}
function isFileTask(task: ITask): task is IFileDownloadTask {
    return task.type === 'file';
}
function isPostTask(task: ITask): task is IPostDownloadTask {
    return task.type === 'post';
}
function isPostsTask(task: ITask): task is IPostsDownloadTask {
    return task.type === 'posts';
}

// props
const { task, isSubtask = false } = defineProps<{
    /**
     * 任务实例
     */
    task: ITask;

    /**
     * 当前task是否从属于某父级task
     * @default false
     */
    isSubtask?: boolean;
}>();

</script>

<template>
    <!-- 根据任务类型展示对应的Item UI Component -->
    <SaveTaskItem v-if="isSaveTask(task)" :task="task" :isSubtask="isSubtask" />
    <FileTaskItem v-if="isFileTask(task)" :task="task" :isSubtask="isSubtask" />
    <PostTaskItem v-if="isPostTask(task)" :task="task" :isSubtask="isSubtask" />
    <PostsTaskItem v-if="isPostsTask(task)" :task="task" :isSubtask="isSubtask" />
</template>