import { PostInfo } from "@/modules/api/types/common";
import { IDiscordChannelDownloadTask, IDiscordServerDownloadTask, IPostDownloadTask, IPostsDownloadTask } from "../interface/post";
import { BaseFileDownloadTask, BaseMultiDownloadTask, BaseSavefileTask, BaseTask } from "./task";
import { PostApiResponse } from "@/modules/api/types/post";
import { Reactive } from "vue";
import { Nullable } from "@/utils/main";
import { DiscordChannelApiResponse, DiscordServerApiResponse } from "@/modules/api/types/discord";

export abstract class BasePostDownloadTask extends BaseMultiDownloadTask implements IPostDownloadTask {
    public info: PostInfo;
    public data: PostApiResponse | null = null;
    public abstract dataPromise: Promise<PostApiResponse>;

    public readonly type = 'post' as const;

    /**
     * 接收并设置post信息
     * @param info 需要下载的post信息
     */
    constructor(parent: Nullable<BaseTask>, info: PostInfo) {
        super(parent);
        this.info = info;
    }
}

export abstract class BasePostsDownloadTask extends BaseMultiDownloadTask implements IPostsDownloadTask {
    public infos: PostInfo[];
    public abstract subTasks: Reactive<BasePostDownloadTask[]>;
    public readonly type = 'posts' as const;

    /**
     * 接收并设置posts信息
     * @param infos 需要下载的posts信息列表
     */
    constructor(parent: Nullable<BaseTask>, infos: PostInfo[]) {
        super(parent);
        this.infos = infos;
    }
}

export abstract class BaseDiscordChannelDownloadTask extends BaseMultiDownloadTask implements IDiscordChannelDownloadTask {
    public readonly type = 'discord-channel' as const;
    public channelId: string;
    public abstract data: Nullable<DiscordChannelApiResponse>;
    public abstract subTasks: Reactive<(BaseFileDownloadTask | BaseSavefileTask)[]>;

    /**
     * 接收并设置channel信息
     * @param channelId Discord频道ID
     */
    constructor(parent: Nullable<BaseTask>, channelId: string) {
        super(parent);
        this.channelId = channelId;
    }
}

export abstract class BaseDiscordServerDownloadTask extends BaseMultiDownloadTask implements IDiscordServerDownloadTask {
    public readonly type = 'discord-server' as const;
    public serverId: string;
    public abstract data: Nullable<DiscordServerApiResponse>;
    public abstract subTasks: Reactive<BaseDiscordChannelDownloadTask[]>;

    /**
     * 接收并设置channel信息
     * @param serverId Discord服务器ID
     */
    constructor(parent: Nullable<BaseTask>, serverId: string) {
        super(parent);
        this.serverId = serverId;
    }
}
