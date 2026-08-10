<script setup lang="ts">
import { computed, UnwrapNestedRefs } from 'vue';
import { eggExpectedModification } from './utils';
import { SettingItem } from '@/modules/settings/types';

defineEmits<{
    focus: [e: Event];
    blur: [e: Event];
}>();

const props = defineProps<{
    item: UnwrapNestedRefs<SettingItem>;
    displayValue?: any;
    useMobileLayout?: boolean;
}>();

const color = defineModel<string>();

const noDisplayValue = computed(() => typeof props.displayValue === 'undefined');
const displayValue = computed({
    get: () => noDisplayValue.value ? color.value : props.displayValue,
    set: val => noDisplayValue.value ? (color.value = val) : eggExpectedModification(),
});
</script>

<template>
    <!-- 原生颜色选择器 -->
    <input
        type="color"
        v-model="displayValue"
        class="h-9 w-12 cursor-pointer rounded-md border border-surface-300 dark:border-surface-600 bg-transparent p-1"
        @click="e => e.stopPropagation()"
        @focus="e => $emit('focus', e)"
        @blur="e => $emit('blur', e)"
    />
</template>
