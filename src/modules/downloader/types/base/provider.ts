import { reactive } from "vue";
import type { DownloadTarget, ExpandFn, Resource } from "../model.js";
import { BaseFileTask, BaseResourceTask } from "./task.js";
import { globalStorage } from "@/storage.js";
import type { PromiseOrRaw } from "@/utils/main.js";

export const features = [
    'pause',
    'abortFiles',
    'concurrent',
    'textContent',
] as const;
export type Feature = typeof features[number];

// 注意：这里使用 typeof import() 但不实际导入，以避免循环引用
export type ProviderType = keyof typeof import('../../providers/main.js');

/**
 * 下载provider基类  
 * 持有任务列表，提供下载入口（接收站点无关的{@link Resource}）
 */
export abstract class BaseDownloadProvider {
    public abstract name: ProviderType;
    public tasks: BaseResourceTask[] = reactive([]);

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

    /**
     * 下载一个资源（资源树根）  
     * 创建资源任务、加入任务列表并自动开始执行
     * @param resource 站点 adapter 解析出的资源（stub或已展开）
     * @param expand 站点 adapter 提供的展开函数
     * @param template 文件名模板（已按站点优先级解析）
     * @returns 任务ID
     */
    abstract download(resource: Resource, expand: ExpandFn, template: string): PromiseOrRaw<string>;

    /**
     * 带自动错误重试逻辑地执行任务
     * @param task 需要执行的任务
     */
    protected async runWithRetry(task: BaseResourceTask) {
        // 等待任务初始化完毕
        await task.init;

        // 首先执行一次
        await task.run();

        // 后续错误重试逻辑
        const storage = globalStorage.withKeys('downloader');
        for (
            // 用户设定的重试最大次数，当设置为负数时无限重试
            let retries = storage.get('autoRetry');
            // 当重试次数归零，或者未处于错误状态时，不继续重试
            retries !== 0 && task.progress.status === 'error';
            // 重试次数递减
            retries--
        ) await task.retry();
    }
}

/**
 * 资源任务构造选项（供provider实现{@link BaseDownloadProvider.download}时使用）
 */
export interface ResourceTaskCreationOptions {
    resource: Resource;
    expand: ExpandFn;
    template: string;
    fileTaskFactory: (parent: BaseResourceTask, target: DownloadTarget) => BaseFileTask;
}

/**
 * 创建资源任务的辅助函数  
 * provider实现`download`时调用，自动注入provider信息与features
 */
export function createResourceTask(
    provider: BaseDownloadProvider,
    options: ResourceTaskCreationOptions,
): BaseResourceTask {
    return new BaseResourceTask(null, options.resource, {
        provider: provider.name,
        features: (provider.constructor as typeof BaseDownloadProvider & { features: Feature[] }).features,
        template: options.template,
        expand: options.expand,
        fileTaskFactory: options.fileTaskFactory,
    });
}
