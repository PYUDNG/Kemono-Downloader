<script setup lang="ts">
import { computed, getCurrentInstance, reactive, ref, Ref, UnwrapNestedRefs, watch } from 'vue';
import { DisabledGUI, SettingItem } from '../types';
import ListItem, { ExtraCaption } from '@/components/ListItem.vue';
import { deepEqual, getIsMobileLayout, Nullable } from '@/utils/main';
import { useI18n } from 'vue-i18n';
import SettingInput from './SettingInput/SettingInput.vue';
import { globalStorage } from '@/storage';
import Dialog from '@/volt/Dialog.vue';
import SecondaryButton from '@/volt/SecondaryButton.vue';
import Button from '@/volt/Button.vue';
import { i18nKeys } from '@/i18n/utils';
import AngleRightIcon from '~icons/prime/angle-right'
import TimesIcon from '~icons/prime/times'
import CheckIcon from '~icons/prime/check'
import QuestionCircleIcon from '~icons/prime/question-circle'

const { t } = useI18n();
const storage = globalStorage.withKeys('settings');

const $gui = i18nKeys.$settings.$gui;

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
            text: t(i18nKeys.$settings.$gui.$reloadToApply),
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
const instance = getCurrentInstance();
const overlayParent = computed(() => instance?.root.vnode.el?.parentElement as Nullable<HTMLElement>);

// help text展示逻辑
const helpVisible = ref(false);
const toggleHelpText = () => helpVisible.value ? hideHelpText() : showHelpText();
const showHelpText = () => helpVisible.value = true;
const hideHelpText = () => helpVisible.value = false;
const helpOnInput = ref(storage.get('helpOnInput'));
watch(helpOnInput, val => storage.set('helpOnInput', val));

// 以下元素移动端界面下不使用Dialog弹出展示，直接展示在设置条目中
const noMobilePopup = computed(() => ['switch', 'button'].includes(item.type));

// 宽度较小时展示移动端界面：不直接展示输入元素，而是点击设置项条目后弹窗输入
const useMobileLayout = getIsMobileLayout();
const inputVisible = ref(false);
const dialogParent = computed(() => getCurrentInstance()?.root.vnode.el?.parentElement);

// 移动端界面下，弹窗展示输入元素，并仅在用户点击确定按钮后才将修改写入存储
const tempVal = ref<typeof item.value>(item.value);
const submitVal = () => {
    inputVisible.value = false;
    item.value = tempVal.value;
}
const resetVal = () => {
    inputVisible.value = false;
    tempVal.value = item.value;
}
/**
 * 展示在移动端UI的">"左侧的当前值
 */
const itemValStr = computed<string>(() => {
    switch (item.type) {
        case 'text': return item.value;
        case 'number': return item.value.toString();
        case 'switch': return t($gui.$valueString.$switch[item.value ? '$true' : '$false']);
        case 'select': return item.props!.options.find((val: any) => val[item.props!.optionValue] === item.value)![item.props!.optionLabel];
        case 'button': return item.value;
    }
});
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
        :right-class="{ 'min-w-fit': !useMobileLayout, 'max-w-[30%]': true, 'min-w-8': useMobileLayout }"
        @click="inputVisible = true"
    >
        <!-- 右侧输入元素 -->
        <template #right>
            <!-- 非移动端界面，直接展示元素 -->
            <SettingInput v-if="!useMobileLayout"
                v-model="item.value"
                :type="item.type"
                :props="item.props"
                :display-value="status.display"
                :use-mobile-layout="useMobileLayout"
                :item="item"
            />
            <div v-else class="flex flex-row text-surface-500 dark:text-surface-400 shrink w-full">
                <!-- 移动端界面 -->
                <!-- 直接展示元素 -->
                <SettingInput v-if="noMobilePopup"
                    v-model="item.value"
                    :type="item.type"
                    :props="item.props"
                    :display-value="status.display"
                    :use-mobile-layout="useMobileLayout"
                    :item="item"
                />

                <!-- 弹窗展示元素 -->
                <template v-else>
                    <!-- 当前值预览 -->
                    <span class="text-sm grow shrink truncate">{{ itemValStr }}</span>
                    <!-- 小图标: ">" -->
                    <AngleRightIcon class="flex flex-row justify-center items-center shrink-0 grow-0"/>

                    <!-- 弹窗 -->
                    <Dialog
                        v-if="dialogParent"
                        v-model:visible="inputVisible"
                        :append-to="dialogParent"
                        :header="item.label"
                        pt:root:class="w-full h-full"
                        pt:content:class="w-full h-full"
                        modal dismissable-mask
                    >
                        <!-- 弹窗内容 -->
                        <div class="flex flex-col gap-5">
                            <!-- 上方展示caption（如果有） -->
                            <div v-if="item.caption">{{ item.caption }}</div>
                            <!-- 输入元素 -->
                            <SettingInput
                                v-model="tempVal"
                                :type="item.type"
                                :props="item.props"
                                :display-value="status.display"
                                :use-mobile-layout="useMobileLayout"
                                :item="item"
                            />
                            <!-- 下方展示help（如果有） -->
                            <div v-if="item.help">
                                <div v-if="typeof item.help === 'string'" v-html="item.help" />
                                <Component v-else :is="item.help" />
                            </div>
                        </div>

                        <!-- 底栏按钮 -->
                        <template #footer>
                            <SecondaryButton
                                :variant="useMobileLayout ? undefined : 'text'"
                                :label="t($gui.$mobileDialog.$cancel)"
                                :pt:root:class="{ grow: useMobileLayout }"
                                @click="resetVal"
                            >
                                <template #icon>
                                    <TimesIcon />
                                </template>
                            </SecondaryButton>
                            <Button
                                :variant="useMobileLayout ? undefined : 'text'"
                                :label="t($gui.$mobileDialog.$ok)"
                                :pt:root:class="{ grow: useMobileLayout }"
                                @click="submitVal"
                            >
                                <template #icon>
                                    <CheckIcon />
                                </template>
                            </Button>
                        </template>
                    </Dialog>
                </template>
            </div>
        </template>

        <!-- 文字区域右侧按钮 -->
        <template v-if="item.help && !useMobileLayout" #text-extension>
            <div
                class="cursor-pointer p-2 text-xl"
                @click="toggleHelpText"
            >
                <QuestionCircleIcon />
            </div>
            <Dialog
                v-if="overlayParent"
                v-model:visible="helpVisible"
                :append-to="overlayParent"
                :header="t(i18nKeys.$settings.$gui.$helpHeader, { name: item.label })"
                pt:root:class="border-solid border-1 border-surface-200 dark:border-surface-700"
            >
                <template #default>
                    <div v-if="typeof item.help === 'string'" v-html="item.help" />
                    <Component v-else :is="item.help" />
                </template>
            </Dialog>
        </template>
    </ListItem>
</template>