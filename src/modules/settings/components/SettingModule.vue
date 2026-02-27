<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { SettingModule } from '../types';
import SettingItem from './SettingItem.vue';
import { computed, ref, UnwrapNestedRefs, watch } from 'vue';
import SettingGroup from './SettingGroup.vue';
import Accordion from '@/volt/Accordion.vue';

const { t } = useI18n();

const props = defineProps<{
    module: UnwrapNestedRefs<SettingModule>;
}>();
const module = computed(() => props.module);

/**
 * 从全部设置项中filter出所有给定组的设置项
 * @param groupId 组ID
 */
const filterGroupItems = (groupId: string | undefined) => module.value.items.filter(item => item.group === groupId);

/** 不隶属于任何组的（没有使用分组功能的）设置项列表 */
const standaloneItems = computed(() => filterGroupItems(undefined));
/** 包含各自设置项列表的组列表 */
const groups = computed(() => {
    const rawGroups = (module.value.groups ?? []);
    const groups = rawGroups.map(group => ({
        items: filterGroupItems(group.id),
        group,
    }));
    groups.sort((g1, g2) => g1.group.index - g2.group.index);
    console.log('groups', groups);
    return groups;
});

/**
 * 控制已展开的SettingGroup对应的AccordionPanel
 */
const expandedGroups = ref<string[]>([]);
// 当添加新设置组时，自动展开所有组
watch(groups, (groups, oldGroups) => {
    if (!oldGroups || groups.length > oldGroups.length)
        expandedGroups.value = groups.map(g => g.group.id);
}, { deep: true, immediate: true });
</script>

<template>
    <div class="flex flex-col gap-4 w-full h-full p-2">
        <!-- 未分组的模块设置项 -->
        <SettingItem
            v-for="(item, i) of standaloneItems"
            :item="item"
            :key="i"
        />

        <!-- 分组的模块设置项 -->
        <Accordion :value="expandedGroups" multiple>
            <SettingGroup
                v-for="(group, i) of groups"
                :group="group.group"
                :items="group.items"
                :key="i"
            />
        </Accordion>
        
        <!-- 当某模块没有设置时展示占位内容 -->
        <div v-if="module.items.length === 0" class="flex justify-center items-center w-full h-full">
            {{ t('settings.gui.no-items-placeholder') }}
        </div>
    </div>
</template>