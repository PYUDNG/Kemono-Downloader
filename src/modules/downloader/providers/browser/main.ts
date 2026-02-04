import { PostInfo } from "@/modules/api/types/common.js";
import { BaseDownloadProvider } from "../../types/base/provider.js";
import { BaseFileDownloadTask } from "../../types/base/task.js";
import { IPostDownloadTask } from "../../types/interface/post.js";
import { IDownloadProvider } from "../../types/interface/provider.js";
import { IFileDownloadTask, Status } from "../../types/interface/task.js";
import { PostApiResponse } from "@/modules/api/types/post.js";
import { download, logger as globalLogger, Queue } from "@/utils/main.js";
import { post } from "@/modules/api/main.js";
import { BasePostDownloadTask } from "../../types/base/post.js";
import { Reactive, reactive, watch } from "vue";

const logger = globalLogger.withPath('downloader', 'provider', 'browser');

/**
 * BrowserProvider 全局共享API访问队列
 */
const queueApi = new Queue({
    max: 3,
    sleep: 500,
});

/**
 * BrowserProvider 全局共享文件下载队列
 */
const queueFile = new Queue({
    max: 5,
    sleep: 0,
});

logger.log('Debug', 'raw', 'log', queueFile);

/**
 * 单文件下载任务  
 * 浏览器内置下载器实现
 */
class BrowserFileDownloadTask extends BaseFileDownloadTask implements IFileDownloadTask {
    /**
     * 用于终止任务的信号控制器
     */
    private controller: AbortController = new AbortController();

    /**
     * 一个run过程中pending、run完毕后resolve的Promise  
     * 用于等待run执行完毕  
     * 注意：此Promise和直接调用`run`返回的Promise不是同一个
     */
    private runPromise: Promise<void> = Promise.resolve();

    private logger = logger.withPath('BrowserFileDownloadTask');

    /**
     * 开始下载文件
     */
    async run(): Promise<void> {
        if (this.progress.status === 'ongoing') {
            this.logger.simple('Error', 'calling run while status is ongoing');
            return;
        }

        // 更新runPromise
        const { promise, resolve } = Promise.withResolvers<void>();
        this.runPromise = promise;

        // 提供abort方法
        // 更新AbortSiginal
        if (this.controller.signal.aborted) this.controller = new AbortController();
        const currentRunSignal = this.controller.signal;

        // 排队下载文件
        await queueFile.enqueue(async () => {
            this.progress.status = 'ongoing' as Status;
            this.progress.total = this.progress.finished = -1;

            // 带错误处理地下载文件
            try {
                // 下载文件
                await download({
                    url: this.file.url,
                    name: this.file.path,
                    onprogress: e => {
                        this.progress.total = (e.total ?? e.totalSize ?? -1) || -1;
                        this.progress.finished = (e.done ?? e.loaded ?? -1) || -1;
                    }
                }, currentRunSignal);

                // 如果任务没有被取消，那就意味着任务成功完成了
                if (this.progress.status !== 'aborted')
                    this.progress.status = 'complete';
            } catch (err) {
                console.log('err', err);
                // 下载出错，设置任务状态
                if (this.progress.status !== 'aborted')
                    this.progress.status = 'error';
            }
        }, currentRunSignal).catch(() => {});

        // 下载完毕，resolve runPromise
        resolve();
    }

    async abort(): Promise<void> {
        if (this.progress.status !== 'queue' && this.progress.status !== 'ongoing') return;
        // 首先设置为aborted状态
        this.progress.status = 'aborted';
        // 然后立即发送abort信号
        this.controller?.abort();
        // 等待本次run执行完毕后返回
        await this.runPromise;
    }
}

export class PostDownloadTask extends BasePostDownloadTask implements IPostDownloadTask {
    public name: string = '';
    public data: PostApiResponse | null = null;
    public fileTasks: Reactive<BaseFileDownloadTask[]> = reactive([]);
    public dataPromise: Promise<PostApiResponse>;

    /**
     * 用于终止任务的信号控制器
     */
    private controller: AbortController = new AbortController();

    /**
     * 一个run过程中pending、run完毕后resolve的Promise  
     * 用于等待run执行完毕  
     * 注意：此Promise和直接调用`run`返回的Promise不是同一个
     */
    private runPromise: Promise<void> = Promise.resolve();

    constructor(info: PostInfo) {
        super(info);

        // 排队访问API，获取Post数据
        this.dataPromise = queueApi.enqueue(async () => {
            this.data = await post(this.info.service, this.info.creatorId, this.info.postId);
            return this.data;
        });

        // 提供abort方法
        this.provideAbortSignal();

        // 当api数据获取完毕时
        this.dataPromise.then(() => {
            // 为post任务设置名称
            this.name = this.data!.post.title;

            // 为每个文件创建下载任务
            const files = [this.data!.post.file, ...this.data!.post.attachments];
            files.forEach(file => {
                const fileTask = new BrowserFileDownloadTask({
                    url: `https://n1.${location.hostname}/data` + file.path,
                    path: file.name,
                });
                this.fileTasks.push(fileTask);

                // 根据文件下载任务状态，更新Post下载任务状态
                watch(() => fileTask.progress.status, (newVal, oldVal) => {
                    if (newVal === 'complete') this.progress.finished++;
                    if (oldVal === 'complete') this.progress.finished--;
                    if (this.hasFileStatus('ongoing') || this.hasFileStatus('queue')) {
                        this.progress.status = 'ongoing';
                    } else if (this.hasFileStatus('aborted')) {
                        this.progress.status = 'aborted';
                    } else if (this.hasFileStatus('error')) {
                        this.progress.status = 'error';
                    } else if (this.fileTasks.every(t => t.progress.status === 'complete')) {
                        this.progress.status = 'complete';
                    }
                });
            });
            this.progress.total = files.length;
            this.progress.finished = 0;
        });
    }

    /**
     * 下载post
     */
    async run() {
        // 更新runPromise
        const { promise, resolve } = Promise.withResolvers<void>();
        this.runPromise = promise;

        // 确保api数据已获取完毕
        await this.dataPromise;

        // 更新AbortSiginal
        if (this.controller.signal.aborted) this.provideAbortSignal();

        // 排队下载所有文件
        this.progress.status = 'ongoing' as Status;
        await Promise.allSettled(this.fileTasks.map(fileTask =>
            // fileTask.run内部已存在错误处理逻辑，即使下载出错，这里也不应报错（除非是代码错误）
            fileTask.run()
        ));

        // 下载完毕，设置任务状态
        this.progress.status = this.progress.status === 'aborted' ?
            // 如果任务已取消，则状态依然aborted
            'aborted' :
            // 如果任务没有被取消
            this.hasFileStatus('error') ?
                // 如果任一文件下载子任务存在错误，即视作任务整体出错
                'error' :
                // 一个错误也没有，任务完成
                'complete';

        // 下载完毕，resolve runPromise
        resolve();
    }

    async abort(): Promise<void> {
        if (this.progress.status !== 'queue' && this.progress.status !== 'ongoing') return;
        // 首先设置为aborted状态
        this.progress.status = 'aborted';
        // 然后立即发送abort信号
        this.controller?.abort();
        // 等待本次run执行完毕后返回
        await this.runPromise;
    }

    /**
     * 更换新的AbortSignal
     */
    provideAbortSignal() {
        this.controller = new AbortController();
        this.controller.signal.addEventListener('abort', () =>
            this.fileTasks.forEach(fileTask => fileTask.abort()));
    }

    /**
     * 检查所有fileTasks中是否存在给定状态的task
     */
    hasFileStatus(status: Status) {
        return this.fileTasks.some(task => task.progress.status === status);
    }
}

export default class BrowserDownloadProvider extends BaseDownloadProvider implements IDownloadProvider {
    downloadPost(info: PostInfo): string {
        const task = new PostDownloadTask(info);
        this.tasks.push(task);
        task.run();
        return task.id;
    }
}