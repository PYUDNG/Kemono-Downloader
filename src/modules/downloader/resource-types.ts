import type { Component } from 'vue';
import { i18nKeys } from '@/i18n/utils.js';
import { ResourceTypes } from '@/sites/types.js';
import FileIcon from '~icons/prime/file';
import FolderIcon from '~icons/prime/folder';
import ImageIcon from '~icons/prime/image';
import ServerIcon from '~icons/prime/server';
import HashtagIcon from '~icons/prime/hashtag';

/**
 * 资源类型UI元数据（图标 + 文案key）
 */
export interface ResourceTypeUI {
    icon: Component;
    labelKey: string;
}

/**
 * 核心默认UI元数据：推荐语义类型统一展示  
 * 站点 adapter 应尽量使用推荐类型（自动获得统一图标/文案），自定义类型需自行注册
 */
export const defaultResourceTypeUI: Partial<Record<string, ResourceTypeUI>> = {
    [ResourceTypes.POST]: {
        icon: ImageIcon,
        labelKey: i18nKeys.$downloader.$gui.$taskComponent.$resourceTypes.$post,
    },
    [ResourceTypes.POSTS]: {
        icon: FolderIcon,
        labelKey: i18nKeys.$downloader.$gui.$taskComponent.$resourceTypes.$posts,
    },
    [ResourceTypes.CREATOR]: {
        icon: FileIcon,
        labelKey: i18nKeys.$downloader.$gui.$taskComponent.$resourceTypes.$creator,
    },
    [ResourceTypes.SERVER]: {
        icon: ServerIcon,
        labelKey: i18nKeys.$downloader.$gui.$taskComponent.$resourceTypes.$server,
    },
    [ResourceTypes.CHANNEL]: {
        icon: HashtagIcon,
        labelKey: i18nKeys.$downloader.$gui.$taskComponent.$resourceTypes.$channel,
    },
};

/**
 * 站点注册的自定义/覆盖资源类型UI元数据
 */
const registered: Map<string, ResourceTypeUI> = new Map();

/**
 * 注册资源类型UI元数据（站点 adapter 在模块加载时调用）
 * @param type 资源类型
 * @param ui UI元数据
 */
export function registerResourceTypeUI(type: string, ui: ResourceTypeUI): void {
    registered.set(type, ui);
}

/**
 * 获取资源类型UI元数据  
 * 解析顺序：站点注册 → 核心默认 → 未命中返回`undefined`（由调用方兜底）
 * @param type 资源类型
 */
export function getResourceTypeUI(type: string): ResourceTypeUI | undefined {
    return registered.get(type) ?? defaultResourceTypeUI[type];
}
