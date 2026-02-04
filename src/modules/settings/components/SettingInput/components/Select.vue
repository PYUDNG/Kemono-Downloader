<script setup lang="ts">
import Select from '@/volt/Select.vue';

const value = defineModel<string>();
</script>

<template>
    <Select :appendTo="'self'" v-model="value" v-bind="$attrs" />
</template>