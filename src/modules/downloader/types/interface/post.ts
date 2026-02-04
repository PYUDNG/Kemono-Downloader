import { PostInfo } from "@/modules/api/types/common.js";
import { IMultiFileDownloadTask } from "./task.js";
import { PostApiResponse } from "@/modules/api/types/post.js";

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
    data: PostApiResponse | null;

    /**
     * Post API获取状态  
     * 当此项不为`'complete'`时`data`属性应为`null`
     */
    dataPromise: Promise<PostApiResponse>;
}