<script setup lang="ts">
import InputText from '@/volt/InputText.vue';

const text = defineModel<string>();
</script>

<template>
    <InputText v-model="text" type="text"></InputText>
</template>