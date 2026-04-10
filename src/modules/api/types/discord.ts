import { Nullable } from "@/utils/main";
import { Attachment, DateTimeString } from "./common";

/**
 * Discord Server API Response中的channels数组元素类型
 */
export interface DiscordServerChannel {
    /**
     * 用作图标的表情符号
     */
    icon_emoji: string;
    
    /**
     * Channel ID 字符串型数值
     */
    id: string;

    /**
     * 是否为NSFW频道
     */
    is_nsfw: boolean;

    /**
     * 频道名称
     */
    name: string;

    /**
     * 父级频道ID
     */
    parent_channel_id: string;

    /**
     * 未知：position
     */
    position: number;

    /**
     * 内含帖子数量
     */
    post_count: number;

    /**
     * 所属Server ID
     */
    server_id: string;

    /**
     * 未知类型：颜色
     */
    theme_color: Nullable<unknown>;

    /**
     * 未知：topic
     */
    topic: Nullable<unknown>;

    /**
     * 未知：type
     */
    type: number;
}

export interface DiscordServerApiResponse {
    /**
     * 频道列表
     */
    channels: DiscordServerChannel[];

    /**
     * Server ID 字符串型数值
     */
    id: string;

    /**
     * 索引时间
     */
    indexed: DateTimeString;

    /**
     * Server名称
     */
    name: string;

    /**
     * 更新时间
     */
    updated: DateTimeString;
}

export interface DiscordChannelPost {
    /**
     * 添加时间
     */
    added: DateTimeString;

    /**
     * 附件列表
     */
    attachments: Attachment[];

    /**
     * 作者信息
     */
    author: {
        accent_color: Nullable<unknown>;
        avatar: Nullable<unknown>;
        avatar_decoration_data: Nullable<unknown>;
        banner: Nullable<unknown>;
        banner_color: Nullable<unknown>;
        discriminator: string;
        flags: number;
        global_name: string;
        id: string;
        premium_type: number;
        public_flags: number;
        username: string;
    };

    /**
     * 所属Channel ID
     */
    channel: string;

    /**
     * 未知：content
     */
    content: string;

    /**
     * 编辑时间
     */
    edited: Nullable<DateTimeString>;

    /**
     * 未知：embeds
     */
    embeds: unknown[];

    /**
     * Post ID
     */
    id: string;

    /**
     * 未知：mentions
     */
    mentions: unknown[];

    /**
     * 发布时间
     */
    published: DateTimeString;

    /**
     * 未知：revisions
     */
    revisions: unknown[];

    /**
     * 未知：seq
     */
    seq: number;

    /**
     * 所属Server ID
     */
    server: string;
};

export type DiscordChannelApiResponse = DiscordChannelPost[];
