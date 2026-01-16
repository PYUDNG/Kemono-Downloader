<script setup lang="ts">
import { computed, useAttrs } from 'vue';
import Text from './components/Text.vue';
import Number from './components/Number.vue';
import Switch from './components/Switch.vue';
import Select from './components/Select.vue';

// props
const { type, props } = defineProps<{
    /** 设置项类型 */
    type: CompType,
    /** 需要向设置项编辑组件额外传递的props */
    props?: Record<string, any>
}>();

// 向下透传的model
const model = defineModel<any>();

// 根据`type`决定展示哪个组件
const componentsMap = {
    text: Text,
    number: Number,
    switch: Switch,
    select: Select,
};
/** 可用的组件类型 */
export type CompType = keyof typeof componentsMap;
const component = computed(() => {
    return componentsMap[type as CompType];
});
</script>

<template>
    <component v-model="model" :is="component" v-bind="props ?? {}" />
</template>