<script setup lang="ts">
import ToggleSwitch from '@/volt/ToggleSwitch.vue';

const status = defineModel<boolean>();
</script>

<template>
    <ToggleSwitch v-model="status" />
</template>