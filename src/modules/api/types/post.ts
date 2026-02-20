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
 */
export interface PostProps {
    service: string;
    flagged: number;
    revisions: Revision[];
}

/**
 * 帖子预览类型
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
    file: FileItem;
    attachments: Attachment[];
    next: string;
    prev: string;
}

/**
 * API返回值的根类型
 */
export interface PostApiResponse {
    post: Post;
    attachments: Attachment[];
    previews: PostPreview[];
    props: PostProps;
}