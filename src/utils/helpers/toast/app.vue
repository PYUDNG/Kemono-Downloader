<script setup lang="ts">
import Toast from '@/volt/Toast.vue';
import { ToastMessageOptions, useToast } from 'primevue';

const toast = useToast();

defineExpose({
    add: (message: ToastMessageOptions) => toast.add(message),
    remove: (message: ToastMessageOptions) => toast.remove(message),
})
</script>

<template>
    <Toast />
</template>