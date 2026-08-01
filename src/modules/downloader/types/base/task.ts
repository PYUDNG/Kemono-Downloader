import { DownloadFile, IDownloadTask, IFileDownloadTask, IMultiFileDownloadTask, Progress, ITask, ISavefileTask, SaveFile } from "../interface/task.js";
import { v4 as uuid } from "uuid";
import { reactive } from "vue";
import type { Reactive } from "vue";
import type { Nullable } from "@/utils/main.js";

// 注意：这里使用 typeof import() 但不实际导入，以避免循环引用
export type ProviderType = keyof typeof import('../../providers/main.js');

export abstract class BaseTask implements ITask {
    public id: string = uuid();
    public readonly type: string = 'task';
    public abstract name: string | null;
    public progress: Reactive<Progress> = reactive({
        total: -1,
        finished: -1,
        status: 'queue'
    });
    abstract init: Promise<void>;
    abstract provider: ProviderType;
    public parent: Nullable<BaseTask> = null;
    public subTasks: BaseTask[] = [];

    constructor(parent: Nullable<BaseTask>) {
        this.parent = parent ?? null;
    };

    /**
     * 开始执行任务
     * 如果是同步任务，应在任务完成后返回
     * 如果是异步任务，应当返回一个在任务完成时resolve的Promise
     */
    abstract run(...args: any[]): unknown;

    abstract pause(): unknown;

    abstract unpause(): unknown;

    abstract retry(): unknown;

    /**
     * 终止任务
     * 仅当任务处于`'queue'`或`'ongoing'`状态时有效
     */
    abstract abort(...args: any[]): unknown;
}

export abstract class BaseSavefileTask extends BaseTask implements ISavefileTask {
    public readonly type: string = 'savefile';
    public name: string | null;
    public file: SaveFile;

    constructor(parent: Nullable<BaseTask>, file: SaveFile) {
        super(parent);
        this.file = file;
        this.name = file.path;
    }

    /**
     * 开始保存  
     * 返回一个保存完成时resolve的Promise
     */
    abstract run(...args: any): Promise<unknown>;
}

export abstract class BaseDownloadTask extends BaseTask implements IDownloadTask {
    public readonly type: string = 'download';
    public abstract name: string | null;

    /**
     * 开始下载  
     * 返回一个下载完成时resolve的Promise
     */
    abstract run(...args: any[]): Promise<unknown>;
}

export abstract class BaseFileDownloadTask extends BaseDownloadTask implements IFileDownloadTask {
    public readonly type: string = 'file';
    public name: string;
    public file: DownloadFile;

    constructor(parent: Nullable<BaseTask>, file: DownloadFile) {
        super(parent);
        this.file = file;
        this.name = file.path;
    }
};

export abstract class BaseMultiDownloadTask extends BaseDownloadTask implements IMultiFileDownloadTask {
    public readonly type: string = 'multifile';
    public subTasks: Reactive<BaseDownloadTask[]> = reactive([]);

    /**
     * 根据子任务的实际状态重新计算自身的进度和状态
     * 必须在每次run或retry后调用，而不是手动增减`progress.finished`——
     * 后者无法反映重试失败、部分完成等情况，会导致进度和状态与子任务实际情况不一致
     */
    public recomputeProgress(): void {
        const subTasks = this.subTasks;
        this.progress.total = subTasks.length;
        this.progress.finished = subTasks.filter(task => task.progress.status === 'complete').length;

        if (subTasks.length > 0 && subTasks.every(task => task.progress.status === 'complete')) {
            this.progress.status = 'complete';
        } else if (subTasks.some(task => task.progress.status === 'error')) {
            this.progress.status = 'error';
        } else if (subTasks.some(task => task.progress.status === 'aborted')) {
            this.progress.status = 'aborted';
        } else if (subTasks.some(task => task.progress.status === 'paused')) {
            this.progress.status = 'paused';
        } else {
            this.progress.status = 'ongoing';
        }
    }
}