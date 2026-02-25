import { PostInfo } from "@/modules/api/types/common.js";
import { IDownloadProvider } from "../interface/provider.js";
import { BaseDownloadTask } from "./task.js";
import { reactive } from "vue";

export const features = [
    'pause',
    'abortFiles',
] as const;
export type Feature = typeof features[number];

export abstract class BaseDownloadProvider implements IDownloadProvider {
    abstract name: string;
    public tasks: BaseDownloadTask[] = reactive([]);

    removeTask(taskId: string): boolean {
        const index = this.tasks.findIndex(t => t.id === taskId);
        const task = this.tasks[index];
        if (index < 0) return false;
        
        // 终止任务
        task.abort();

        // 移除任务
        this.tasks.splice(index, 1);
        return true;
    }
    
    abstract downloadPost(info: PostInfo): string;
    abstract downloadPosts(name: string, infos: PostInfo[]): string;
}

