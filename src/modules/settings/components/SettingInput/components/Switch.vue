<script setup lang="ts">
import ToggleSwitch from '@/volt/ToggleSwitch.vue';
import { computed, UnwrapNestedRefs } from 'vue';
import { eggExpectedModification } from './utils';
import { SettingItem } from '@/modules/settings/types';

const status = defineModel<boolean>();

const props = defineProps<{
    item: UnwrapNestedRefs<SettingItem>;
    displayValue?: any;
    useMobileLayout?: boolean;
}>();
const noDisplayValue = computed(() => typeof props.displayValue === 'undefined');
const displayValue = computed({
    get: () => noDisplayValue.value ? status.value : props.displayValue,
    set: val => noDisplayValue.value ? (status.value = val) : eggExpectedModification(),
});

defineEmits<{
    focus: [e: Event];
    blur: [e: Event];
}>();
</script>

<template>
    <!-- 此元素在移动端布局下不会弹窗展示 -->
    <ToggleSwitch
        v-model="displayValue"
        @mouseenter="(e: Event) => $emit('focus', e)"
        @mouseleave="(e: Event) => $emit('blur', e)"
    />
</template>