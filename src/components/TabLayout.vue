<script setup lang="ts">
import { getLayoutRef } from '@/utils/main';
import { computed, Ref } from 'vue';

// props
const {
    layout = 'auto'
} = defineProps<{
    /**
     * 横向/纵向布局  
     * auto = 宽 > 高 ? 横向 : 纵向
     * @default 'auto'
     */
    layout?: 'vertical' | 'horizontal' | 'auto'
}>();
const autoLayout = getLayoutRef();
const actualLayout: Ref<'vertical' | 'horizontal'> = computed(() =>
    layout !== 'auto' ? layout : autoLayout.value
);

type LayoutVal = Record<typeof actualLayout.value, string>
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
})
</script>

<template>
    <div class="flex rounded-md border border-surface-700" :class="layoutClasses">
        <div class="grow-0 shrink-0 border-surface-700" :class="tabClasses">
            <slot name="tab"></slot>
        </div>
        <div class="shrink grow">
            <slot name="content"></slot>
        </div>
    </div>
</template>