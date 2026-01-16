<script setup lang="ts">
import Dialog from '@/components/Dialog.vue';
import ListBox from '@/volt/ListBox.vue';
import { computed, markRaw, Ref, ref, UnwrapNestedRefs } from 'vue';
import { SettingModule, SettingItem } from './types';
import TabPanels from '@/components/TabPanels/TabPanels.vue';
import TabPanel from '@/components/TabPanels/TabPanel.vue';
import SettingInput from './components/SettingInput/SettingInput.vue';
import ListItem, { ExtraCaption } from '@/components/ListItem.vue';
import SelectButton from '@/volt/SelectButton.vue';
import TabLayout from '@/components/TabLayout.vue';
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
const visible = ref(true);

/** 横/竖版布局 */
const layout = getLayoutRef(1.2);

/** 每一条设置的UI相关状态信息 */
type SettingStatus = {
    /** 最初渲染时该设置项的初始值 */
    initVal: any,
    /** 当前值是否和初始值不同 */
    modified: Ref<boolean>,
    /** 需要额外显示的文本 */
    extras: Ref<ExtraCaption[]>,
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


const backdropDismiss = import.meta.env.PROD;

defineExpose({ visible });
</script>

<template>
    <Dialog v-model="visible" :title="t('settings.gui.title')" :backdrop-dismiss="backdropDismiss">
        <TabLayout class="w-[80vw] h-[80vh]" :layout="layout">
            <template #tab>
                <component v-if="options.length"
                    :is="layout === 'vertical' ? SelectButton : ListBox"
                    v-model="moduleId"
                    :options="options"
                    option-label="name"
                    option-value="id"
                    class="w-full h-full"
                    pt:option:class="justify-center min-w-36"
                    :pt:root:class="[
                        layout === 'vertical' ? 'rounded-b-none' : 'rounded-r-none',
                        'border-none'
                    ]"
                />
            </template>
            <template #content>
                <div class="p-2 w-full h-full">
                    <TabPanels :name="moduleId">
                        <TabPanel v-for="module of modules.value" :name="module.id" class="w-full h-full">
                            <div class="flex flex-col w-full h-full">
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
                    </TabPanels>
                </div>
            </template>
        </TabLayout>
    </Dialog>
</template>