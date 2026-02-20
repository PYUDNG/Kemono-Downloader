<script setup lang="ts">
import InputText from '@/volt/InputText.vue';

defineEmits<{
    focus: [e: Event];
    blur: [e: Event];
}>();

const text = defineModel<string>();
</script>

<template>
    <InputText
        v-model="text" type="text"
        @click="e => e.stopPropagation()"
        @focus="e => $emit('focus', e)"
        @blur="e => $emit('blur', e)"
    />
</template>