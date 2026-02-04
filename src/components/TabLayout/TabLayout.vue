<script setup lang="ts">
import { getLayoutRef } from '@/utils/main';
import { computed, provide, ref } from 'vue';
import SelectButton from '@/volt/SelectButton.vue';
import ListBox from '@/volt/ListBox.vue';
import { keyName, keyNames } from './utils';

// 使用 defineModel 简化 v-model 处理
const selectedTab = defineModel<string | null>('modelValue', { default: null });

// props
const {
    layout = 'auto',
    options,
    optionLabel = 'label',
    optionValue = 'value'
} = defineProps<{
    /**
     * 横向/纵向布局  
     * auto = 宽 > 高 ? 横向 : 纵向
     * @default 'auto'
     */
    layout?: 'vertical' | 'horizontal' | 'auto',
    /**
     * tab选项数组
     */
    options?: any[],
    /**
     * 选项标签字段名
     * @default 'label'
     */
    optionLabel?: string,
    /**
     * 选项值字段名
     * @default 'value'
     */
    optionValue?: string
}>();

// 布局逻辑
const autoLayout = getLayoutRef();
const actualLayout = computed(() =>
    layout !== 'auto' ? layout : autoLayout.value
);

type LayoutVal = Record<'vertical' | 'horizontal', string>
const layoutClasses = computed(() => {
    const obj: LayoutVal = {
        vertical: 'flex-col',
        horizontal: 'flex-row',
    };
    return obj[actualLayout.value];
});
const tabClasses = computed(() => {
    const obj: LayoutVal = {
        vertical: 'w-full border-b',
        horizontal: 'h-full border-r',
    };
    return obj[actualLayout.value];
});

// TabPanels相关逻辑
const names = ref<string[]>([]);
provide(keyName, selectedTab);
provide(keyNames, names);

/**
 * 根据当前是否有指定展示的TabPanel确定是否展示placeholder
 */
const placeholder = computed(() => ([null, undefined] as (string | null | undefined)[]).includes(selectedTab.value));
</script>

<template>
    <div class="flex rounded-md border border-surface-300 dark:border-surface-700" :class="layoutClasses">
        <!-- Tab区域 -->
        <div class="grow-0 shrink-0 border-surface-300 dark:border-surface-700" :class="tabClasses">
            <slot name="tab" :selected="selectedTab">
                <!-- 默认tab内容：如果有options则渲染选项列表 -->
                <template v-if="options && options.length">
                    <component
                        :is="actualLayout === 'vertical' ? SelectButton : ListBox"
                        v-model="selectedTab"
                        :options="options"
                        :option-label="optionLabel"
                        :option-value="optionValue"
                        class="w-full h-full"
                        pt:option:class="justify-center min-w-36"
                        :pt:root:class="[
                            actualLayout === 'vertical' ? 'rounded-b-none' : 'rounded-r-none',
                            'border-none'
                        ]"
                    />
                </template>
                <!-- 如果没有options，则使用slot -->
                <slot v-else name="tab-content"></slot>
            </slot>
        </div>

        <!-- 内容区域 -->
        <div class="shrink grow">
            <slot name="content" :selected="selectedTab">
                <!-- 默认内容区域：渲染TabPanel和placeholder -->
                <div class="w-full h-full">
                    <!-- TabPanel插槽 -->
                    <slot></slot>

                    <!-- Placeholder插槽 -->
                    <div v-show="placeholder" class="w-full h-full">
                        <slot name="placeholder"></slot>
                    </div>
                </div>
            </slot>
        </div>
    </div>
</template>

