<script setup lang="ts">
import { computed, UnwrapNestedRefs } from 'vue';
import { eggExpectedModification } from './utils';
import Button from '@/volt/Button.vue';
import { SettingItem } from '@/modules/settings/types';

defineEmits<{
    focus: [e: Event];
    blur: [e: Event];
}>();

const props = defineProps<{
    item: UnwrapNestedRefs<SettingItem>;
    displayValue?: any;
    useMobileLayout?: boolean;
    onClick?: (e: PointerEvent, ...args: any[]) => any;
    icon?: string;
}>();
const noDisplayValue = computed(() => typeof props.displayValue === 'undefined');
const displayValue = computed({
    get: () => noDisplayValue.value ? label.value : props.displayValue,
    set: val => noDisplayValue.value ? (label.value = val) : eggExpectedModification(),
});

const label = defineModel<string>();
</script>

<template>
    <!-- 此元素在移动端布局下不会弹窗展示 -->
    <Button
        :label="displayValue"
        :icon="icon"
        :variant="useMobileLayout ? 'text' : undefined"
        :pt:label:class="{ truncate: useMobileLayout }"
        @click="e => (e.stopPropagation(), onClick?.(e))"
        @mouseenter="e => $emit('focus', e)"
        @mouseleave="e => $emit('blur', e)"
    />
</template>