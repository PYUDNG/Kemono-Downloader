<script setup lang="ts">
import Select from '@/volt/Select.vue';

const value = defineModel<string>();

defineEmits<{
    focus: [e: Event];
    blur: [e: Event];
}>();
</script>

<template>
    <Select
        :appendTo="'self'"
        v-model="value"
        v-bind="$attrs"
        @mouseenter="(e: Event) => $emit('focus', e)"
        @mouseleave="(e: Event) => $emit('blur', e)"
    />
</template>