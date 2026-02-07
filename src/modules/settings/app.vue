<script setup lang="ts">
import Dialog from '@/volt/Dialog.vue';
import { computed, Ref, ref, UnwrapNestedRefs } from 'vue';
import { SettingModule, SettingItem } from './types';
import TabPanel from '@/components/TabLayout/TabPanel.vue';
import SettingInput from './components/SettingInput/SettingInput.vue';
import ListItem, { ExtraCaption } from '@/components/ListItem.vue';
import TabLayout from '@/components/TabLayout/TabLayout.vue';
import { deepEqual, getLayoutRef } from '@/utils/main';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

// props
const { modules } = defineProps<{
    modules: Ref<UnwrapNestedRefs<SettingModule[]>>,
}>();

/** 根据传入modules合成ListBox.options */
const options = computed(() => modules.value.map(module => ({
    id: module.id,
    name: module.name,
})));

/** 当前展示的设置模块 */
const moduleId = ref<string>();

/** 设置窗口可见性 */
const visible = ref(false);

/** 横/竖版布局 */
const layout = getLayoutRef(1.2);

/** 每一条设置的UI相关状态信息 */
type SettingStatus = {
    /** 最初渲染时该设置项的初始值 */
    initVal: any;
    /** 当前值是否和初始值不同 */
    modified: Ref<boolean>;
    /** 需要额外显示的文本 */
    extras: Ref<ExtraCaption[]>;
};

/** 生成设置项状态信息 */
const createSettingStatus = (item: UnwrapNestedRefs<SettingItem>) => {
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
};

/** 所有设置项的状态信息 */
const status = modules.value.reduce((acc, module) => {
    acc[module.id] = module.items.reduce((moduleAcc, item) => {
        moduleAcc[item.id] = createSettingStatus(item);
        return moduleAcc;
    }, {} as Record<string, SettingStatus>);
    return acc;
}, {} as Record<string, Record<string, SettingStatus>>)

/** 生产环境下反复切换点击，为防止意外关闭界面，设置为不可通过点击背景遮罩关闭Dialog */
const backdropDismiss = import.meta.env.PROD;

defineExpose({ visible });
</script>

<template>
    <Dialog
        v-model:visible="visible"
        :header="t('settings.gui.title')"
        :dismissableMask="backdropDismiss"
        modal
    >
        <TabLayout 
            class="w-[80vw] h-[80vh]"
            :layout="layout"
            v-model="moduleId"
            :options="options"
            option-label="name"
            option-value="id"
        >
            <TabPanel 
                v-for="module of modules.value" 
                :name="module.id" 
                class="w-full h-full"
            >
                <div class="flex flex-col w-full h-full p-2">
                    <!-- 模块设置项 -->
                    <ListItem
                        v-for="(item, i) of module.items"
                        v-show="!item.hidden"
                        :disabled="!!item.disabled"
                        :hidden="item.hidden"
                        :key="i"
                        :label="item.label"
                        :caption="item.caption"
                        :icon="item.icon"
                        :extras="status[module.id][item.id].extras.value"
                        right-class="w-48"
                    >
                        <!-- 仅当有右侧内容时才显示 -->
                        <template v-if="item.type" #right>
                            <SettingInput
                                v-model="item.value"
                                :type="item.type"
                                :props="item.props"
                            />
                        </template>
                    </ListItem>

                    <!-- 当某模块没有设置时展示占位内容 -->
                    <div v-if="module.items.length === 0" class="flex justify-center items-center w-full h-full">
                        {{ t('settings.gui.no-items-placeholder') }}
                    </div>
                </div>
            </TabPanel>

            <template #placeholder>
                <div class="flex justify-center items-center w-full h-full">
                    {{ t('settings.gui.tabpanel-placeholder') }}
                </div>
            </template>
        </TabLayout>
    </Dialog>
</template>