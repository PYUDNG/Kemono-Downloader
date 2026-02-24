<script setup lang="ts" generic="T extends PostsApiItem | PostApiResponse">
import { PostApiResponse } from '@/modules/api/types/post.js';
import { PostsApiItem } from '@/modules/api/types/posts.js';
import PostItem from './PostItem.vue';
import InputText from '@/volt/InputText.vue';
import { computed, ref, watch } from 'vue';
import { isPostsApiItem } from './utils';
import { useI18n } from 'vue-i18n';
import Paginator from '@/volt/Paginator.vue';
import { PageState } from 'primevue';
import { PostInfo } from '@/modules/api/types/common';
import { debounce } from '@/utils/main';

const { t } = useI18n();

const props = defineProps<{
    /**
     * Posts列表
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
}>();

const posts = computed(() => props.posts);
const rows = computed(() => props.rows ?? 50);
const total = computed(() => props.total ?? posts.value.length);
const mode = computed(() => props.mode ?? 'local');

const emit = defineEmits<{
    /**
     * 当用户翻页时触发此事件
     */
    page: [page: PageState];

    /**
     * 当用户改变过滤文本时触发此事件
     */
    filter: [keyword: string];
}>();

//#region 选中
/**
 * 选中的Posts信息（使用defineModel实现双向绑定）
 */
const selectedPosts = defineModel<PostInfo[]>({ default: () => [] });

/**
 * 寻找post在pelectedPosts中的index
 * @returns index（当存在时）或-1（当不存在时）
 */
function findSelectedIndex(post: T): number {
    const data = isPostsApiItem(post) ? post : post.post;
    return selectedPosts.value.findIndex(info => 
        data.id === info.postId &&
        data.service === info.service &&
        data.user === info.creatorId
    );
}

/**
 * 检查Post是否被选中
 */
function isPostSelected(post: T): boolean {
    return findSelectedIndex(post) > -1;
}

/**
 * 处理Post选择状态变化
 */
function handlePostSelectionChange(post: T, checked: boolean) {
    const data = isPostsApiItem(post) ? post : post.post;
    const index = findSelectedIndex(post);

    if (checked) {
        // 添加选中的Post
        index === -1 && selectedPosts.value.push({
            service: data.service,
            creatorId: data.user,
            postId: data.id
        });
    } else {
        // 移除取消选中的Post
        index !== -1 && selectedPosts.value.splice(index, 1);
    }
}
//#endregion

//#region 筛选
// 根据用户输入的搜索文本筛选展示的posts

// 本地模式筛选逻辑：
// 1. 将用户输入的搜索文本以空白字符分隔为关键词数组
// 2. 凡是标题中包含一个或多个数组元素的，均展示在筛选结果中
// 3. 包含元素数量更多的排序更靠前，元素数量一样多的按照原顺序排序
/** 用户输入的筛选文本 */
const search = ref('');

// 筛选事件
watch(search, debounce(newVal => {
    // 本地模式下不触发筛选事件
    if (mode.value === 'local') return;

    // 触发筛选事件
    emit('filter', newVal);
}, 500));

/** 筛选后的展示的posts */
const filteredPosts = computed(() => {
    // 远程模式下传入即展示，不进行内部筛选。筛选逻辑应该由外部调用者实现
    if (mode.value === 'remote') return posts.value;
    // 当输入的筛选文本内容为空时，不进行筛选
    if (!search.value.trim()) return posts.value;

    /** 关键词数组 */
    const keywords = search.value.split(/\s/g);

    // 一边计数一边筛选
    // 至少命中一个关键词以保留在筛选结果中
    /** 每个post命中几个关键词 */
    const map = new Map<T, number>();
    const filteredPosts = posts.value.filter(post => {
        const title = isPostsApiItem(post) ? post.title : post.post.title;
        let count = 0;
        keywords.forEach(k => title.includes(k) && count++);
        map.set(post, count);
        return count > 0;
    });

    // 按照计数结果排序
    // 命中越多关键词越靠前，相同数量按照原始顺序
    filteredPosts.sort((p1, p2) =>
        // 关键词数量降序 
        map.get(p2)! - map.get(p1)! ||
        // 关键词数量相等时，index升序
        posts.value.indexOf(p1) - posts.value.indexOf(p2)
    );

    return filteredPosts;
});
//#endregion

//#region 翻页
/**
 * 翻页逻辑中，存储当前页面信息
 */
const page = ref<PageState>({
    first: 0,
    page: 0,
    rows: Math.min(rows.value, total.value),
    pageCount: total.value
});
// 当传入posts数组改变时，重置当前展示页面到第一页
watch(posts, () => page.value.first = 0);
/**
 * 翻页逻辑中，处于当前展示页面中的posts
 */
const pagePosts = computed(() => posts.value.filter((_post, i) => {
    // 远程模式下，不进行内部分页，分页逻辑应在外部调用者处实现
    if (mode.value === 'remote') return true;

    const start = page.value.first;
    const end = start + page.value.rows;
    return start <= i && i <= end;
}));
function onPageChange(p: PageState) {
    // 本地模式下不触发翻页事件
    if (mode.value === 'local') return;

    // 触发翻页事件
    emit('page', p);

    // 更新存储的页面数据
    page.value = p;
}
//#endregion

//#region 统合展示posts
/**
 * 最终展示的posts列表
 * - 必须在过滤后的列表中
 * - 必须在当前展示页的列表中
 */
const displayPosts = computed(() => {
    // 使用Set提高查找效率
    const filteredSet = new Set(filteredPosts.value);
    const pageSet = new Set(pagePosts.value);
    
    return posts.value.filter(post => 
        filteredSet.has(post) && pageSet.has(post)
    );
});
/**
 * 最终展示的posts列表的UI数据
 */
const displayPostItems = computed(() => 
    displayPosts.value.map(post => ({
        post,
        key: isPostsApiItem(post) ? post.id : post.post.id,
        isSelected: isPostSelected(post)
    }))
);
</script>

<template>
    <div ref="div" class="flex flex-col">
        <!-- 搜索框 -->
        <div class="px-3 py-2 flex flex-row items-center">
            <span class="w-fit px-3 py-2">{{ t('components.posts-selector.list.search') }}</span>
            <InputText v-model="search" class="grow shrink" />
        </div>

        <!-- Posts 列表 -->
        <div class="grow shrink overflow-auto">
            <PostItem
                v-for="item of displayPostItems"
                :key="item.key"
                :data="item.post"
                :model-value="item.isSelected"
                @update:model-value="(checked: boolean) => handlePostSelectionChange(item.post, checked)"
            />
        </div>

        <!-- 分页 -->
        <div>
            <Paginator
                :first="page.first"
                :rows="rows"
                :total-records="total"
                @page="onPageChange"
            />
        </div>
    </div>
</template>

