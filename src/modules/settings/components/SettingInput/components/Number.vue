<script setup lang="ts">
import InputNumber from '@/volt/InputNumber.vue';

const number = defineModel<number>();

defineEmits<{
    focus: [e: Event];
    blur: [e: Event];
}>();
</script>

<template>
    <InputNumber
        v-model="number"
        @mouseenter="(e: Event) => $emit('focus', e)"
        @mouseleave="(e: Event) => $emit('blur', e)"
    />
</template>