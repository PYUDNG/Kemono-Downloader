<script setup lang="ts">
import InputNumber from '@/volt/InputNumber.vue';
import { computed, ref, UnwrapNestedRefs } from 'vue';
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

const innerModel = ref(number.value);

defineEmits<{
    focus: [e: Event];
    blur: [e: Event];
}>();
</script>

<template>
    <InputNumber
        v-model="innerModel"
        @mouseenter="(e: Event) => $emit('focus', e)"
        @mouseleave="(e: Event) => $emit('blur', e)"
        @change="displayValue = innerModel"
    />
</template>