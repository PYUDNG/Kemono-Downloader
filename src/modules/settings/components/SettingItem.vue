<script setup lang="ts">
import { computed, reactive, ref, Ref, UnwrapNestedRefs, useTemplateRef, watch } from 'vue';
import { DisabledGUI, SettingItem } from '../types';
import ListItem, { ExtraCaption } from '@/components/ListItem.vue';
import { deepEqual, Nullable } from '@/utils/main';
import { useI18n } from 'vue-i18n';
import SettingInput from './SettingInput/SettingInput.vue';
import { globalStorage } from '@/storage';
import Dialog from '@/volt/Dialog.vue';

const { t } = useI18n();
const storage = globalStorage.withKeys('settings');

const { item } = defineProps<{
    item: UnwrapNestedRefs<SettingItem>;
}>();

/** 每一条设置的UI相关状态信息 */
type SettingStatus = {
    /** 最初渲染时该设置项的初始值 */
    initVal: any;
    /** 当前值是否和初始值不同 */
    modified: Ref<boolean>;
    /** 需要额外显示的文本 */
    extras: Ref<ExtraCaption[]>;
    /** 覆盖显示模型值的UI值 */
    display: Ref<ExtraCaption[]>;
};

const status = reactive<SettingStatus>((() => {
    const initVal = item.value;
    const modified = computed(() => !deepEqual(item.value, initVal));
    const extras = computed(() => {
        const extras: ExtraCaption[] = [];
        isDisabledGUI(item.disabled) && extras.push(dgui2ecpt(item.disabled));
        item.reload && modified.value && extras.push({
            text: t('settings.gui.reload-to-apply'),
            props: {
                class: 'text-primary-700 dark:text-primary-300',
            },
        });
        return extras;
    });
    const display = computed(() => isDisabledGUI(item.disabled) ? item.disabled.value : undefined);
    return { initVal, modified, extras, display };

    /**
     * 判断传入值是不是DisabledGUI
     */
    function isDisabledGUI(val: boolean | DisabledGUI | undefined): val is DisabledGUI {
        return typeof val === 'string' ||
            (typeof val === 'object' && val !== null && Object.hasOwn(val, 'text'));
    }

    /**
     * 将DisabledGUI转换为ExtraCaption
     */
    function dgui2ecpt(ui: DisabledGUI): ExtraCaption {
        return ui;
    }
}) ());

// help overlay元素位置
// 不能直接设置为'self'，因为祖先元素中存在relative定位元素会干扰overlay定位
const icon = useTemplateRef('icon');
const overlayParent = computed(() => icon.value?.closest('[data-v-app]') as Nullable<HTMLElement>);

// help text展示逻辑
const helpVisible = ref(false);
const toggleHelpText = () => helpVisible.value ? hideHelpText() : showHelpText();
const showHelpText = () => helpVisible.value = true;
const hideHelpText = () => helpVisible.value = false;
const helpOnInput = ref(storage.get('helpOnInput'));
watch(helpOnInput, val => storage.set('helpOnInput', val));
</script>

<template>
    <ListItem
        v-show="!item.hidden"
        :disabled="!!item.disabled"
        :hidden="item.hidden"
        :label="item.label"
        :caption="item.caption"
        :icon="item.icon"
        :extras="status.extras"
        right-class="w-48"
    >
        <!-- 右侧按钮 -->
        <template #right>
            <SettingInput
                v-model="item.value"
                :type="item.type"
                :props="item.props"
                :display-value="status.display"
            />
        </template>

        <!-- 文字区域右侧按钮 -->
        <template v-if="item.help" #text-extension>
            <i
                ref="icon"
                class="pi pi-question-circle cursor-pointer"
                @click="toggleHelpText"
            />
            <Dialog
                v-if="overlayParent"
                v-model:visible="helpVisible"
                :append-to="overlayParent"
                :header="t('settings.gui.help-header', { name: item.label })"
                position="left"
                pt:root:class="border-solid border-1 border-surface-100 dark:border-surface-800"
            >
                <template #default>
                    <div v-if="typeof item.help === 'string'" v-html="item.help" />
                    <Component v-else :is="item.help" />
                </template>
            </Dialog>
        </template>
    </ListItem>
</template>