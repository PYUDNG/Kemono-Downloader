<script setup lang="ts">
import Checkbox from '@/volt/Checkbox.vue';
import { computed, useTemplateRef, watch } from 'vue';
import { v4 as uuid } from 'uuid';
import { PostsApiItem } from '@/modules/api/types/posts.js';
import { PostApiResponse } from '@/modules/api/types/post.js';
import { extractText, getViewport, Nullable } from '@/utils/main.js';
import Button from '@/volt/Button.vue';
import { PostInfo } from '@/modules/api/types/common';
import { getPostContent, getPostFilePath, getPostTitle, isPostsApiItem } from './utils.js';
import Popover from '@/volt/Popover.vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n()

const { data, id } = defineProps<{
    /**
     * 用作`<label>`的`for`和`<input type="checkbox">`的`id`
     */
    id?: string;
    data: PostsApiItem | PostApiResponse;
}>();

const checked = defineModel<boolean>({ default: false });

// 生成唯一的id：如果props.id存在则使用，否则生成内部唯一id
const uniqueId = computed(() => id ?? `post-item-${ uuid() }`);

const emit = defineEmits<{
    click: [event: PointerEvent];
}>();

/**
 * 当前post的信息
 */
const info = computed<PostInfo>(() => {
    const obj = isPostsApiItem(data) ? data : data.post;
    return {
        service: obj.service,
        creatorId: obj.user,
        postId: obj.id
    };
});

/**
 * 封面图url
 */
const coverUrl = computed(() => {
    const path = getPostFilePath(data);
    return path ? `https://img.${ location.host }/thumbnail/data${ path }` : null;
});

/**
 * post页面url
 */
const postUrl = computed(() => `https://${ location.host }/${ info.value.service }/user/${ info.value.creatorId }/post/${ info.value.postId }`);

// cover overlay元素位置
// 不建议直接设置为'self'，因为祖先元素中可能存在relative定位元素会干扰overlay定位
const img = useTemplateRef('img');
const overlayParent = computed(() => img.value?.closest('[data-v-app]') as Nullable<HTMLElement>);

// 根据长宽计算封面图大小限制，保证在屏幕上完全展示的同时尽量大一些
const viewport = getViewport();
const coverSizingClasses = computed(() => {
    if (!img.value) return [];

    /** 封面图宽度占据viewport宽度的占比 */
    const wPercent = img.value.naturalWidth / viewport.value.width;
    /** 封面图高度占据viewport高度的占比 */
    const hPercent = img.value.naturalHeight / viewport.value.height;
    return wPercent > hPercent ?
        ['w-[60vw]'] : ['h-[60vh]'];
});

// 封面图Popover展示逻辑
// 防抖数据
const DEBOUNCE_TIME = 100;
let timeoutId: Nullable<ReturnType<typeof setTimeout>> = null;
let lastShow = 0;
/** 是否为触屏设备 */
let isTouchScreen = false;
const coverPop = useTemplateRef('cover-pop');
const showCoverPop = (e: Event, target?: any) => {
    // 任一事件为TouchEvent，则说明当前为触屏设备
    isTouchScreen = isTouchScreen || e instanceof TouchEvent;
    // 防抖：显示可以打断隐藏
    timeoutId && clearInterval(timeoutId);
    // 执行显示
    coverPop.value?.show(e, target);
    // 防抖：记录显示时间
    lastShow = performance.now();
}
const hideCoverPop = () => {
    // 防抖：在上一次显示后的防抖时间内，不执行隐藏
    if (performance.now() - lastShow < DEBOUNCE_TIME && isTouchScreen) return;
    // 防抖调用：在防抖时间后执行隐藏，期间可以使用clearTimeout打断（取消隐藏任务）
    timeoutId = setTimeout(() => coverPop.value?.hide(), DEBOUNCE_TIME);
}
// 触屏设备点击任意位置因此Popover
const appContainer = computed(() => img.value?.closest('[data-v-app]'));
const appWatchHandle = watch(appContainer, val => {
    if (val) {
        val.addEventListener('touchstart', () => hideCoverPop(), { passive: true });
        appWatchHandle.stop();
    }
}, { immediate: true });
</script>

<template>
    <label
        class="w-full flex flex-row px-3 py-2 hover:bg-surface-800 transition-colors duration-200"
        :for="uniqueId"
        v-ripple
        @click="$emit('click', $event)"
    >
        <!-- 复选框 -->
        <div class="grow-0 shrink-0 flex flex-row items-center px-3 py-2">
            <Checkbox v-model="checked" :inputId="uniqueId" binary />
        </div>

        <!-- 缩略图 -->
        <div class="grow-0 shrink-0 flex flex-row items-center px-3 py-2">
            <div class="relative overflow-hidden w-10 h-10">
                <img
                    v-if="coverUrl"
                    ref="img"
                    :src="coverUrl"
                    class="object-cover object-center w-full h-full relative z-1"
                    @mouseenter="e => isTouchScreen || showCoverPop(e)"
                    @mouseleave="isTouchScreen || hideCoverPop()"
                    @touchstart="e => {e.preventDefault(); showCoverPop(e);}"
                    loading="lazy"
                >
                <i class="pi pi-image max-h-full max-w-full absolute left-1/2 top-1/2 -translate-1/2 z-0 text-[2rem] flex justify-center items-center"></i>
            </div>
            <Popover
                v-if="overlayParent && coverUrl"
                ref="cover-pop"
                :appendTo="overlayParent"
                class="pointer-events-none"
            >
                <img
                    :src="coverUrl"
                    :class="[...coverSizingClasses]"
                >
            </Popover>
        </div>

        <!-- 文字部分 -->
        <div class="grow shrink flex flex-col justify-center truncate">
            <!-- 主标题 -->
            <div class="text-base w-full">
                {{ getPostTitle(data) }}
            </div>
            <!-- 副标题 -->
            <!-- PostsApiItem类暂时不展示：服务端返回的.substring是一个从html代码简单取前50个字符的截断字符串，不适合人类阅读
            <div>{{ isPostsApiItem(data) ? data.substring : data.post.content.substring(50) }}</div>
            -->
            <div
                class="text-sm text-surface-500 dark:text-surface-400 flex flex-row items-center w-full truncate"
            >{{ extractText(getPostContent(data) ?? '') }}</div>
        </div>

        <!-- 按钮 -->
        <div class="flex flex-row items-center px-3 py-2">
            <a :href="postUrl" target="_blank">
                <Button icon="pi pi-external-link" variant="text" :pt:root:title="t('components.posts-selector.buttons.open-post')" />
            </a>
        </div>
    </label>
</template>