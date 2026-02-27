<template>
    <!-- This is NOT a volt component - its fully written by myself -->
    <!-- 定位用元素 -->
    <div v-if="!parent" ref="div"></div>

    <!-- PrimeVue Toast -->
    <Toast v-else
        unstyled
        :pt="theme"
        :ptOptions="{
            mergeProps: ptViewMerge
        }"
    >
        <template #closeicon>
            <TimesIcon />
        </template>
    </Toast>
</template>

<script setup lang="ts">
import TimesIcon from '@primevue/icons/times';
import Toast, { type ToastPassThroughOptions, type ToastProps } from 'primevue/toast';
import { ref, useTemplateRef, watch } from 'vue';
import { ptViewMerge } from './utils';
import { detectDom } from '@/utils/main';
import { v4 as uuid } from 'uuid';

interface Props extends /* @vue-ignore */ ToastProps {}
defineProps<Props>();

const div = useTemplateRef('div');
const parent = ref<HTMLDivElement>();
const handle = watch(div, div => {
    if (div) {
        parent.value = div.closest('[data-v-app]')! as HTMLDivElement;
        handle.stop();
    }
});

const className = `primevue-toast-${ uuid() }`;
const theme = ref<ToastPassThroughOptions>({
    root: `${ className }
        fixed z-5000 flex flex-col gap-3 w-sm h-fit
        p-top-left:top-4 p-top-left:left-4
        p-top-center:top-4 p-top-center:left-1/2 p-top-center:-translate-x-1/2
        p-top-right:top-4 p-top-right:right-4
        p-bottom-left:bottom-4 p-bottom-left:left-4
        p-bottom-center:bottom-4 p-bottom-center:left-1/2 p-bottom-center:-translate-x-1/2
        p-bottom-right:bottom-4 p-bottom-right:right-4
        p-center:top-1/2 p-center:left-1/2 p-center:-translate-x-1/2 p-center:-translate-y-1/2`,
    message: `relative flex items-center gap-3 rounded-md shadow-lg
        bg-surface-0 dark:bg-surface-900
        text-surface-700 dark:text-surface-0
        max-w-sm w-full mb-4
        backdrop-blur-[1.5px] dark:backdrop-blur-[10px]
        border border-solid border-surface-200 dark:border-surface-700
        [&[data-p="info"]]:border-blue-200 dark:[&[data-p="info"]]:border-[color-mix(in_srgb,var(--color-blue-700),transparent_64%)]
        [&[data-p="info"]]:text-blue-600 dark:[&[data-p="info"]]:text-blue-500
        [&[data-p="info"]]:bg-[color-mix(in_srgb,var(--color-blue-50),transparent_5%)] dark:[&[data-p="info"]]:bg-[color-mix(in_srgb,var(--color-blue-500),transparent_84%)]
        [&[data-p="warn"]]:border-yellow-200 dark:[&[data-p="warn"]]:border-[color-mix(in_srgb,var(--color-yellow-700),transparent_64%)]
        [&[data-p="warn"]]:text-yellow-600 dark:[&[data-p="warn"]]:text-yellow-500
        [&[data-p="warn"]]:bg-[color-mix(in_srgb,var(--color-yellow-50),transparent_5%)] dark:[&[data-p="warn"]]:bg-[color-mix(in_srgb,var(--color-yellow-500),transparent_84%)]
        [&[data-p="error"]]:border-red-200 dark:[&[data-p="error"]]:border-[color-mix(in_srgb,var(--color-red-700),transparent_64%)]
        [&[data-p="error"]]:text-red-600 dark:[&[data-p="error"]]:text-red-500
        [&[data-p="error"]]:bg-[color-mix(in_srgb,var(--color-red-50),transparent_5%)] dark:[&[data-p="error"]]:bg-[color-mix(in_srgb,var(--color-red-500),transparent_84%)]
        [&[data-p="success"]]:border-green-200 dark:[&[data-p="success"]]:border-[color-mix(in_srgb,var(--color-green-700),transparent_64%)]
        [&[data-p="success"]]:text-green-600 dark:[&[data-p="success"]]:text-green-500
        [&[data-p="success"]]:bg-[color-mix(in_srgb,var(--color-green-50),transparent_5%)] dark:[&[data-p="success"]]:bg-[color-mix(in_srgb,var(--color-green-500),transparent_84%)]`,
    messageContent: `flex justify-between items-start w-full p-3 gap-2`,
    messageIcon: `flex-shrink-0 size-[1.125rem]
        [&[data-p="info"]]:text-blue-500 dark:[&[data-p="info"]]:text-blue-400
        [&[data-p="warn"]]:text-yellow-500 dark:[&[data-p="warn"]]:text-yellow-400
        [&[data-p="error"]]:text-red-500 dark:[&[data-p="error"]]:text-red-400
        [&[data-p="success"]]:text-green-500 dark:[&[data-p="success"]]:text-green-400`,
    messageText: `flex flex-col flex-1 min-w-0 gap-2`,
    summary: `font-medium text-sm
        [&[data-p="info"]]:text-blue-600 dark:[&[data-p="info"]]:text-blue-500
        [&[data-p="warn"]]:text-yellow-600 dark:[&[data-p="warn"]]:text-yellow-500
        [&[data-p="error"]]:text-red-600 dark:[&[data-p="error"]]:text-red-500
        [&[data-p="success"]]:text-green-600 dark:[&[data-p="success"]]:text-green-500`,
    detail: `text-sm text-surface-600 dark:text-surface-300`,
    buttonContainer: `flex-shrink-0`,
    closeButton: `inline-flex items-center justify-center size-6 rounded-full cursor-pointer
        relative mt-[-25%] text-inherit right-[-25%] w-7 h-7
        hover:text-blue-700 dark:hover:text-blue-400 hover:bg-[color-mix(in_srgb,var(--color-blue-500),transparent_84%)]
        focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-primary
        transition-colors duration-200`,
    closeIcon: `size-3`,
    transition: {
        // 1. 定义动画的时间、曲线（整个过程都在）
        enterActiveClass: 'transition-all duration-300 ease-in',
        leaveActiveClass: 'transition-all duration-300 ease-in',

        // 2. 初始状态：完全透明、偏移、无间距
        enterFromClass: 'opacity-0 scale-80 mb-0',

        // 3. 进入后的目标状态（以及离开前的起始状态）
        enterToClass: 'opacity-100 h-fit',
        leaveFromClass: 'opacity-100 transform-none h-fit',
        
        // 4. 离开后的目标状态
        leaveToClass: 'opacity-0 transform-[translateY(-100%)] scale-60 !mb-0 h-0',

        duration: 300,
    }
});

detectDom('.' + className).then(element => {
    parent.value ?
        parent.value.appendChild(element) :
        watch(parent, val => val!.append(element));
});
</script>

