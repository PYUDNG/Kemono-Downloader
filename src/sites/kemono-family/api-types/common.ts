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
    path: string;
    /**
     * 原始文件未导入（仅预览/缩略图可访问）
     * 目前仅Pawchive返回：此类文件只能从`img.<host>`缩略图子域获取，无视「下载原图」开关
     */
    preview_only?: boolean;
}

/**
 * 帖子附件类型
 */
export type Attachment = FileItem;
