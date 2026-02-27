<script setup lang="ts">
import { UnwrapNestedRefs } from 'vue';
import { SettingGroup, SettingItem } from '../types';
import SettingItemComp from './SettingItem.vue';
import { useI18n } from 'vue-i18n';
import AccordionPanel from '@/volt/AccordionPanel.vue';
import AccordionHeader from '@/volt/AccordionHeader.vue';
import AccordionContent from '@/volt/AccordionContent.vue';

const { t } = useI18n();

const props = defineProps<{
    items: UnwrapNestedRefs<SettingItem>[];
    group: SettingGroup;
}>();
</script>

<template>
    <AccordionPanel :value="group.id">
        <AccordionHeader>{{ group.name }}</AccordionHeader>
        <AccordionContent>
            <div class="flex flex-col">
                <!-- 组内设置项 -->
                <SettingItemComp
                    v-for="(item, i) of items"
                    :item="item"
                    :key="i"
                />

                <!-- 当某组没有设置时展示占位内容 -->
                <div v-if="items.length === 0" class="flex justify-center items-center w-full h-full text-base">
                    {{ t('settings.gui.no-items-placeholder') }}
                </div>
            </div>
        </AccordionContent>
    </AccordionPanel>
</template>