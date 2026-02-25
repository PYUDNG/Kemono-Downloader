<script setup lang="ts">
export type ExtraCaption = string | {
    text: string;
    props?: Record<string, any>;
}

// props
const {
    label,
    caption,
    icon,

    /** 左侧区域默认宽度 */
    leftClass = "w-12",

    /** 中间区域默认占满剩余空间 */
    centerClass = "flex-1",

    /** 右侧区域默认宽度 */
    rightClass = "w-32",

    extras = [],
    disabled = false,
    hidden = false,
} = defineProps<{
    label: string;
    caption?: string;

    /** PrimeIcons 类名（不带 "pi" 前缀），如 "pi-home" 只需传 "home" */
    icon?: string;

    /** 左侧区域自定义类名 */
    leftClass?: string;

    /** 中间区域自定义类名 */
    centerClass?: string;

    /** 右侧区域自定义类名 */
    rightClass?: string;

    /** 额外caption文字 */
    extras?: ExtraCaption[],

    /** 禁用状态 */
    disabled?: boolean;

    /** 隐藏状态 */
    hidden?: boolean;
}>();
</script>

<template>
    <label
        class="flex flex-row items-center hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors relative"
        :class="{ hidden, 'pointer-events-none': disabled }"
    >
        <!-- 左侧区域（仅在需要时显示） -->
        <div v-if="icon || $slots.left" :class="['flex items-center px-3 py-2', leftClass]">
            <!-- 左侧图标或自定义内容插槽 -->
            <div class="flex justify-center items-center w-full">
                <slot name="left">
                    <!-- 默认图标显示 - 使用 PrimeIcons -->
                    <i v-if="icon" :class="`pi pi-${icon}`" class="text-lg" />
                </slot>
            </div>
        </div>

        <!-- 文字区域（总是显示） -->
        <div :class="['flex flex-row items-center min-w-0 grow shrink', centerClass]">
            <!-- 左侧主要区域：文字 -->
            <div class="flex flex-col px-3 py-2 justify-center grow" :class="{ 'brightness-80': disabled, 'grayscale-50': disabled }">
                <div :title="label" class="text-base truncate">{{ label }}</div>
                <div v-if="caption" :title="caption" class="text-sm text-surface-500 dark:text-surface-400 line-clamp-2">
                    {{ caption }}
                </div>
                <div v-for="ex of extras"
                    class="text-sm"
                    v-bind="typeof ex === 'object' ? ex.props ?? {} : {}"
                >{{ typeof ex === 'string' ? ex : ex.text }}</div>
            </div>

            <!-- 右侧区域：附加插槽（仅在需要时显示） -->
            <div v-if="$slots['text-extension']" class="flex flex-row px-3 py-2 w-fit grow-0">
                <slot name="text-extension" />
            </div>
        </div>

        <!-- 右侧内容插槽（仅在需要时显示） -->
        <div v-if="$slots.right" :class="['px-3 py-2 min-w-fit', rightClass]">
            <div class="flex justify-end items-center w-full" :class="{ 'brightness-80': disabled, 'grayscale': disabled }">
                <slot name="right" />
            </div>
        </div>

        <!-- 禁用状态展示遮罩 -->
        <div
            v-show="disabled"
            class="absolute left-0 right-0 top-0 bottom-0 cursor-not-allowed pointer-events-auto"
            @click.capture="e => { e.stopImmediatePropagation(); e.preventDefault(); }"
        ></div>
    </label>
</template>
