<script setup lang="ts">
import InputText from '@/volt/InputText.vue';
import { computed } from 'vue';
import { eggExpectedModification } from './utils';

defineEmits<{
    focus: [e: Event];
    blur: [e: Event];
}>();

const props = defineProps<{
    displayValue?: any;
}>();
const noDisplayValue = computed(() => typeof props.displayValue === 'undefined');
const displayValue = computed({
    get: () => noDisplayValue.value ? text.value : props.displayValue,
    set: val => noDisplayValue.value ? (text.value = val) : eggExpectedModification(),
});

const text = defineModel<string>();
</script>

<template>
    <InputText
        v-model="displayValue" type="text"
        @click="e => e.stopPropagation()"
        @focus="e => $emit('focus', e)"
        @blur="e => $emit('blur', e)"
    />
</template>