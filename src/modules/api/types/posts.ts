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

    // #region 站点扩展字段（可选）
    /** 内容是否已完整导入（false = 仅预览） */
    has_full?: boolean;
    /** 导入状态 */
    preview_state?: string | null;
    /** 内容来源站点 */
    origin?: string | null;
    /** 导入尝试次数 */
    preview_attempts?: number;
    /** 详情是否已抓取 */
    detail_fetched?: boolean;
    /** 导入大小上限 */
    import_size_cap_gb?: number | null;
    // #endregion
};
export type PostsApiResponse = PostsApiItem[];
