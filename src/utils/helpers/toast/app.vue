<script setup lang="ts">
import Toast from '@/volt/Toast.vue';
import { ToastMessageOptions, useToast } from 'primevue';

const toast = useToast();

defineExpose({
    show: (message: ToastMessageOptions) => toast.add(message),
})
</script>

<template>
    <Toast />
</template>