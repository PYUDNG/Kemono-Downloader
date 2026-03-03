<script setup lang="ts">
import Select from '@/volt/Select.vue';
import { computed, getCurrentInstance, UnwrapNestedRefs } from 'vue';
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
</script>

<template>
    <ListBox v-if="useMobileLayout"
        v-model="displayValue"
        v-bind="$attrs"
        @mouseenter="(e: Event) => $emit('focus', e)"
        @mouseleave="(e: Event) => $emit('blur', e)"
    />
    <Select v-else
        :appendTo="overlayParent"
        v-model="displayValue"
        v-bind="$attrs"
        @mouseenter="(e: Event) => $emit('focus', e)"
        @mouseleave="(e: Event) => $emit('blur', e)"
    />
</template>