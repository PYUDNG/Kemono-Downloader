<script setup lang="ts">
import Select from '@/volt/Select.vue';
import { useAttrs } from 'vue';

const value = defineModel<string>();
const attrs = useAttrs();
console.log(attrs);
</script>

<template>
    <Select appendTo="self" v-model="value" v-bind="$attrs" />
</template>