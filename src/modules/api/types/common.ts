export type KemonoService = 'patreon' | 'fanbox' | 'discord' | 'fantia' | 'afdian' | 'boosty' | 'gumroad' | 'subscribestar' | 'dlsite';

/**
 * 日期时间字符串类型（符合 date-time 格式）
 */
export type DateTimeString = string;

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
    name: string;
    path: string;
}

/**
 * 帖子附件类型
 */
export type Attachment = FileItem;
