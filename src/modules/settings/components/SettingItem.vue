<script setup lang="ts">
import { computed, reactive, ref, Ref, UnwrapNestedRefs, useTemplateRef, watch } from 'vue';
import { SettingItem } from '../types';
import ListItem, { ExtraCaption } from '@/components/ListItem.vue';
import { deepEqual, Nullable } from '@/utils/main';
import { useI18n } from 'vue-i18n';
import Popover from '@/volt/Popover.vue';
import SettingInput from './SettingInput/SettingInput.vue';
import ToggleSwitch from '@/volt/ToggleSwitch.vue';
import { globalStorage } from '@/storage';

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
};

const status = reactive<SettingStatus>((() => {
    const initVal = item.value;
    const modified = computed(() => !deepEqual(item.value, initVal));
    const extras = computed(() => {
        const extras: ExtraCaption[] = [];
        typeof item.disabled === 'string' && extras.push(item.disabled);
        item.reload && modified.value && extras.push({
            text: t('settings.gui.reload-to-apply'),
            props: {
                class: 'text-primary-700 dark:text-primary-300',
            },
        });
        return extras;
    });
    return { initVal, modified, extras };
}) ());

// help overlay元素位置
// 不能直接设置为'self'，因为祖先元素中存在relatiive定位元素会干扰overlay定位
const icon = useTemplateRef('icon');
const overlayParent = computed(() => icon.value?.closest('[data-v-app]') as Nullable<HTMLElement>);

// help text切换逻辑
// 鼠标进入图标和popover区域时展示popover，离开时隐藏popover
// 带短时防抖：离开区域后防抖时间内再次进入区域就保持显示，调用显示后防抖时间内忽略隐藏调用
const popover = useTemplateRef('popover');
const DEBOUNCE_TIME = 200;
let hideTimer: Nullable<ReturnType<typeof setTimeout>> = null;
let lastShow: number = 0;
const toggleHelpText = (e: Event, target?: any) => {
    console.trace('toggle', e, target);
    e.stopPropagation();
    popover.value?.toggle(e, target);
}
const showHelpText = (e: Event, target?: any) => {
    hideTimer && clearTimeout(hideTimer);
    console.trace('show', e, target);
    popover.value?.show(e, target);
    lastShow = performance.now();
}
const hideHelpText = () => {
    console.trace('try hide');
    if (performance.now() - lastShow <= DEBOUNCE_TIME) return;
    hideTimer && clearTimeout(hideTimer);
    console.trace('hide');
    hideTimer = setTimeout(
        () => {
            if (performance.now() - lastShow > DEBOUNCE_TIME) {
                console.trace('actual hide');
                popover.value?.hide();
            }
        },
        DEBOUNCE_TIME
    );
}

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
                @focus="e => helpOnInput && showHelpText(e, icon ?? undefined)"
                @blur="helpOnInput && hideHelpText()"
            />
        </template>

        <!-- 文字区域右侧按钮 -->
        <template v-if="item.help" #text-extension>
            <i
                ref="icon"
                class="pi pi-question-circle cursor-pointer"
                @click="(e: PointerEvent) => toggleHelpText(e)"
            />
            <Popover
                v-if="overlayParent"
                ref="popover"
                :append-to="overlayParent"
                pt:root:class="dark:bg-surface-800 bg-surface-100 border-1 border-solid border-surface-200 dark:border-surface-700"
            >
                <div
                    class="flex flex-col dark:bg-surface-800 bg-surface-100"
                    @mousedown="showHelpText"
                >
                    <div class="px-3 py-2" v-html="item.help" />
                    <div class="px-3 py-2 flex flex-row items-center">
                        <span>
                            {{ t('settings.gui.help-on-input') }}
                        </span>
                        <div class="flex flex-row items-center py-2 px-3">
                            <ToggleSwitch v-model="helpOnInput" />
                        </div>
                    </div>
                </div>
            </Popover>
        </template>
    </ListItem>
</template>