<script setup lang="ts">
import Dialog from '@/components/Dialog.vue';
import ListBox from '@/volt/ListBox.vue';
import Splitter from '@/volt/Splitter.vue';
import SplitterPanel from 'primevue/splitterpanel';
import { computed, Ref, ref } from 'vue';
import { SettingModule } from './types';
import TabPanels from '@/components/TabPanels/TabPanels.vue';
import TabPanel from '@/components/TabPanels/TabPanel.vue';
import SettingInput from './components/SettingInput/SettingInput.vue';
import ListItem from '@/components/ListItem.vue';
import SelectButton from '@/volt/SelectButton.vue';
import TabLayout from '@/components/TabLayout.vue';
import { getLayoutRef } from '@/utils/main';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

// props
const { modules } = defineProps<{
    modules: Ref<SettingModule[]>,
}>();
console.log(modules);

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
                        <TabPanel v-for="module of modules.value" :name="module.id" class="w-full">
                            <div class="flex flex-col">
                                <ListItem
                                    v-for="(item, i) of module.items"
                                    :key="i"
                                    :label="item.label"
                                    :caption="item.caption"
                                    :icon="item.icon"
                                    right-class="w-48"
                                >
                                    <!-- 仅当有右侧内容时才显示 -->
                                    <template v-if="item.type" #right>
                                        <SettingInput v-model="item.value" :type="item.type" class="max-w-full max-h-full" />
                                    </template>
                                </ListItem>
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