<script setup lang="ts" generic="T extends PostsApiItem | PostApiResponse">
import Button from '@/volt/Button.vue';
import Dialog from '@/volt/Dialog.vue';
import { ref } from 'vue';
import PostsList from './PostsList.vue';
import { PostApiResponse } from '@/modules/api/types/post.js';
import { PostsApiItem } from '@/modules/api/types/posts.js';
import { PageState } from 'primevue';
import { PostInfo } from '@/modules/api/types/common';
import { useI18n } from 'vue-i18n';
import SecondaryButton from '@/volt/SecondaryButton.vue';

const { t } = useI18n();

// props
const props = defineProps<{
    /**
     * Dialog标题
     */
    header: string;

    /**
     * Posts列表数据  
     * 如需懒加载，可结合`total`,`rows`属性，仅加载当前页面所展示的帖子，并随翻页逐渐填充数组
     */
    posts: T[];

    /**
     * 翻页逻辑中，每一页展示多少post
     * @default 50
     */
    rows?: number;

    /**
     * 翻页逻辑中，一共有多少posts
     * @default posts.length
     */
    total?: number;

    /**
     * 本地模式还是远程模式
     * - `'local'`: 本地模式，在组件内处理翻页和筛选逻辑
     * - `'remote'`: 远程模式，组件内不处理翻页和筛选逻辑，当翻页和筛选时触发`page`和`filter`事件，交由外部处理
     */
    mode?: 'local' | 'remote';

    /**
     * 当用户触发翻页时的回调函数  
     * 仅在远程模式下有效
     * @param page 翻页信息
     */
    onPageUpdate?: (page: PageState) => any;

    /**
     * 当用户改变筛选文本时的回调函数  
     * 仅在远程模式下有效
     * @param keyword 筛选文本
     */
    onFilter?: (keyword: string) => any;
}>();

// 用于向外传递selection数据的promise
let { promise, reject, resolve } = Promise.withResolvers<PostInfo[]>();

/**
 * 选中的Posts（使用defineModel实现双向绑定）
 */
const selectedPosts = defineModel<PostInfo[]>('selectedPosts', { default: () => [] });

/**
 * 可见性
 */
const visible = ref(false);

// 定义事件
const emit = defineEmits<{
    /**
     * 提交事件，当用户点击确定按钮时触发
     * @param posts 用户选中的Posts信息
     */
    submit: [posts: PostInfo[]];
}>();

// expose
defineExpose({ show, hide });

/**
 * 展示帖子选择器，并返回一个最终以选中的Posts解决的Promise
 */
function show(): Promise<PostInfo[]> {
    ({ promise, reject, resolve } = Promise.withResolvers<PostInfo[]>());
    visible.value = true;
    return promise;
}

/**
 * 隐藏帖子选择器，如有之前调用了`show`返回的promise，将会reject
 */
function hide() {
    visible.value = false;
    reject();
}

function submit(_e: PointerEvent) {
    // 触发submit事件，传递选中的Posts
    emit('submit', selectedPosts.value);
    resolve(selectedPosts.value);
    // 隐藏Dialog
    visible.value = false;
}
</script>

<template>
    <Dialog
        v-model:visible="visible"
        append-to="self"
        :header="header"
        modal
        pt:root:class="h-[80vh]"
        pt:content:class="h-full"
    >
        <!-- Posts列表 -->
        <PostsList
            :posts="posts"
            :rows="rows"
            :total="total"
            v-model="selectedPosts"
            class="h-full"
            :mode="mode"
            @page="p => onPageUpdate?.(p)"
            @filter="keyword => onFilter?.(keyword)"
        />

        <template #footer>
            <SecondaryButton icon="pi pi-times" :label="t('components.posts-selector.buttons.cancel')" @click="hide" />
            <Button :disabled="!selectedPosts.length" icon="pi pi-download" :label="t('components.posts-selector.buttons.ok')" @click="submit" />
        </template>
    </Dialog>
</template>