<script setup lang="ts" generic="T extends PostsApiItem | PostApiResponse">
import Button from '@/volt/Button.vue';
import Dialog from '@/volt/Dialog.vue';
import type { Component } from 'vue';
import { ref, watch } from 'vue';
import PostsList from './PostsList.vue';
import type { PostApiResponse, PostsApiItem, PostInfo } from '@/modules/api/types/main.js';
import type { PageState } from 'primevue';
import { useI18n } from 'vue-i18n';
import SecondaryButton from '@/volt/SecondaryButton.vue';
import { getIsMobileLayout } from '@/utils/main';
import { i18nKeys } from '@/i18n/utils';
import TimesIcon from '~icons/prime/times'
import PrimeCheck from '~icons/prime/check'

const { t } = useI18n();

type DialogButton = {
    /**
     * 按钮文本
     */
    label: string;

    /**
     * 按钮类型（颜色）
     */
    type: 'primary' | 'secondary';

    /**
     * 图标组件
     */
    icon: Component;

    /**
     * 是否被禁用
     */
    disabled: boolean;

    /**
     * 按钮点击回调
     * @param submit 提交已选择的帖子列表并关闭对话框的方法
     * @param cancel 取消选择并关闭对话框的方法
     */
    onclick(submit: () => void, cancel: () => void): void;
};

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
     * 对话框按钮
     */
    buttons?: DialogButton[];

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

    /**
     * 当用户点击全选所有页时的回调函数  
     * 仅在远程模式下有效
     * @param e 点击事件
     */
    onSelectAll?: (e: PointerEvent) => any;
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
defineExpose({
    // 控制方法
    show, hide,
    // 模型值访问
    selectedPosts,
});

// 是否采用移动端布局
const mobile = getIsMobileLayout();

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

function submit() {
    // 触发submit事件，传递选中的Posts
    emit('submit', selectedPosts.value);
    resolve(selectedPosts.value);
    // 隐藏Dialog
    visible.value = false;
}

// 当选择器UI被隐藏时，自动reject，以应对点击右上角关闭按钮/点击背景遮罩/Escape按键等非取消按钮隐藏的情况
watch(visible, (val, oldVal) => oldVal && !val && reject());
</script>

<template>
    <Dialog
        v-model:visible="visible"
        append-to="self"
        :header="header"
        modal
        pt:root:class="h-[80vh] min-w-[50vw]"
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
            @select-all="e => onSelectAll?.(e)"
        />

        <!-- 底部按钮 -->
        <template #footer>
            <!-- 允许使用插槽自定义按钮 -->
            <slot name="buttons">
                <!-- 也可以通过props声明式定义按钮 -->
                <template v-if="Array.isArray(buttons)">
                    <component
                        v-for="button of buttons"
                        :is="({
                            primary: Button,
                            secondary: SecondaryButton,
                        })[button.type]"
                        :disabled="button.disabled"
                        :label="button.label"
                        :variant="mobile ? undefined : 'text'"
                        :pt:root:class="{ grow: mobile }"
                        @click="() => button.onclick(submit, hide)"
                    >
                        <template #icon>
                            <component :is="button.icon" />
                        </template>
                    </component>
                </template>

                <!-- 既没有插槽又没有声明按钮props时，使用默认按钮 -->
                <template v-else>
                    <!-- 默认取消按钮 -->
                    <SecondaryButton
                        :label="t(i18nKeys.$components.$postsSelector.$buttons.$cancel)"
                        :variant="mobile ? undefined : 'text'"
                        :pt:root:class="{ grow: mobile }"
                        @click="hide"
                    >
                        <template #icon>
                            <TimesIcon />
                        </template>
                    </SecondaryButton>
                    <!-- 默认确认按钮 -->
                    <Button
                        :disabled="!selectedPosts.length"
                        :label="t(i18nKeys.$components.$postsSelector.$buttons.$ok)"
                        :variant="mobile ? undefined : 'text'"
                        :pt:root:class="{ grow: mobile }"
                        @click="submit"
                    >
                        <template #icon>
                            <PrimeCheck />
                        </template>
                    </Button>
                </template>
            </slot>
        </template>
    </Dialog>
</template>