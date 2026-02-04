import { PostInfo } from "@/modules/api/types/common";
import { IPostDownloadTask } from "../interface/post";
import { BaseMultiFileDownloadTask } from "./task";
import { PostApiResponse } from "@/modules/api/types/post";

export abstract class BasePostDownloadTask extends BaseMultiFileDownloadTask implements IPostDownloadTask {
    public info: PostInfo;
    public data: PostApiResponse | null = null;
    abstract dataPromise: Promise<PostApiResponse>;

    public readonly type: 'post' = 'post';

    constructor(info: PostInfo) {
        super();
        this.info = info;
    }
}