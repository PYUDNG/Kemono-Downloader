<script setup lang="ts">
import { computed, inject, onMounted, Ref } from 'vue';
import { keyName, keyNames } from './utils';

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
    return displayName?.value === name;
});
onMounted(() => allNames.value.push(name));
</script>

<template>
    <div :class="{ 'hidden': !visible }">
        <slot></slot>
    </div>
</template>