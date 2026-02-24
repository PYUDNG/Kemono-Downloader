import { Attachment, DateTimeString, FileItem, KemonoService } from './common.js';

export interface PostsApiItem {
    /**
     * 帖子附件，不包含`file`属性所指向的封面图
     */
    attachments: Attachment[];
    /**
     * 封面图文件，不包含在`attachments`属性所指向的附件列表中
     */
    file: Partial<FileItem>;
    /**
     * 帖子ID
     */
    id: string;
    /**
     * 帖子发布时间
     */
    published: DateTimeString;
    /**
     * 帖子所属平台
     */
    service: KemonoService;
    /**
     * 帖子描述开头一段文本
     */
    substring?: string;
    /**
     * 帖子标题
     */
    title: string;
    /**
     * 创作者ID
     */
    user: string;
};
export type PostsApiResponse = PostsApiItem[];