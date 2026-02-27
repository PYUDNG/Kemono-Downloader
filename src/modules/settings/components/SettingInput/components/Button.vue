<script setup lang="ts">
import { computed } from 'vue';
import { eggExpectedModification } from './utils';
import Button from '@/volt/Button.vue';

defineEmits<{
    focus: [e: Event];
    blur: [e: Event];
}>();

const props = defineProps<{
    displayValue?: any;
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
    <Button
        :label="displayValue"
        :icon="icon"
        @click="e => (e.stopPropagation(), onClick?.(e))"
        @mouseenter="e => $emit('focus', e)"
        @mouseleave="e => $emit('blur', e)"
    />
</template>