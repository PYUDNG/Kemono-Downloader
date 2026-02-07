<script setup lang="ts">
import Button from '@/volt/Button.vue';
import { logger as globalLogger } from './utils/main';
import InputText from './volt/InputText.vue';
import SecondaryButton from './volt/SecondaryButton.vue';
import Dialog from '@/volt/Dialog.vue';
import { ref, useTemplateRef } from 'vue';

const logger = globalLogger.withPath('App');
const visible = ref(true);
const dialog = useTemplateRef('dialog');
const appendTo = document.querySelector('#test-dialog-host')?.shadowRoot?.querySelector('#test-dialog-app');
console.log('appendTo', appendTo);

function cancel() {
    logger.simple('Info', 'Cancel');
    dialog.value?.hide();
}

function save() {
    logger.simple('Info', 'Save');
    dialog.value?.hide();
}
</script>

<template>
    <Dialog v-model:visible="visible" modal header="Edit Profile" class="sm:w-100 w-9/10" :append-to="'self'">
        <span class="text-surface-500 dark:text-surface-400 block mb-8">Update your information.</span>
        <div class="flex items-center gap-4 mb-4">
            <label for="username" class="font-semibold w-24">Username</label>
            <InputText id="username" class="flex-auto" autocomplete="off" />
        </div>
        <div class="flex items-center gap-4 mb-8">
            <label for="email" class="font-semibold w-24">Email</label>
            <InputText id="email" class="flex-auto" autocomplete="off" />
        </div>
        <div class="flex justify-end gap-2">
            <SecondaryButton type="button" label="Cancel" @click="cancel" />
            <Button type="button" label="Save" @click="save" />
        </div>
    </Dialog>
</template>

<style scoped>
</style>

