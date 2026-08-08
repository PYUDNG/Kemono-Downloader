import type { Checker, SingleOrArray } from '@/utils/main.js';
import type { Module } from '@/modules/types.js';
import type { Resource } from '@/modules/downloader/types/model.js';

/**
 * 推荐语义资源类型词汇表  
 * 各站点 adapter 应尽量使用这些类型（以获得统一的图标/文案展示），亦可自定义扩展
 */
export const ResourceTypes = {
    /** 单篇帖子/内容 */
    POST: 'post',
    /** 多个帖子的合集 */
    POSTS: 'posts',
    /** 创作者主页 */
    CREATOR: 'creator',
    /** 服务器（如Discord服务器） */
    SERVER: 'server',
    /** 频道（如Discord频道） */
    CHANNEL: 'channel',
} as const;
export type ResourceType = typeof ResourceTypes[keyof typeof ResourceTypes] | (string & {});

/**
 * 页面动作产生的下载意图（`resolve`的输入）  
 * 由站点adapter定义语义，`kind`可任意扩展
 */
export type DownloadRequest =
    | { kind: 'post'; service: string; creatorId: string; postId: string }
    | { kind: 'creator'; service: string; creatorId: string }
    | { kind: 'batch'; name: string; requests: DownloadRequest[] }
    | { kind: 'server'; serverId: string }
    | { kind: 'channel'; serverId: string; channelId: string }
    | { kind: string; [key: string]: unknown };

/**
 * 站点 adapter 契约  
 * 一个站点一个实现：声明其身份、域名命中规则、页面模块，并提供资源解析/展开逻辑  
 * 下载器、loader与GUI只消费本站点无关的资源模型与Module契约，不感知站点细节
 */
export interface Site {
    /**
     * 全局唯一站点ID（如`kemono`、`pawchive`）
     */
    id: string;
    /**
     * 站点显示名称
     */
    label: string;
    /**
     * 域名命中规则（复用checker机制）  
     * 命中即认为当前页面属于本站点（用于detectSite选择加载哪个adapter）
     * 匹配语义完全可自定义：如精确域、主域+子域、正则、自定义函数
     */
    hosts: SingleOrArray<Checker>;
    /**
     * 站点声明的模块工厂（任意数量）  
     * 每个模块自带checkers/enter/leave等生命周期钩子，由组合根在加载时以当前站点实例调用
     */
    modules: Record<string, (site: Site) => Module<unknown>>;
    /**
     * 把下载意图解析为资源树（纯同步，只构造stub，不碰网络）
     */
    resolve(request: DownloadRequest): Resource;
    /**
     * 展开：stub资源 → 实体（填充`name`/`meta`/`files`/`children`，异步，可自行访问网络）
     */
    expand(resource: Resource): Promise<void>;
}
