<script setup lang="ts">
import { computed } from 'vue';
import Text from './components/Text.vue';
import Number from './components/Number.vue';
import Switch from './components/Switch.vue';

// props
const { type } = defineProps<{
    type: CompType,
}>();

// 向下透传的model
const model = defineModel<any>();

// 根据`type`决定展示哪个组件
const componentsMap = {
    text: Text,
    number: Number,
    switch: Switch,
};
/** 可用的组件类型 */
export type CompType = keyof typeof componentsMap;
const component = computed(() => {
    return componentsMap[type as CompType];
});
</script>

<template>
    <component v-model="model" :is="component" />
</template>