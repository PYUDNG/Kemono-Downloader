<script setup lang="ts">
import InputText from '@/volt/InputText.vue';
import { computed, UnwrapNestedRefs } from 'vue';
import { eggExpectedModification } from './utils';
import { SettingItem } from '@/modules/settings/types';

defineEmits<{
    focus: [e: Event];
    blur: [e: Event];
}>();

const props = defineProps<{
    item: UnwrapNestedRefs<SettingItem>;
    displayValue?: any;
    useMobileLayout?: boolean;
}>();
const noDisplayValue = computed(() => typeof props.displayValue === 'undefined');
const displayValue = computed({
    get: () => noDisplayValue.value ? text.value : props.displayValue,
    set: val => noDisplayValue.value ? (text.value = val) : eggExpectedModification(),
});

const text = defineModel<string>();
</script>

<template>
    <InputText v-if="useMobileLayout"
        v-model="displayValue" type="text"
        class="w-full"
        @click="e => e.stopPropagation()"
        @focus="e => $emit('focus', e)"
        @blur="e => $emit('blur', e)"
    />
    <InputText v-else
        v-model="displayValue" type="text"
        class="w-full"
        @click="e => e.stopPropagation()"
        @focus="e => $emit('focus', e)"
        @blur="e => $emit('blur', e)"
    />
</template>