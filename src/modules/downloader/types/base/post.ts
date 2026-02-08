import { PostInfo } from "@/modules/api/types/common";
import { IPostDownloadTask, IPostsDownloadTask } from "../interface/post";
import { BaseMultiDownloadTask } from "./task";
import { PostApiResponse } from "@/modules/api/types/post";
import { Reactive } from "vue";

export abstract class BasePostDownloadTask extends BaseMultiDownloadTask implements IPostDownloadTask {
    public info: PostInfo;
    public data: PostApiResponse | null = null;
    abstract dataPromise: Promise<PostApiResponse>;

    public readonly type: 'post' = 'post';

    /**
     * 接收并设置post信息
     * @param info 需要下载的post信息
     */
    constructor(info: PostInfo) {
        super();
        this.info = info;
    }
}

export abstract class BasePostsDownloadTask extends BaseMultiDownloadTask implements IPostsDownloadTask {
    public infos: PostInfo[];
    abstract subTasks: Reactive<IPostDownloadTask[]>;
    public readonly type: 'posts' = 'posts';

    /**
     * 接收并设置posts信息
     * @param infos 需要下载的posts信息列表
     */
    constructor(infos: PostInfo[]) {
        super();
        this.infos = infos;
    }
}