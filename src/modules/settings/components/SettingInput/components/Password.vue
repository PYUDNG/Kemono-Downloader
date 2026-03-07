<script setup lang="ts">
import Password from '@/volt/Password.vue';
import { computed, getCurrentInstance, ref, UnwrapNestedRefs } from 'vue';
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

const text = defineModel<string>();

const noDisplayValue = computed(() => typeof props.displayValue === 'undefined');
const displayValue = computed({
    get: () => noDisplayValue.value ? text.value : props.displayValue,
    set: val => noDisplayValue.value ? (text.value = val) : eggExpectedModification(),
});

const innerModel = ref(text.value);

/**
 * Password feedback 悬浮框元素添加的位置
 */
const overlayParent = computed(() => getCurrentInstance()?.root.vnode.el?.parentElement);
</script>

<template>
    <Password
        v-model="innerModel"
        class="w-full"
        toggle-mask
        :append-to="overlayParent"
        @click="e => e.stopPropagation()"
        @focus="e => $emit('focus', e)"
        @blur="e => $emit('blur', e)"
        :pt:root:onchange="(_e: Event) => displayValue = innerModel"
    />
</template>