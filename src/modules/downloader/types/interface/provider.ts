import { PostInfo } from "@/modules/api/types/common.js";
import { IDownloadTask } from "./task.js";
import { PromiseOrRaw } from "@/utils/main.js";

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
    downloadPost(info: PostInfo): PromiseOrRaw<string>;

    /**
     * 下载指定的一组Post
     * @param name 下载任务名称
     * @param infos 需要下载的posts信息列表
     * @returns 为此次下载创建的任务ID
     */
    downloadPosts(name: string, infos: PostInfo[]): PromiseOrRaw<string>;
}

// 静态属性扩展
export namespace IDownloadProvider {
    /**
     * 下载器支持的features列表（静态属性）
     */
    export const features: string[] = [];
}
