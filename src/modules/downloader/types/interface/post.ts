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
    subTasks: IPostDownloadTask[];
}