<script setup lang="ts">
import InputNumber from '@/volt/InputNumber.vue';
import { computed } from 'vue';
import { eggExpectedModification } from './utils';

const number = defineModel<number>();

const props = defineProps<{
    displayValue?: any;
}>();
const noDisplayValue = computed(() => typeof props.displayValue === 'undefined');
const displayValue = computed({
    get: () => noDisplayValue.value ? number.value : props.displayValue,
    set: val => noDisplayValue.value ? (number.value = val) : eggExpectedModification(),
});

defineEmits<{
    focus: [e: Event];
    blur: [e: Event];
}>();
</script>

<template>
    <InputNumber
        v-model="displayValue"
        @mouseenter="(e: Event) => $emit('focus', e)"
        @mouseleave="(e: Event) => $emit('blur', e)"
    />
</template>