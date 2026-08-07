import { reactive } from "vue";
import { v4 as uuid } from "uuid";
import { Nullable, PromiseOrRaw } from "@/utils/main.js";
import { constructFilename } from "../../utils/main.js";
import { FeatureNotSupportedError } from "./error.js";
import type { DownloadTarget, ExpandFn, FileSpec, Progress, Resource, Status, TaskLike } from "../model.js";
import type { Feature, ProviderType } from "./provider.js";

/**
 * 资源任务构造选项
 */
export interface ResourceTaskOptions {
    /**
     * 当前provider的id
     */
    provider: string;

    /**
     * 当前provider支持的features（决定容器级暂停等行为）
     */
    features: Feature[];

    /**
     * 文件名模板（已按"站点专属优先于通用"解析）
     */
    template: string;

    /**
     * site adapter 提供的展开函数
     */
    expand: ExpandFn;

    /**
     * 叶子任务工厂（provider 注入自己的文件任务类）
     */
    fileTaskFactory: (parent: BaseResourceTask, target: DownloadTarget) => BaseFileTask;
}

/**
 * 资源任务：递归容器  
 * 持有 site adapter 产出的{@link Resource}，初始化时经`expand`展开并构建子任务树，执行时递归运行子任务并聚合进度  
 * 站点无关：所有站点差异（数据获取、URL生成、文件命名）都在展开阶段完成
 */
export class BaseResourceTask {
    public readonly id: string = uuid();
    public readonly type = 'resource' as const;
    public readonly provider: string;
    public name: Nullable<string> = null;
    public progress = reactive<Progress>({
        total: -1,
        finished: -1,
        status: 'init',
    });
    public init: Promise<void>;
    public parent: Nullable<BaseResourceTask> = null;
    public subTasks: TaskLike[] = reactive([]);
    public resource: Resource;

    /**
     * 一个run过程中pending、run完毕后resolve的Promise  
     * 用于等待run执行完毕  
     * 注意：此Promise和直接调用`run`返回的Promise不是同一个
     */
    private runPromise: Promise<void> = Promise.resolve();

    private options: ResourceTaskOptions;

    constructor(parent: Nullable<BaseResourceTask>, resource: Resource, options: ResourceTaskOptions) {
        this.parent = parent ?? null;
        this.resource = resource;
        this.options = options;
        this.provider = options.provider;

        // 初始化：展开资源并构建子任务
        this.init = this.expandAndBuild();
    }

    /**
     * 展开资源并构建子任务树  
     * 展开失败时任务进入`'error'`状态（可通过`retry`重新展开）
     */
    private async expandAndBuild(): Promise<void> {
        try {
            // 展开资源（填充 name/meta/files/children）
            await this.options.expand(this.resource);

            // 设置名称
            this.name = this.resource.name ?? null;

            // 构建文件子任务
            const metaChain = this.metaChain();
            this.resource.files?.forEach((file, i) => {
                this.subTasks.push(this.options.fileTaskFactory(
                    this,
                    buildDownloadTarget(file, metaChain, i + 1, this.options.template),
                ));
            });

            // 构建子资源任务（递归）
            this.resource.children?.forEach(child => {
                this.subTasks.push(new BaseResourceTask(this, child, this.options));
            });

            // 设置进度
            this.progress.total = this.subTasks.length;
            this.progress.finished = 0;
        } catch (err) {
            // 展开失败：任务进入错误状态，可重试
            this.progress.status = 'error' as Status;
            console.error('resource expand failed', err);
        }
    }

    /**
     * 祖先链meta（root在前，自身在后），供文件名模板引擎使用
     */
    private metaChain(): Record<string, string | number | null>[] {
        const chain: Record<string, string | number | null>[] = [];
        let current: Nullable<BaseResourceTask> = this;
        while (current) {
            chain.unshift(current.resource.meta);
            current = current.parent;
        }
        return chain;
    }

    /**
     * 开始执行任务：递归运行所有子任务并聚合状态
     */
    async run(): Promise<void> {
        // 防止重复运行；展开失败的任务需先重试
        if (this.progress.status === 'ongoing' || this.progress.status === 'error') return;

        const { promise, resolve } = Promise.withResolvers<void>();
        this.runPromise = promise;

        // 确保资源已展开
        await this.init;
        if ((this.progress.status as Status) === 'error') return;

        // 运行所有子任务
        this.progress.status = 'ongoing' as Status;
        this.progress.finished = 0;
        this.progress.total = this.subTasks.length;
        await Promise.allSettled(this.subTasks.map(subTask =>
            // 子任务内部已处理错误，这里不应再抛错（除非是代码错误）
            Promise.resolve(subTask.run()).then(
                () => subTask.progress.status === 'complete' && this.progress.finished++
            )
        ));

        // 设置任务状态
        this.progress.status =
            this.progress.status === 'aborted' ?
                'aborted' :
                this.hasTaskStatus('error') ?
                    'error' :
                    'complete';

        // 运行完毕，resolve runPromise
        resolve();
    }

    /**
     * 暂停任务  
     * 仅当当前provider支持`pause`feature时有效，否则抛出{@link FeatureNotSupportedError}
     */
    pause(): PromiseOrRaw<unknown> {
        if (!this.options.features.includes('pause'))
            throw new FeatureNotSupportedError('Unsupported feature: pause', this.provider as ProviderType);

        return Promise.allSettled(this.subTasks.map(subTask => Promise.resolve(subTask.pause())))
            .then(() => { this.progress.status = 'paused'; });
    }

    /**
     * 取消暂停任务
     */
    unpause(): PromiseOrRaw<unknown> {
        if (!this.options.features.includes('pause'))
            throw new FeatureNotSupportedError('Unsupported feature: pause', this.provider as ProviderType);

        this.progress.status = 'ongoing';
        return Promise.allSettled(this.subTasks.map(subTask => Promise.resolve(subTask.unpause())));
    }

    /**
     * 终止任务  
     * 级联终止所有子任务
     * @param deleteFiles 是否删除该任务已下载的文件
     */
    async abort(deleteFiles: boolean = false): Promise<void> {
        if (this.progress.status !== 'queue' && this.progress.status !== 'ongoing') return;

        // 首先设置为aborted状态
        this.progress.status = 'aborted';
        // 然后终止所有子任务
        await Promise.allSettled(this.subTasks.map(subTask => Promise.resolve(subTask.abort(deleteFiles))));
        // 等待本次run执行完毕后返回
        await this.runPromise;
    }

    /**
     * 重试任务  
     * - 子任务存在错误：重试所有失败的子任务
     * - 展开阶段失败（无子任务）：重新展开并执行
     */
    async retry(): Promise<void> {
        if (this.progress.status !== 'error') return;

        const failed = this.subTasks.filter(subTask => subTask.progress.status === 'error');

        // 展开阶段失败：重新展开
        if (failed.length === 0) {
            this.progress.status = 'init' as Status;
            this.subTasks.splice(0, this.subTasks.length);
            this.init = this.expandAndBuild();
            await this.init;
            if ((this.progress.status as Status) === 'error') return;
            await this.run();
            return;
        }

        // 子任务失败：重试失败部分
        this.progress.status = 'ongoing' as Status;
        await Promise.allSettled(failed.map(subTask => Promise.resolve(subTask.retry())));

        // 更新父级任务进度
        if (this.parent) {
            const progress = this.parent.progress;
            progress.finished++;
            if (progress.finished === progress.total)
                progress.status = 'complete';
        }
    }

    /**
     * 检查所有subTasks中是否存在给定状态的task
     */
    hasTaskStatus(status: Progress['status']): boolean {
        return this.subTasks.some(subTask => subTask.progress.status === status);
    }
}

/**
 * 根据文件规格与文件名模板构建叶子任务的目标文件
 * @param file 文件规格（site adapter 展开时产出）
 * @param metaChain 祖先资源meta链（root在前）
 * @param p 该文件在当前资源文件列表中的序号（从1开始）
 * @param template 文件名模板
 */
function buildDownloadTarget(
    file: FileSpec,
    metaChain: Record<string, string | number | null>[],
    p: number,
    template: string,
): DownloadTarget {
    const path = constructFilename(metaChain, file, p, template);
    return {
        kind: file.kind,
        name: file.name,
        path,
        ...(file.kind === 'download' ? { url: file.url } : { data: file.data }),
    };
}

/**
 * 文件任务（叶子）：下载或保存单个文件  
 * 由各provider子类实现具体执行逻辑（浏览器下载/FSA流式写入/Aria2 RPC等）
 */
export abstract class BaseFileTask {
    public readonly id: string = uuid();
    public readonly type = 'file' as const;
    public abstract provider: string;
    public name: string;
    public progress = reactive<Progress>({
        total: -1,
        finished: -1,
        status: 'queue',
    });
    public init: Promise<void> = Promise.resolve();
    public parent: Nullable<BaseResourceTask> = null;
    public subTasks: TaskLike[] = [];
    public target: DownloadTarget;

    constructor(parent: Nullable<BaseResourceTask>, target: DownloadTarget) {
        this.parent = parent ?? null;
        this.target = target;
        this.name = target.name;
    }

    /**
     * 开始下载/保存文件  
     * 返回一个完成时resolve的Promise
     */
    abstract run(): PromiseOrRaw<unknown>;

    /**
     * 暂停任务  
     * 不支持的provider应抛出{@link FeatureNotSupportedError}
     */
    abstract pause(): PromiseOrRaw<unknown>;

    /**
     * 取消暂停任务
     */
    abstract unpause(): PromiseOrRaw<unknown>;

    /**
     * 终止任务
     * @param deleteFiles 是否删除该任务已下载的文件
     */
    abstract abort(deleteFiles?: boolean): PromiseOrRaw<unknown>;

    /**
     * 重试任务
     */
    abstract retry(): PromiseOrRaw<unknown>;
}
