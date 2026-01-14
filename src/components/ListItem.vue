<script setup lang="ts">
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
    rightClass = "w-32"
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
}>();
</script>

<template>
    <label class="flex flex-row h-full items-center hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors">
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
        <div :class="['flex flex-col px-3 py-2 justify-center min-w-0 grow shrink', centerClass]">
            <!-- min-w-0 防止文本溢出 -->
            <div :title="label" class="text-base truncate">{{ label }}</div>
            <div v-if="caption" :title="caption" class="text-sm text-surface-500 dark:text-surface-400 line-clamp-2">
                {{ caption }}
            </div>
        </div>

        <!-- 右侧内容插槽（仅在需要时显示） -->
        <div v-if="$slots.right" :class="['px-3 py-2', rightClass]">
            <div class="flex justify-end items-center w-full">
                <slot name="right" />
            </div>
        </div>
    </label>
</template>