<script setup lang="ts">
import { computed, inject, onMounted, Ref } from 'vue';
import { keyName, keyNames, initialKeyName } from './utils';

const { name } = defineProps<{
    /**
     * TabPanel名称，当父级TabPanels的name属性和此名称一致时展示此TabPanels的内容
     */
    name: string,
}>();
const displayName = inject(keyName);
const allNames = inject(keyNames) as Ref<string[]>;
const visible = computed(() => displayName?.value === name);
onMounted(() => {
    allNames.value.push(name);
    // 初始载入且未指定name时，将allNames数组中的第一个设置为可见
    if (displayName?.value === initialKeyName) {
        displayName.value = allNames.value[0];
    }
});
</script>

<template>
    <div :class="{ 'hidden': !visible }" class="w-full h-full">
        <slot></slot>
    </div>
</template>
