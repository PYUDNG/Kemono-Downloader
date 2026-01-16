/**
 * 日期时间字符串类型（符合 date-time 格式）
 */
export type DateTimeString = string;

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
  added: string;
  published: string;
  edited: string;
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
 * 核心帖子类型
 */
export interface Post {
  id: string;
  user: string;
  service: string;
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
  attachments: any[];
  previews: any[];
  props: PostProps;
}