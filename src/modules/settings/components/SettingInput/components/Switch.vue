<script setup lang="ts">
import ToggleSwitch from '@/volt/ToggleSwitch.vue';

const status = defineModel<boolean>();

defineEmits<{
    focus: [e: Event];
    blur: [e: Event];
}>();
</script>

<template>
    <ToggleSwitch
        v-model="status"
        @mouseenter="(e: Event) => $emit('focus', e)"
        @mouseleave="(e: Event) => $emit('blur', e)"
    />
</template>