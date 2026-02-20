<script setup lang="ts" generic="T extends PostsApiItem | PostApiResponse">
import { PostApiResponse } from '@/modules/api/types/post.js';
import { PostsApiItem } from '@/modules/api/types/posts.js';
import PostItem from './PostItem.vue';
import InputText from '@/volt/InputText.vue';
import { computed, ref } from 'vue';
import { isPostsApiItem } from './utils';
import { useI18n } from 'vue-i18n';
import Paginator from '@/volt/Paginator.vue';
import { PageState } from 'primevue';
import { PostInfo } from '@/modules/api/types/common';

const { t } = useI18n();

const props = defineProps<{
    /**
     * Posts列表  
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
}>();

const rows = computed(() => props.rows ?? 50);
const total = computed(() => props.total ?? props.posts.length);

const emit = defineEmits<{
    /**
     * 当用户翻页时触发此事件
     */
    page: [page: PageState]
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

// 筛选逻辑：
// 1. 将用户输入的搜索文本以空白字符分隔为关键词数组
// 2. 凡是标题中包含一个或多个数组元素的，均展示在筛选结果中
// 3. 包含元素数量更多的排序更靠前，元素数量一样多的按照原顺序排序
/** 用户输入的搜索文本 */
const search = ref('');

/** 筛选后的展示的posts */
const filteredPosts = computed(() => {
    if (!search.value.trim()) return props.posts;

    /** 关键词数组 */
    const keywords = search.value.split(/\s/g);

    // 一边计数一边筛选
    // 至少命中一个关键词以保留在筛选结果中
    /** 每个post命中几个关键词 */
    const map = new Map<T, number>();
    const filteredPosts = props.posts.filter(post => {
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
        props.posts.indexOf(p1) - props.posts.indexOf(p2)
    );

    return filteredPosts;
});
//#endregion

//#region 翻页
/**
 * 翻页逻辑中，存储当前页面信息
 */
let page: PageState = {
    first: 0,
    page: 0,
    rows: Math.min(rows.value, total.value),
    pageCount: total.value
};
/**
 * 翻页逻辑中，处于当前展示页面中的props.posts
 */
const pagePosts = computed(() => props.posts.filter((_post, i) => {
    const start = page.first;
    const end = start + page.rows;
    return start <= i && i <= end;
}));
function onPageChange(p: PageState) {
    emit('page', p);
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
    
    return props.posts.filter(post => 
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
    <div class="flex flex-col">
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
                :rows="rows"
                :total-records="total"
                @page="onPageChange"
            />
        </div>
    </div>
</template>

