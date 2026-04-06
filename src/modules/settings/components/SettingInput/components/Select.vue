<script setup lang="ts">
import Select from '@/volt/Select.vue';
import { computed, getCurrentInstance, UnwrapNestedRefs, useTemplateRef, watch } from 'vue';
import { eggExpectedModification } from './utils';
import { SettingItem } from '@/modules/settings/types';
import ListBox from '@/volt/ListBox.vue';

const value = defineModel<string>();

const props = defineProps<{
    item: UnwrapNestedRefs<SettingItem>;
    displayValue?: any;
    useMobileLayout?: boolean;
}>();
const noDisplayValue = computed(() => typeof props.displayValue === 'undefined');
const displayValue = computed({
    get: () => noDisplayValue.value ? value.value : props.displayValue,
    set: val => noDisplayValue.value ? (value.value = val) : eggExpectedModification(),
});

/**
 * 当前应用实例
 */
const instance = getCurrentInstance()!;

/**
 * PrimeVue Select
 */
const select = useTemplateRef('select');

/**
 * Select 下拉框元素添加的位置
 */
const overlayParent = computed(() => instance.root.vnode.el?.parentElement);

defineEmits<{
    focus: [e: Event];
    blur: [e: Event];
}>();

// 点击外层label时展开Select下拉列表
const dealedLabels: HTMLLabelElement[] = [];
const addLabelClickListener = () => {
    // 只有当使用Select而不是ListBox时才添加展开Select逻辑
    if (select.value) {
        const selectElm = select.value.$el as HTMLElement;
        const label = selectElm.closest('label')!;

        // 防止对同一个label元素添加多个事件监听器
        if (dealedLabels.includes(label)) return;
        dealedLabels.push(label);

        // 当label接收到点击事件时，如果没有点Select，就自动toggle下拉列表
        label.addEventListener('click', e => {
            // 由于视口大小可能改变，因此可能随时切换到移动端布局，所以在回调内不能假定select存在
            // 如果挂载时(onMounted)并未采用移动端布局，但点击到label时已经切换到移动端布局，此时select.value就是null
            const path = e.composedPath();
            const clickingSelect = path.includes(selectElm);
            clickingSelect || select.value?.show();
        })
    }
};
watch(select, addLabelClickListener, { immediate: true, deep: false });
</script>

<template>
    <!-- 使用隐藏的checkbox与外层label关联触发 -->
    <ListBox v-if="useMobileLayout"
        v-model="displayValue"
        v-bind="$attrs"
        @mouseenter="(e: Event) => $emit('focus', e)"
        @mouseleave="(e: Event) => $emit('blur', e)"
    />
    <Select v-else
        ref="select"
        :appendTo="overlayParent"
        v-model="displayValue"
        v-bind="$attrs"
        @mouseenter="(e: Event) => $emit('focus', e)"
        @mouseleave="(e: Event) => $emit('blur', e)"
    />
</template>