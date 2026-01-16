<script setup lang="ts">
import InputNumber from '@/volt/InputNumber.vue';

const number = defineModel<number>();
</script>

<template>
    <InputNumber v-model="number" />
</template>