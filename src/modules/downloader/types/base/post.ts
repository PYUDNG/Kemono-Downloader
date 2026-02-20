import { PostInfo } from "@/modules/api/types/common";
import { IPostDownloadTask, IPostsDownloadTask } from "../interface/post";
import { BaseMultiDownloadTask, BaseTask } from "./task";
import { PostApiResponse } from "@/modules/api/types/post";
import { Reactive } from "vue";
import { Nullable } from "@/utils/main";

export abstract class BasePostDownloadTask extends BaseMultiDownloadTask implements IPostDownloadTask {
    public info: PostInfo;
    public data: PostApiResponse | null = null;
    abstract dataPromise: Promise<PostApiResponse>;

    public readonly type: 'post' = 'post';

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
    abstract subTasks: Reactive<BasePostDownloadTask[]>;
    public readonly type: 'posts' = 'posts';

    /**
     * 接收并设置posts信息
     * @param infos 需要下载的posts信息列表
     */
    constructor(parent: Nullable<BaseTask>, infos: PostInfo[]) {
        super(parent);
        this.infos = infos;
    }
}