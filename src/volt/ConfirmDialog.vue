<template>
    <!-- This is a MODIFIED volt component - so it's not exactly same as that volt provided one -->
    <ConfirmDialog
        unstyled
        :pt="theme"
        :ptOptions="{
            mergeProps: ptViewMerge
        }"
    >
        <template #container="{ message, acceptCallback, rejectCallback }">
            <!-- Header -->
            <div>
                <slot name="header" v-bind="{ message }">
                    <div class="flex items-center justify-between shrink-0 p-5">
                        <span class="font-semibold text-xl">{{ message.header }}</span>
                        <SecondaryButton variant="text" rounded @click="rejectCallback" autofocus>
                            <template #icon>
                                <TimesIcon />
                            </template>
                        </SecondaryButton>
                    </div>
                </slot>
            </div>
            <!-- Content -->
            <div class="overflow-y-auto">
                <slot name="content" v-bind="{ message, html }">
                    <div class="pt-0 px-5 pb-5 flex items-center gap-4">
                        <ExclamationTriangeIcon class="size-6" />
                        <span v-if="html" v-html="message.message"></span>
                        <span v-else>{{ message.message }}</span>
                    </div>
                </slot>
            </div>
            <!-- Footer -->
            <div>
                <slot name="footer" v-bind="{ acceptCallback, rejectCallback }">
                    <div class="pt-0 px-5 pb-5 flex justify-end gap-2">
                        <SecondaryButton @click="rejectCallback" :label="message.rejectProps.label" size="small" />
                        <Button @click="acceptCallback" :label="message.acceptProps.label" size="small" />
                    </div>
                </slot>
            </div>
        </template>
    </ConfirmDialog>
</template>

<script setup lang="ts">
import ExclamationTriangeIcon from '@primevue/icons/exclamationtriangle';
import TimesIcon from '@primevue/icons/times';
import ConfirmDialog, { type ConfirmDialogPassThroughOptions, type ConfirmDialogProps } from 'primevue/confirmdialog';
import { ref } from 'vue';
import Button from './Button.vue';
import SecondaryButton from './SecondaryButton.vue';
import { ptViewMerge } from './utils';

interface Props extends /* @vue-ignore */ ConfirmDialogProps {
    /**
     * 是否将message作为html展示  
     * **如果使用此特性，必须保证数据来源可信，或者经过可信的过滤/转义**
     * @default false;
     */
    html?: boolean;
}
const {
    html = false,
} = defineProps<Props>();

const theme = ref<ConfirmDialogPassThroughOptions>({
    root: `max-h-[90%] max-w-screen rounded-xl
        border border-surface-200 dark:border-surface-700
        bg-surface-0 dark:bg-surface-900
        text-surface-700 dark:text-surface-0 shadow-lg`,
    mask: `bg-black/50 fixed top-0 start-0 w-full h-full`,
    transition: {
        enterFromClass: 'opacity-0 scale-75',
        enterActiveClass: 'transition-all duration-150 ease-[cubic-bezier(0,0,0.2,1)]',
        leaveActiveClass: 'transition-all duration-150 ease-[cubic-bezier(0.4,0,0.2,1)]',
        leaveToClass: 'opacity-0 scale-75'
    }
});
</script>
