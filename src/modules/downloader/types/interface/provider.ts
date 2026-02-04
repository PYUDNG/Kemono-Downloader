import { PostInfo } from "@/modules/api/types/common.js";
import { IDownloadTask } from "./task.js";

export interface IDownloadProvider {
    /**
     * 下载器人类可读名称
     */
    name: string;

    /**
     * 下载任务列表
     */
    tasks: IDownloadTask[];

    /**
     * 终止并移除给定下载任务
     * @param taskId 任务ID
     * @returns 是否成功移除（任务ID不存在时为false）
     */
    removeTask(taskId: string): boolean;

    /**
     * 下载指定的Post
     * @param info Post信息
     * @returns 为此次下载创建的任务ID
     */
    downloadPost(info: PostInfo): string;
}