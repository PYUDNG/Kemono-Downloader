<script setup lang="ts">
import Select from '@/volt/Select.vue';
import { computed } from 'vue';
import { eggExpectedModification } from './utils';

const value = defineModel<string>();

const props = defineProps<{
    displayValue?: any;
}>();
const noDisplayValue = computed(() => typeof props.displayValue === 'undefined');
const displayValue = computed({
    get: () => noDisplayValue.value ? value.value : props.displayValue,
    set: val => noDisplayValue.value ? (value.value = val) : eggExpectedModification(),
});


defineEmits<{
    focus: [e: Event];
    blur: [e: Event];
}>();
</script>

<template>
    <Select
        :appendTo="'self'"
        v-model="displayValue"
        v-bind="$attrs"
        @mouseenter="(e: Event) => $emit('focus', e)"
        @mouseleave="(e: Event) => $emit('blur', e)"
    />
</template>