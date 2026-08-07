import type { Component } from 'vue';
import type { SingleOrArray } from '@/utils/main.js';
import type { Checker } from '@/utils/main.js';
import type { Resource } from '@/modules/downloader/types/model.js';
import type {
    APIErrorResponse,
    PostInfo,
} from '@/modules/api/types/common.js';
import type { PostApiResponse } from '@/modules/api/types/post.js';
import type { PostsApiResponse } from '@/modules/api/types/posts.js';
import type { ProfileApiResponse } from '@/modules/api/types/profile.js';

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
 * 资源类型对应的UI元数据（图标 + 文案key）
 */
export interface ResourceTypeUI {
    icon?: Component;
    /**
     * i18n key（如`downloader.gui.taskComponent.resourceTypes.post`对应的路径字符串）
     */
    labelKey?: string;
}

/**
 * 页面动作产生的下载意图（`resolve`的输入）  
 * 由页面流工厂根据页面URL解析，站点 adapter 定义语义
 */
export type DownloadRequest =
    | { kind: 'post'; service: string; creatorId: string; postId: string }
    | { kind: 'creator'; service: string; creatorId: string }
    | { kind: 'batch'; name: string; requests: DownloadRequest[] }
    | { kind: 'server'; serverId: string }
    | { kind: 'channel'; serverId: string; channelId: string }
    | { kind: string; [key: string]: unknown };

/**
 * 页面挂载配置：下载按钮如何注入到宿主页面DOM
 */
export interface MountConfig {
    /**
     * 挂载点选择器（如`.user-header__actions`）
     */
    containerSelector: string;
    /**
     * 插入方式：`'append'`追加到挂载点末尾；`{ before }`插入到指定元素之前
     */
    insert?: 'append' | { before: string };
    /**
     * 按钮容器的内联样式
     */
    containerStyles?: Record<string, string>;
    /**
     * 按钮容器的class
     */
    containerClasses?: string | string[];
    /**
     * Shadow App 的class
     */
    appClasses?: string | string[];
}

/**
 * 页面定义：站点声明其支持的页面类型及其页面内集成方式
 */
export interface PageDefinition {
    /**
     * 页面匹配规则（URL checkers）
     */
    checkers: SingleOrArray<Checker>;
    /**
     * 下载按钮挂载配置
     */
    mount: MountConfig;
    /**
     * 从页面路径解析下载请求  
     * 返回`null`表示无法解析（不响应下载）
     */
    parseRequest(pathname: string): DownloadRequest | null;
}

export type PageType = 'creator' | 'post' | 'discordServer';

/**
 * 站点能力位：站点间行为差异的显式声明
 */
export interface SiteCapabilities {
    /**
     * 搜索关键字最小长度（小于此长度不发起搜索请求）
     */
    searchMinLength: number;
    /**
     * 内容未完整导入（仅预览）的帖子的处理方式
     */
    pendingPosts: 'none' | 'skip' | 'thumbnail-only';
}

/**
 * 站点 adapter 的API访问（站点相关：URL构造 + 响应归一化）
 */
export interface SiteApi {
    profile(options: { service: string; creatorId: string }): Promise<ProfileApiResponse | APIErrorResponse>;
    posts(options: {
        service: string;
        creatorId: string;
        index?: number;
        query?: string;
    }): Promise<PostsApiResponse | APIErrorResponse>;
    post(info: PostInfo): Promise<PostApiResponse | APIErrorResponse>;
    isErrorResponse(data: any): data is APIErrorResponse;
}

/**
 * 站点 adapter 的资产URL生成（站点相关）
 */
export interface SiteAssets {
    /**
     * 缩略图URL
     */
    thumbnail(path: string): string;
    /**
     * 全量文件URL
     * @param file 文件信息（API数据）
     * @param data 帖子API数据（可能包含previews信息）
     */
    fullFile(file: { name?: string; path: string }, data: PostApiResponse): string;
    /**
     * Discord等特殊资源的文件URL（无previews信息时）
     */
    discordFile?(path: string): string;
}

/**
 * 站点 adapter 契约  
 * 一个站点一个实现：声明其域名、页面、API访问、资产URL、能力位，并提供资源解析/展开逻辑  
 * 下载器与GUI只消费本站点无关的资源模型，不感知任何站点细节
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
     * 站点域名列表（精确域名或子域后缀，如`kemono.cr`）
     */
    hosts: string[];
    /**
     * 页面定义（站点支持哪些页面类型）
     */
    pages: Partial<Record<PageType, PageDefinition>>;
    /**
     * API访问
     */
    api: SiteApi;
    /**
     * 资产URL生成
     */
    assets: SiteAssets;
    /**
     * 能力位
     */
    capabilities: SiteCapabilities;
    /**
     * 自定义资源类型UI元数据（覆盖核心默认值）
     */
    resourceTypes?: Partial<Record<string, ResourceTypeUI>>;
    /**
     * 把下载意图解析为资源树（纯同步，只构造stub，不碰网络）
     */
    resolve(request: DownloadRequest): Resource;
    /**
     * 展开：stub资源 → 实体（填充`name`/`meta`/`files`/`children`，异步，可调用`api`）
     */
    expand(resource: Resource): Promise<void>;
}
