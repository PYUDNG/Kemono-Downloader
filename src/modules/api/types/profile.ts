import { Nullable } from '@/utils/main.js';
import { DateTimeString, KemonoService } from './common.js';

/**
 * 创作者信息类型  
 * Profile API响应canonical根类型  
 * 各站点adapter负责归一化（Kemono系列字段可能缺失，其他站点可能包含扩展字段）
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

  /** 聊天数量（Kemono系列提供） */
  chat_count?: number;
  /** DM数量（Kemono系列提供） */
  dm_count?: number;
  /** posts数量（Kemono系列提供；缺失时由UI以已加载数量兜底） */
  post_count?: number;
  share_count?: number;
  relation_id: Nullable<string>;

  // —— 站点扩展字段（可选） ——
  /** 是否曾从其他站点导入（如pawchive） */
  ever_imported?: boolean;
  /** Kemono收藏数（如pawchive） */
  kemono_favorited?: number;
  /** 导入大小上限（如pawchive） */
  import_size_cap_gb?: number | null;
  /** 最近一次导入收藏时间（如pawchive） */
  last_import_favs?: unknown;
}
