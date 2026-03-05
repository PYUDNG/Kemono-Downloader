<script setup lang="ts">
import { computed, UnwrapNestedRefs } from 'vue';
import Text from './components/Text.vue';
import Number from './components/Number.vue';
import Switch from './components/Switch.vue';
import Select from './components/Select.vue';
import Button from './components/Button.vue';
import { SettingItem } from '../../types';
import { ComponentProps } from 'vue-component-type-helpers';
import Password from './components/Password.vue';

// props
const { type, props } = defineProps<{
    /**
     * 设置项类型
     */
    type: CompType;
    /**
     * 当前的设置项对象
     */
    item: UnwrapNestedRefs<SettingItem>;
    /** 需要向设置项编辑组件额外传递的props */
    props?: Record<string, any>;
    /** 
     * 在UI上覆盖展示的模型值  
     * 提供时，此值仅在UI上展示，不影响存储中的实际值  
     * 同时提供此值和模型值时，此值将具备更高优先级从而在UI上优先展示此值  
     * 注意：提供此值时，用户将无法通过UI交互修改实际的模型值（因为UI值已经被固定了）
     */
    displayValue?: any;
    /**
     * 是否采用移动端布局  
     * 采用移动端布局时，设置项输入元素并不直接展示在UI中，而是待用户点击设置项后弹窗展示，因此可以为移动端设计不同的输入元素
     */
    useMobileLayout?: boolean;
}>();

// emits
defineEmits<{
    focus: [e: Event];
    blur: [e: Event];
}>();

// 向下透传的model
const model = defineModel<any>();

// 根据`type`决定展示哪个组件
const componentsMap = {
    text: Text,
    number: Number,
    switch: Switch,
    select: Select,
    button: Button,
    password: Password,
};
/** 可用的组件类型 */
export type CompType = keyof typeof componentsMap;
/** 组件类型-Props类型对照表 */
export type CompProps = {
    [K in CompType]: ComponentProps<typeof componentsMap[K]>
}
const component = computed(() => {
    return componentsMap[type as CompType];
});
</script>

<template>
    <component
        v-model="model"
        :item="item"
        :display-value="displayValue"
        :use-mobile-layout="useMobileLayout"
        :is="component"
        v-bind="props ?? {}"
        @focus="e => $emit('focus', e)"
        @blur="e => $emit('blur', e)"
    />
</template>