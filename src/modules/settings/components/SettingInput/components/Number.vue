<script setup lang="ts">
import InputNumber from '@/volt/InputNumber.vue';
import { computed, UnwrapNestedRefs } from 'vue';
import { eggExpectedModification } from './utils';
import { SettingItem } from '@/modules/settings/types';

const number = defineModel<number>();

const props = defineProps<{
    item: UnwrapNestedRefs<SettingItem>;
    displayValue?: any;
    useMobileLayout?: boolean;
}>();
const noDisplayValue = computed(() => typeof props.displayValue === 'undefined');
const displayValue = computed({
    get: () => noDisplayValue.value ? number.value : props.displayValue,
    set: val => noDisplayValue.value ? (number.value = val) : eggExpectedModification(),
});

defineEmits<{
    focus: [e: Event];
    blur: [e: Event];
}>();
</script>

<template>
    <InputNumber
        v-model.lazy="displayValue"
        :useGrouping="false"
        fluid
        @mouseenter="(e: Event) => $emit('focus', e)"
        @mouseleave="(e: Event) => $emit('blur', e)"
    />
</template>