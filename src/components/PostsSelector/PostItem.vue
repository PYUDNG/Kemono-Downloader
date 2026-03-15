<script setup lang="ts">
import Checkbox from '@/volt/Checkbox.vue';
import { computed, useTemplateRef } from 'vue';
import { v4 as uuid } from 'uuid';
import { PostsApiItem } from '@/modules/api/types/posts.js';
import { PostApiResponse } from '@/modules/api/types/post.js';
import { extractText, getViewport, Nullable, popoverLogic } from '@/utils/main.js';
import Button from '@/volt/Button.vue';
import { PostInfo } from '@/modules/api/types/common';
import { getPostContent, getPostFilePath, getPostTitle, isPostApiResponse, isPostsApiItem } from './utils.js';
import Popover from '@/volt/Popover.vue';
import { useI18n } from 'vue-i18n';
import { i18nKeys } from '@/i18n/utils.js';
import ImageIcon from '~icons/prime/image'
import ExternalLinkIcon from '~icons/prime/external-link'
import OverlayBadge from '@/volt/OverlayBadge.vue';

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

const attachmentsCount = computed(() => isPostApiResponse(data) ? data.post.attachments.length : data.attachments.length);

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
const coverPop = useTemplateRef('cover-pop');
const popoverHandlers = computed(() =>coverPop.value ? popoverLogic(coverPop.value) : Object.create(null) as Record<any, undefined>);
</script>

<template>
    <label
        class="w-full flex flex-row px-3 py-2 hover:bg-emphasis transition-colors duration-200"
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
            <!-- Badge置于图片上层角落 -->
            <OverlayBadge
                :value="attachmentsCount"
                size="small"
                :severity="attachmentsCount ? 'primary' : 'secondary'"
                pt:root:class="z-1"
            >
                <div class="relative overflow-hidden w-10 h-10">
                    <!-- static图片占据主要位置 -->
                    <img
                        v-if="coverUrl"
                        ref="img"
                        :src="coverUrl"
                        class="object-cover object-center w-full h-full relative z-1"
                        @mouseenter="popoverHandlers.onMouseEnter"
                        @mouseleave="popoverHandlers.onMouseLeave"
                        @touchstart="e => {e.preventDefault(); popoverHandlers.onTouchStart?.(e);}"
                        loading="lazy"
                    >
                    <!-- absolute图标置于图片之下 -->
                    <ImageIcon class="max-h-full max-w-full absolute left-1/2 top-1/2 -translate-1/2 z-0 text-[2rem] flex justify-center items-center" />
                </div>
            </OverlayBadge>
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
                <Button variant="text" :pt:root:title="t(i18nKeys.$components.$postsSelector.$buttons.$openPost)">
                    <template #icon>
                        <ExternalLinkIcon />
                    </template>
                </Button>
            </a>
        </div>
    </label>
</template>