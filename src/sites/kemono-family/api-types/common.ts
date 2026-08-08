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
}

/**
 * 帖子附件类型
 */
export type Attachment = FileItem;
