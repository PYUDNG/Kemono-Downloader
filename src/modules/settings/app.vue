<script setup lang="ts">
import Dialog from '@/volt/Dialog.vue';
import { computed, Ref, ref, UnwrapNestedRefs } from 'vue';
import { SettingModule } from './types';
import TabPanel from '@/components/TabLayout/TabPanel.vue';
import TabLayout from '@/components/TabLayout/TabLayout.vue';
import { getLayoutRef } from '@/utils/main';
import { useI18n } from 'vue-i18n';
import SettingModuleComp from './components/SettingModule.vue';

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

/** 生产环境下反复切换点击，为防止意外关闭界面，设置为不可通过点击背景遮罩关闭Dialog */
const backdropDismiss = import.meta.env.PROD;

defineExpose({ visible });
</script>

<template>
    <Dialog
        v-model:visible="visible"
        :header="t('settings.gui.title')"
        :dismissableMask="backdropDismiss"
        append-to="self"
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
                <SettingModuleComp :module="module"></SettingModuleComp>
            </TabPanel>

            <template #placeholder>
                <div class="flex justify-center items-center w-full h-full">
                    {{ t('settings.gui.tabpanel-placeholder') }}
                </div>
            </template>
        </TabLayout>
    </Dialog>
</template>