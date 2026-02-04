<script setup lang="ts">
import { computed, provide, ref } from 'vue';
import { keyName, keyNames } from './utils';

// props
const { name } = defineProps<{
    /** 当前展示的TabPanel名称 */
    name?: string | null,
}>();
const refName = computed(() => name);

const names = ref<string[]>([]);
provide(keyName, refName);
provide(keyNames, names);

/**
 * 根据当前是否有指定展示的TabPanel确定是否展示placeholder
 */
const placeholder = computed(() => ([null, undefined] as (string | null | undefined)[]).includes(name));
</script>

<template>
    <!-- TabPanel插槽 -->
    <slot></slot>
    <!-- Placehoder插槽 -->
    <div v-show="placeholder" class="w-full h-full">
        <slot name="placeholder"></slot>
    </div>
</template>