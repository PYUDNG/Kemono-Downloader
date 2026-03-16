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
const visible = computed(() => {
    /*
    return displayName?.value !== undefined ?
        // 如果显式指定了name，则可见性取决于指定的name和自身name是否一致
        displayName?.value === name :
        // 如果没有显式指定name，则allNames数组中的第一个可见
        allNames.value[0] === name;
    */
    // 初始载入且未指定name时，将allNames数组中的第一个设置为可见
    if (displayName?.value === initialKeyName) {
        displayName.value = allNames.value[0];
    }
    return displayName?.value === name;
});
onMounted(() => allNames.value.push(name));
</script>

<template>
    <div :class="{ 'hidden': !visible }" class="w-full h-full">
        <slot></slot>
    </div>
</template>
