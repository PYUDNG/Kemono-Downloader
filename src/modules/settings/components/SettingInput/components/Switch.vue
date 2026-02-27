<script setup lang="ts">
import ToggleSwitch from '@/volt/ToggleSwitch.vue';
import { computed } from 'vue';
import { eggExpectedModification } from './utils';

const status = defineModel<boolean>();

const props = defineProps<{
    displayValue?: any;
}>();
const noDisplayValue = computed(() => typeof props.displayValue === 'undefined');
const displayValue = computed({
    get: () => noDisplayValue.value ? status.value : props.displayValue,
    set: val => noDisplayValue.value ? (status.value = val) : eggExpectedModification(),
});

defineEmits<{
    focus: [e: Event];
    blur: [e: Event];
}>();
</script>

<template>
    <ToggleSwitch
        v-model="displayValue"
        @mouseenter="(e: Event) => $emit('focus', e)"
        @mouseleave="(e: Event) => $emit('blur', e)"
    />
</template>