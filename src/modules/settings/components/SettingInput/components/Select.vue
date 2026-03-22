<script setup lang="ts">
import Select from '@/volt/Select.vue';
import { computed, getCurrentInstance, UnwrapNestedRefs, useTemplateRef } from 'vue';
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
 * Select 下拉框元素添加的位置
 */
const overlayParent = computed(() => getCurrentInstance()?.root.vnode.el?.parentElement);

defineEmits<{
    focus: [e: Event];
    blur: [e: Event];
}>();

// 点击外层label时展开Select
const select = useTemplateRef('select');
function onClick(e: PointerEvent) {
    // 当鼠标点击的元素不是Select时，模拟点击Select，实现“点击label自动展开Select下拉列表”的效果
    const doc = (e.target as HTMLElement).getRootNode() as ShadowRoot;
    const pointerElement = doc.elementFromPoint(e.clientX, e.clientY);
    const clickingSelect = pointerElement?.contains(select.value?.$el) || (select.value?.$el as undefined | Node)?.contains(pointerElement);
    clickingSelect || select.value?.$el?.click();
}
</script>

<template>
    <!-- 使用隐藏的checkbox与外层label关联触发 -->
    <input class="hidden" type="checkbox" @click.capture="onClick">
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