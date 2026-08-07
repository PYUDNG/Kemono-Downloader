import { DateTimeString, Attachment, FileItem, KemonoService } from './common.js';

/**
 * 帖子修订版本类型
 */
export interface Revision {
    /** 修订版本ID（大于等于1的整数） */
    revision_id: number;
    id: string;
    user: string;
    service: string;
    title: string;
    content: string;
    embed: Record<string, any>;
    /** 共享文件标识（布尔值或字符串 "0"） */
    shared_file: boolean | "0";
    added: DateTimeString;
    published: DateTimeString;
    edited: DateTimeString;
    file: Record<string, any>;
    attachments: Record<string, any>[];
    /** 大小（大于等于0的整数） */
    size: number;
    ihash: string;
    poll: Record<string, any>;
    tags: string[];
    captions: Record<string, any>;
}

/**
 * 帖子属性类型  
 * 仅Kemono系列API返回，其他站点可能缺失
 */
export interface PostProps {
    service: string;
    flagged: number;
    revisions: Revision[];
}

/**
 * 帖子预览类型  
 * 仅Kemono系列API返回，其他站点可能缺失（缩略图按URL规则推导）
 */
export interface PostPreview {
    name: string,
    path: string,
    server: string,
    type: 'thumbnail',
}

/**
 * 核心帖子类型
 */
export interface Post {
    id: string;
    user: string;
    service: KemonoService;
    title: string;
    content: string;
    embed: Record<string, any>;
    shared_file: boolean;
    added: DateTimeString;
    published: DateTimeString;
    edited: DateTimeString;
    /** 封面图文件（部分站点/帖子可能为空对象） */
    file: Partial<FileItem>;
    attachments: Attachment[];
    next: string;
    prev: string;

    // —— 站点扩展字段（可选） ——
    /** 内容是否已完整导入（false = 仅预览） */
    has_full?: boolean;
    /** 导入状态 */
    preview_state?: string | null;
    /** 内容来源站点 */
    origin?: string | null;
}

/**
 * API返回值的canonical根类型  
 * 各站点adapter负责将自身API响应归一化为此结构（Kemono原生即是，其他站点在adapter中转换）
 */
export interface PostApiResponse {
    post: Post;
    attachments: Attachment[];
    /**
     * 预览/服务器信息（仅Kemono系列提供）
     */
    previews?: PostPreview[];
    /**
     * 帖子属性（仅Kemono系列提供）
     */
    props?: PostProps;
}
