<script setup lang="ts">
import { Optional } from '@/utils/main';
import { getCurrentInstance, onMounted, ref, watch } from 'vue';
import SpinnerIcon from '~icons/prime/spinner';

const props = defineProps<{
    /**
     * 加载中状态下，展示加载中图标且不接受点击，不触发点击回调
     */
    loading?: boolean;

    /**
     * 按钮点击回调
     */
    onClick?: (e: PointerEvent) => any;

    /**
     * 按钮的文本
     */
    /**
     * 按钮文本：直接字符串，或返回字符串的getter（getter在渲染/监听时求值，支持随语言切换实时更新）
     */
    label?: string | (() => string);
}>()

const loading = ref(props.loading ?? false);
watch(() => props.loading, val => loading.value = val);
const label = ref(resolveLabel(props));
watch(() => resolveLabel(props), val => label.value = val ?? '');

/**
 * 解析按钮文本：字符串原样返回，getter形式调用求值（调用内部t()时会追踪i18n locale，实现响应式）
 */
function resolveLabel(p: typeof props): string {
    return typeof p.label === 'function' ? p.label() : p.label ?? '';
}
const onClick = ref(props.onClick);
watch(() => props.onClick, val => onClick.value = val);

async function buttonClick(e: PointerEvent) {
    loading.value = true;
    await Promise.resolve(onClick.value?.(e));
    loading.value = false;
}

// button 继承 Shadow DOM 外的样式
// 去除createShadowApp添加的text-base类名即可
const instance = getCurrentInstance();
onMounted(() => {
    const span = instance?.root.vnode.el?.parentElement as Optional<HTMLSpanElement>;
    span?.classList.remove('text-base');
});

defineExpose({ loading, label, onClick });
</script>

<template>
    <SpinnerIcon v-show="loading"
        class="animate-spin brightness-75 cursor-not-allowed"
    />
    <span v-show="!loading"
        class="cursor-pointer"
        @click="buttonClick"
    >{{ label }}</span>
</template>