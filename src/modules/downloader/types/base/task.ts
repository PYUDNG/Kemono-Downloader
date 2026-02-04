import { DownloadFile, IDownloadTask, IFileDownloadTask, IMultiFileDownloadTask, Progress, ITask } from "../interface/task.js";
import { v4 as uuid } from "uuid";
import { Reactive, reactive } from "vue";

export abstract class BaseTask implements ITask {
    public id: string = uuid();
    public readonly type: string = 'task';
    public progress: Reactive<Progress> = reactive({
        total: -1,
        finished: -1,
        status: 'queue'
    });
    /**
     * 开始执行任务
     * 如果是同步任务，应在任务完成后返回
     * 如果是异步任务，应当返回一个在任务完成时resolve的Promise
     */
    abstract run(): unknown;

    /**
     * 终止任务
     * 仅当任务处于`'queue'`或`'ongoing'`状态时有效
     */
    abstract abort(): unknown;
}
export abstract class BaseDownloadTask extends BaseTask implements IDownloadTask {
    public readonly type: string = 'download';
    abstract name: string;

    /**
     * 开始下载
     * 返回一个下载完成时resolve的Promise
     */
    abstract run(): Promise<unknown>;
}
export abstract class BaseFileDownloadTask extends BaseDownloadTask implements IFileDownloadTask {
    public readonly type: string = 'file';
    public name: string;
    file: DownloadFile;

    constructor(file: DownloadFile) {
        super();
        this.file = file;
        this.name = file.path;
    }
};

export abstract class BaseMultiFileDownloadTask extends BaseDownloadTask implements IMultiFileDownloadTask {
    public readonly type: string = 'multifile';
    public fileTasks: Reactive<IFileDownloadTask[]> = reactive([]);
}