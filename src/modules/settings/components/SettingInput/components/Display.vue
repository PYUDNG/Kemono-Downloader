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
    onClick?: (e: PointerEvent) => any;
}>();

const text = defineModel<string>();

const noDisplayValue = computed(() => typeof props.displayValue === 'undefined');
const displayValue = computed({
    get: () => noDisplayValue.value ? text.value : props.displayValue,
    set: val => noDisplayValue.value ? (text.value = val) : eggExpectedModification(),
});
</script>

<template>
    <!-- 使用隐藏的checkbox与外层label关联触发，同时使用div展示文字 -->
    <input class="hidden" type="checkbox" @click="onClick">
    <div
        v-bind="$attrs"
        class="text-surface-500 dark:text-surface-400 truncate"
        :title="displayValue"
    >{{ displayValue }}</div>
</template>