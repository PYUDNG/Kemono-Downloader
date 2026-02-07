<script setup lang="ts">
import { buildCssText } from '@/utils/main.js';
import Button from '@/volt/Button.vue';
import Card from '@/volt/Card.vue';
import { Ref, watch } from 'vue';
import { zIndexManager } from '@/utils/helpers/ui-utils.js';
import { manager } from './utils/main.js';

// props
const {
    title = '',
    backgroundColor = 'color-mix(in oklab, black, transparent)',
    backdropDismiss = true,
    seamless = false,
    zIndex: propZIndex,
} = defineProps<{
    /**
     * 弹窗标题
     * @default ''
     */
    title?: string;

    /**
     * 背景层颜色
     * @default 'color-mix(in oklab, black, transparent)'
     */
    backgroundColor?: string;

    /**
     * 无缝模式，即没有背景层、用户可直接与后方网页交互
     * @default false
     */
    seamless?: boolean;

    /**
     * 点击背景层是否自动关闭弹窗
     * @default true
     */
    backdropDismiss?: boolean;

    /**
     * 弹窗整体的z-index层级
     * 如果未提供，将使用z-index管理器自动分配
     * @default undefined
     */
    zIndex?: number;
}>();

// emits
const emit = defineEmits<{
    dismiss: []
}>();

// model
// 作为boolean类型的prop，vue会自动补全缺省值为false，因此不会出现undefined值
const visible = defineModel<boolean>() as Ref<boolean>;

// expose
defineExpose({ show, hide });

// 创建popup
const popupId = manager.newPopup({

});

// 动态z-index管理
const dynamicZIndex = propZIndex ?? zIndexManager.getNextZIndex();

const containerCssText = buildCssText({
    'z-index': dynamicZIndex.toString(),
});
const backdropCssText = buildCssText({
    'z-index': dynamicZIndex.toString(),
    'background-color': backgroundColor ?? 'color-mix(in oklab, black, transparent)',
});

// 当弹窗可见时使网页无法滚动
let beforeShow = {
    scrollTop: 0,
    scrollLeft: 0,
};
watch(visible, val => {
    const target = (document.scrollingElement ?? document.body.parentElement) as HTMLElement;
    beforeShow.scrollTop = target.scrollTop;
    beforeShow.scrollLeft = target.scrollLeft;
    target.style.overflow = val ? 'hidden' : '';
    target.scrollTop = beforeShow.scrollTop;
    target.scrollLeft = beforeShow.scrollLeft;
}, { immediate: true });

function hide() {
    visible.value = false;
}

function show() {
    visible.value = true;
}

function dismiss() {
    hide();
    emit('dismiss');
}
</script>

<template>
    <div v-show="visible">
        <!-- 背景层 -->
        <div v-show="!seamless"
            class="backdrop"
            :style="backdropCssText"
            @click="backdropDismiss && dismiss()"
        ></div>

        <!-- 主要内容 -->
        <div class="main" :style="containerCssText">
            <Card
                :pt:root:class="'border-solid border border-gray-600'"
                :pt:body:class="'w-full h-full'"
                :pt:content:class="'w-full h-full overflow-auto'"
                v-bind="$attrs"
            >
                <template #title>
                    <div class="flex items-center justify-between">
                        <span>{{ title }}</span>
                        <Button icon="pi pi-times" variant="text" @click="dismiss" />
                    </div>
                </template>

                <template #content>
                    <slot></slot>
                </template>
            </Card>
        </div>
    </div>
</template>

<style scoped>
    .backdrop {
        position: fixed;
        margin: 0;
        border: 0;
        padding: 0;
        left: 0;
        top: 0;
        width: 100vw;
        height: 100vh;
    }

    .main {
        position: fixed;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0;
        border: 0;
        padding: 0;
        left: 0;
        top: 0;
        width: 100vw;
        height: 100vh;
        pointer-events: none;
    }

    .main > * {
        pointer-events: auto;
    }
</style>

