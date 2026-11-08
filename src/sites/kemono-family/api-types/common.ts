/**
 * Kemono系API的领域形状（与站点无关的通用类型见`@/modules/api/types/common.js`）
 */

export type KemonoService = 'patreon' | 'fanbox' | 'discord' | 'fantia' | 'afdian' | 'boosty' | 'gumroad' | 'subscribestar' | 'dlsite';

/**
 * Post 信息
 */
export interface PostInfo {
    service: KemonoService;
    creatorId: string;
    postId: string;
};

/**
 * 文件对象类型
 */
export interface FileItem {
    name?: string;
    /**
     * 文件在存储服务器上的路径  
     * 延迟导入（{@link FileItem.deferred}）的附件可能尚未落盘，此时没有`path`，只能使用临时URL下载
     */
    path?: string;
    /**
     * 原始文件未导入（仅预览/缩略图可访问）  
     * 目前仅Pawchive返回：旧格式下此类文件只能从`img.<host>`缩略图子域获取；
     * 新API会额外下发{@link FileItem.temp_url}，可直接获取原始文件
     */
    preview_only?: boolean;
    /**
     * 文件所在存储服务器（新API提供，如`https://n1.pawchive.pw`）
     */
    server?: string;
    /**
     * 临时签名URL  
     * 原始文件未导入（`preview_only`）或延迟导入（`deferred`）时由API下发，存在有效期（见{@link FileItem.temp_expires}）
     */
    temp_url?: string;
    /**
     * 临时直链下载URL  
     * 视频等需要转码的附件会同时提供HLS播放列表（`temp_url`）与可直接下载的直链（本字段），下载时应优先使用本字段
     */
    temp_download_url?: string;
    /**
     * 临时URL过期时间
     */
    temp_expires?: string;
    /**
     * 附件尚未落盘（延迟导入）  
     * 此类附件可能没有`path`，需使用`temp_url`/`temp_download_url`；若临时URL也尚未生成，则当前无法下载
     */
    deferred?: boolean;
}

/**
 * 帖子附件类型
 */
export type Attachment = FileItem;
