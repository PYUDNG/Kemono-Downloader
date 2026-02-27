import { DownloadFile, IDownloadTask, IFileDownloadTask, IMultiFileDownloadTask, Progress, ITask } from "../interface/task.js";
import { v4 as uuid } from "uuid";
import { Reactive, reactive } from "vue";
import { Nullable } from "@/utils/main.js";

// 注意：这里使用 typeof import() 但不实际导入，以避免循环引用
export type ProviderType = keyof typeof import('../../providers/main.js');

export abstract class BaseTask implements ITask {
    public id: string = uuid();
    public readonly type: string = 'task';
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

    /**
     * 终止任务
     * 仅当任务处于`'queue'`或`'ongoing'`状态时有效
     */
    abstract abort(...args: any[]): unknown;
}
export abstract class BaseDownloadTask extends BaseTask implements IDownloadTask {
    public readonly type: string = 'download';
    abstract name: string | null;

    /**
     * 开始下载  
     * 返回一个下载完成时resolve的Promise
     */
    abstract run(...args: any[]): Promise<unknown>;
}
export abstract class BaseFileDownloadTask extends BaseDownloadTask implements IFileDownloadTask {
    public readonly type: string = 'file';
    public name: string;
    file: DownloadFile;

    constructor(parent: Nullable<BaseTask>, file: DownloadFile) {
        super(parent);
        this.file = file;
        this.name = file.path;
    }
};

export abstract class BaseMultiDownloadTask extends BaseDownloadTask implements IMultiFileDownloadTask {
    public readonly type: string = 'multifile';
    public subTasks: Reactive<BaseDownloadTask[]> = reactive([]);
}