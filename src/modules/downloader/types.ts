import { KemonoService } from "@/modules/api/types/common.js";
import { Ref } from "vue";

/**
 * 下载任务信息
 */
export interface DownloadTaskInfo {
    service: KemonoService;
    userId: string;
    postId: string;
}

export interface DownloadTask {
    info: DownloadTaskInfo;
    progress: Progress;
}

/**
 * 进度
 */
export interface Progress {
    /**
     * 任务总量
     */
    total: number;

    /**
     * 已完成数量
     */
    finished: number;
}

/**
 * 下载逻辑具体实现  
 * 负责接收并解析下载任务，并执行下载后将文件提供给用户
 */
export interface DownloadProvider {
    /**
     * 下载进度（以数据量为单位）
     */
    progress: Ref<Progress>;

    /**
     * 下载任务列表
     */
    tasks: DownloadTask[];

    /**
     * 接收一个新的下载任务
     * @param task 下载任务
     * @returns 任务ID
     */
    addTask(task: DownloadTaskInfo): number;
    
    /**
     * 根据任务ID获取该下载任务的进度
     * @param id 任务ID
     */
    getProgress(id: number): Progress;
};