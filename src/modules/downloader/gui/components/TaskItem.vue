<script setup lang="ts">
import FileTaskItem from './FileTaskItem.vue';
import ResourceTaskItem from './ResourceTaskItem.vue';
import type { TaskLike } from '../../types/model.js';

// props
const { task, isSubtask = false } = defineProps<{
    /**
     * 任务实例
     */
    task: TaskLike;

    /**
     * 当前task是否从属于某父级task
     * @default false
     */
    isSubtask?: boolean;
}>();
</script>

<template>
    <!-- 根据任务结构类型展示对应的Item UI Component -->
    <FileTaskItem v-if="task.type === 'file'" :task="task" :is-subtask="isSubtask" />
    <ResourceTaskItem v-else :task="task" :is-subtask="isSubtask" />
</template>
