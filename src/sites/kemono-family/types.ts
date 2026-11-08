import type { SingleOrArray, Checker } from '@/utils/main.js';
import type { APIErrorResponse } from '@/modules/api/types/common.js';
import type { FileItem, PostInfo } from './api-types/common.js';
import type { PostApiResponse } from './api-types/post.js';
import type { PostsApiResponse } from './api-types/posts.js';
import type { ProfileApiResponse } from './api-types/profile.js';
import type { DownloadRequest } from '../types.js';

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
 * 站点能力位（Kemono系）：站点间行为差异的显式声明
 */
export interface SiteCapabilities {
    /**
     * 搜索关键字最小长度（小于此长度不发起搜索请求）
     */
    searchMinLength: number;
    /**
     * 探测创作者作品总数（站点API不提供总数信息时，如Pawchive的profile无post_count）
     * 返回`null`表示无法确定，调用方回退到已加载数量
     * @param options 探测参数
     * @param options.loaded 已加载条数（探测从该偏移继续，避免重复请求已加载的页）
     * @param options.onProgress 每探测完一页的回调（传入当前累计总数），用于UI渐进式更新
     */
    resolveTotalCount?: (options: {
        service: string;
        creatorId: string;
        query?: string;
        loaded: number;
        onProgress?: (partialTotal: number) => void;
    }) => Promise<number | null>;
}

/**
 * Kemono系API访问（站点相关：URL构造 + 响应归一化）
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
 * Kemono系资产URL生成（站点相关）
 */
export interface SiteAssets {
    /**
     * 缩略图URL
     */
    thumbnail(path: string): string;
    /**
     * 全量文件URL
     * @param file 文件信息（API数据）；延迟导入的附件可能没有`path`
     * @param data 帖子API数据（可能包含previews信息）
     * 仅图片附件受「下载原图」开关影响（关闭时走`img.`缩略图）；视频、压缩包等其他类型始终返回原文件URL
     * `preview_only`文件原始未导入：旧格式下仅`img.`缩略图可访问；新API提供`temp_url`时可获取原始文件
     * @returns 下载URL；当前无法下载（如附件尚未落盘且无临时URL）时返回`null`，调用方应跳过该文件
     */
    fullFile(file: Partial<FileItem>, data: PostApiResponse): string | null;
    /**
     * Discord等特殊资源的文件URL（无previews信息时）
     */
    discordFile?(path: string): string;
}

/**
 * Kemono系站点共享的家族依赖  
 * 由各adapter提供具体实现，供家族内共享逻辑（展开器、页面流程）消费
 */
export interface KemonoFamilyDeps {
    api: SiteApi;
    assets: SiteAssets;
    capabilities: SiteCapabilities;
}
