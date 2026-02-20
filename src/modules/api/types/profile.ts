import { Nullable } from '@/utils/main.js';
import { DateTimeString, KemonoService } from './common.js';

/**
 * 创作者信息类型  
 * Profile API响应根类型
 */
export interface ProfileApiResponse {
  /** 创作者ID */
  id: string;
  /** 创作者公共ID */
  public_id: Nullable<string>;
  /** 服务名称 */
  service: KemonoService;
  /** 创作者显示名称 */
  name: string;
  /** 最后索引时间（date-time格式） */
  indexed: DateTimeString;
  /** 最后更新时间（date-time格式） */
  updated: DateTimeString;
  chat_count: number;
  dm_count: number;
  /** posts数量 */
  post_count: number;
  relation_id: Nullable<string>;
  share_count: number;
}