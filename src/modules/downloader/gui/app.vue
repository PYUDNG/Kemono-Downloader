<script setup lang="ts">
import Dialog from '@/volt/Dialog.vue';
import { IDownloadProvider, Status } from '../types/interface/main.ts';
import { computed, provide, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import TabLayout from '@/components/TabLayout/TabLayout.vue';
import TabPanel from '@/components/TabLayout/TabPanel.vue';
import TaskItem from './components/TaskItem.vue';
import { providerInjectionKey } from './utils';

const { t } = useI18n();

// props
const { provider } = defineProps<{
    provider: IDownloadProvider,
}>();

// provides
provide(providerInjectionKey, provider);

/**
 * 窗口可见性
 */
const visible = ref(false);

/**
 * 选项卡列表
 */
const options: Record<'label' | 'value', string>[] = ['init', 'queue', 'ongoing', 'complete', 'aborted', 'error'].map(name => ({
    label: t('downloader.gui.tabs.' + name),
    value: name
}));

/**
 * 当前选项卡
 */
const tab = ref<Status>();

/**
 * 根据任务状态筛选任务
 * @param status 任务状态
 */
const filterTask = (status: Status) => computed(() => provider.tasks.filter(t => t.progress.status === status));
/**
 * 初始化的下载任务
 */
const initTasks = filterTask('init');
/**
 * 队列中的下载任务
 */
const queueTasks = filterTask('queue');
/**
 * 进行中的下载任务
 */
const ongoingTasks = filterTask('ongoing');
/**
 * 已完成的下载任务
 */
const completedTasks = filterTask('complete');
/**
 * 已终止的下载任务
 */
const abortedTasks = filterTask('aborted');
/**
 * 存在错误的下载任务
 */
const errorTasks = filterTask('error');

// expose
defineExpose({ visible, tab });
</script>

<template>
    <Dialog
        v-model:visible="visible"
        :header="t('downloader.gui.title')"
        append-to="self"
        dismissable-mask
        modal
    >
        <TabLayout
            v-model="tab"
            :options="options"
            option-label="label"
            option-value="value"
            class="w-[80vw] h-[80vh]"
        >
            <!-- 初始化 -->
            <TabPanel name="init">
                <TaskItem
                    v-for="task of initTasks"
                    :task="task"
                />
            </TabPanel>

            <!-- 队列中 -->
            <TabPanel name="queue">
                <TaskItem
                    v-for="task of queueTasks"
                    :task="task"
                />
            </TabPanel>

            <!-- 下载中 -->
            <TabPanel name="ongoing">
                <TaskItem
                    v-for="task of ongoingTasks"
                    :task="task"
                />
            </TabPanel>

            <!-- 已完成 -->
            <TabPanel name="complete">
                <TaskItem
                    v-for="task of completedTasks"
                    :task="task"
                />
            </TabPanel>

            <!-- 已终止 -->
            <TabPanel name="aborted">
                <TaskItem
                    v-for="task of abortedTasks"
                    :task="task"
                />
            </TabPanel>

            <!-- 存在错误 -->
            <TabPanel name="error">
                <TaskItem
                    v-for="task of errorTasks"
                    :task="task"
                />
            </TabPanel>
        </TabLayout>
        <!-- 底栏（TODO） -->
    </Dialog>
</template>