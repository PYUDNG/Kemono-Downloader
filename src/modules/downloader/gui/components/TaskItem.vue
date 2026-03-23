<script setup lang="ts">
import SaveTaskItem from './SaveTaskItem.vue';
import FileTaskItem from './FileTaskItem.vue';
import PostTaskItem from './PostTaskItem.vue';
import PostsTaskItem from './PostsTaskItem.vue';
import { BaseFileDownloadTask, BaseSavefileTask, BaseTask } from '../../types/base/task';
import { BasePostDownloadTask, BasePostsDownloadTask } from '../../types/base/post';

// 类型守卫函数
function isSaveTask(task: BaseTask): task is BaseSavefileTask {
    return task.type === 'savefile';
}
function isFileTask(task: BaseTask): task is BaseFileDownloadTask {
    return task.type === 'file';
}
function isPostTask(task: BaseTask): task is BasePostDownloadTask {
    return task.type === 'post';
}
function isPostsTask(task: BaseTask): task is BasePostsDownloadTask {
    return task.type === 'posts';
}

// props
const { task, isSubtask = false } = defineProps<{
    /**
     * 任务实例
     */
    task: BaseTask;

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