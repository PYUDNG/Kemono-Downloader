import type { PostInfo } from "@/modules/api/types/common.js";
import type { IFileDownloadTask, IMultiFileDownloadTask, ISavefileTask } from "./task.js";
import type { PostApiResponse } from "@/modules/api/types/post.js";
import type { Nullable } from "@/utils/main.js";
import type { DiscordChannelApiResponse, DiscordServerApiResponse } from "@/modules/api/types/discord.js";
import { Reactive } from "vue";

/**
 * Post下载任务
 */
export interface IPostDownloadTask extends IMultiFileDownloadTask {
    /**
     * 任务类型
     */
    type: 'post';

    /**
     * Post 信息
     */
    info: PostInfo;

    /**
     * Post API数据  
     * 当尚未取得数据时本属性为`null`
     */
    data: Nullable<PostApiResponse>;

    /**
     * Post API获取状态  
     * 当此项未resolve时`data`属性应为`null`
     */
    dataPromise: Promise<PostApiResponse>;
}

export interface IPostsDownloadTask extends IMultiFileDownloadTask {
    /**
     * 任务类型
     */
    type: 'posts';

    /**
     * Posts 信息列表
     */
    infos: PostInfo[];

    /**
     * 下载Post的任务列表
     */
    subTasks: Reactive<IPostDownloadTask[]>;
}

export interface IDiscordChannelDownloadTask extends IMultiFileDownloadTask {
    /**
     * 任务类型
     */
    type: 'discord-channel';

    /**
     * Discord频道ID
     */
    channelId: string;

    /**
     * Channel API Response
     */
    data: Nullable<DiscordChannelApiResponse>;

    /**
     * 子任务列表
     */
    subTasks: Reactive<(IFileDownloadTask | ISavefileTask)[]>;
}

export interface IDiscordServerDownloadTask extends IMultiFileDownloadTask {
    /**
     * 任务类型
     */
    type: 'discord-server';

    /**
     * Server ID
     */
    serverId: string;

    /**
     * Server API Response
     */
    data: Nullable<DiscordServerApiResponse>;

    /**
     * 子任务列表
     */
    subTasks: Reactive<IDiscordChannelDownloadTask[]>;
}
