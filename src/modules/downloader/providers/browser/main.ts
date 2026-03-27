import { FileItem, PostInfo } from "@/modules/api/types/common.js";
import { BaseDownloadProvider, Feature } from "../../types/base/provider.js";
import { BaseDownloadTask, BaseFileDownloadTask, BaseSavefileTask, ProviderType } from "../../types/base/task.js";
import { IPostDownloadTask, IPostsDownloadTask } from "../../types/interface/post.js";
import { IDownloadProvider } from "../../types/interface/provider.js";
import { DownloadFile, IFileDownloadTask, ISavefileTask, SaveFile, Status } from "../../types/interface/task.js";
import { PostApiResponse } from "@/modules/api/types/post.js";
import { download, logger as globalLogger, Nullable, Queue, saveAs } from "@/utils/main.js";
import { post, profile } from "@/modules/api/main.js";
import { BasePostDownloadTask, BasePostsDownloadTask } from "../../types/base/post.js";
import { Reactive, reactive } from "vue";
import { constructFilename, formatContentHTML, formatContentText, getFullUrl } from "../../utils/main.js";
import { globalStorage } from "@/storage.js";
import { FeatureNotSupportedError } from "../../types/base/error.js";
import { onModuleRegistered, registerGroup } from "@/modules/settings/main.js";
import i18n, { i18nKeys } from "@/i18n/main.js";

const t = i18n.global.t;
const logger = globalLogger.withPath('downloader', 'provider', 'browser');
const storage = globalStorage.withKeys('downloader');

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
    max: storage.get('concurrent'),
    sleep: 0,
});
storage.watch('concurrent', (_key, _oldVal, newVal, _remote) => queueFile.updateConfig({ max: newVal }));

// 设置
const $settings = i18nKeys.$downloader.$provider.$browser.$settings;

onModuleRegistered('downloader', () => {
    registerGroup('downloader', {
        id: 'browser',
        index: 2,
        name: t($settings.$label),
    });
});

/**
 * 保存文件任务  
 * 浏览器内置下载器实现
 */
class BrowserSavefileTask extends BaseSavefileTask implements ISavefileTask {
    public provider: ProviderType = 'browser';
    public init: Promise<void> = Promise.resolve();
    private logger = logger.withPath('BrowserSavefileTask');

    constructor(parent: Nullable<BaseDownloadTask>, file: SaveFile) {
        super(parent, file);
        this.parent = parent ?? null;
        this.progress.status = 'queue';
    }

    async run(): Promise<void> {
        if (this.progress.status === 'ongoing') {
            this.logger.simple('Error', 'calling run while status is ongoing');
            return;
        }
        this.progress.status = 'ongoing';
        this.progress.finished = 0;
        this.progress.total = 1;

        await saveAs(this.file.data, this.file.path);

        this.progress.finished = 1;
        this.progress.status = 'complete';
    }

    /**
     * 取消任务  
     * 保存文件任务**不支持取消**，因此调用此方法没有任何作用
     */
    abort(): void {}

    /**
     * 暂停任务  
     * 保存文件任务**不支持暂停**，因此调用此方法没有任何作用
     */
    pause(): void {}

    /**
     * 取消暂停任务  
     * 保存文件任务**不支持暂停**，因此调用此方法没有任何作用
     */
    unpause(): void {}

    /**
     * 重试任务  
     * 保存文件任务**不存在程序可处理的错误**，因此调用此方法没有任何作用
     */
    retry(): void {}
}

/**
 * 单文件下载任务  
 * 浏览器内置下载器实现
 */
class BrowserFileDownloadTask extends BaseFileDownloadTask implements IFileDownloadTask {
    public provider: ProviderType = 'browser';
    public init: Promise<void> = Promise.resolve();

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

    constructor(parent: Nullable<BaseDownloadTask>, file: DownloadFile) {
        super(parent, file);
        this.parent = parent ?? null;
        this.progress.status = 'queue';
    }

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
                if (this.progress.status !== 'aborted') {
                    // 设置任务完成状态
                    this.progress.status = 'complete';
                    // onprogress未必能保证任务完成时一定会以一个100%进度的回调结尾，因此这里需要手动设置任务进度
                    this.progress.finished = this.progress.total;
                }
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

    /**
     * browser下载方式不支持暂停功能
     */
    pause(): unknown {
        throw new FeatureNotSupportedError('Unsupported feature: pause', this.provider);
    }
    
    /**
     * browser下载方式不支持暂停功能
     */
    unpause(): unknown {
        throw new FeatureNotSupportedError('Unsupported feature: pause', this.provider);
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
     * 重试任务  
     * 重新下载当前文件
     */
    async retry(): Promise<void> {
        // 如果没有错误就什么都不干
        if (this.progress.status !== 'error') return;

        // 重试
        await this.abort();
        await this.run();

        // 设置父级任务状态
        if (this.parent) {
            const progress = this.parent.progress;
            progress.finished++;
            if (progress.finished === progress.total)
                progress.status = 'complete';
        }
    }
}

export class PostDownloadTask extends BasePostDownloadTask implements IPostDownloadTask {
    public provider: ProviderType = 'browser';
    public name: Nullable<string> = null;
    public data: Nullable<PostApiResponse> = null;
    public subTasks: Reactive<(BaseFileDownloadTask | BaseSavefileTask)[]> = reactive([]);
    public dataPromise: Promise<PostApiResponse>;
    public init: Promise<void>;

    /**
     * 一个run过程中pending、run完毕后resolve的Promise  
     * 用于等待run执行完毕  
     * 注意：此Promise和直接调用`run`返回的Promise不是同一个
     */
    private runPromise: Promise<void> = Promise.resolve();

    constructor(parent: Nullable<BaseDownloadTask>, info: PostInfo) {
        super(parent, info);
        this.parent = parent ?? null;

        const { promise, resolve } = Promise.withResolvers<void>();
        this.init = promise;

        // 排队访问API，获取Post数据
        this.dataPromise = queueApi.enqueue(async () => {
            this.data = await post(this.info);
            return this.data;
        });


        // 当api数据获取完毕时
        this.dataPromise.then(async () => {
            // 为post任务设置名称
            this.name = this.data!.post.title;

            // 获取创作者数据
            const creator = await profile({
                service: this.info.service,
                creatorId: this.info.creatorId
            });

            // 先创建抽象任务列表，再分别创建实际任务实例
            /**
             * 抽象任务
             */
            type SubTask = ({
                type: 'download',
                /** API中的文件数据 */
                file: FileItem,
            } | {
                type: 'savefile',
                /** 包含原始文件名的文件数据 */
                file: SaveFile,
            });
            // 每个附件对应一个下载任务
            const files: SubTask[] = this.data!.post.attachments.map(file => ({
                type: 'download', file
            }));
            // 用户未指定不下载封面图时，添加封面图任务
            storage.get('noCoverFile') || files.push({
                type: 'download', file: this.data!.post.file,
            });
            // 用户指定下载文字内容时，添加文字内容，插入到最开始（第0位）
            const saveTextContent = storage.get('textContent');
            if (saveTextContent !== 'none') {
                const sourceHTML = this.data!.post.content;
                const content = saveTextContent === 'txt' ?
                    formatContentText(sourceHTML) :
                    formatContentHTML(sourceHTML);
                files.splice(0, 0, {
                    type: 'savefile',
                    file: {
                        data: content,
                        path: saveTextContent === 'txt' ? 'content.txt' : 'content.html',
                    },
                });
            }
            // 创建任务
            await Promise.allSettled(files.map(async (subTask, i) => {
                let taskInstance: typeof this.subTasks[number];
                switch (subTask.type) {
                    case 'savefile': {
                        const file = subTask.file;
                        const filename = constructFilename({
                            data: {
                                creator: creator,
                                file: {
                                    name: file.path,
                                    path: '__internal_content__',
                                },
                                post: this.data,
                                posts: null,
                            },
                            p: i + 1
                        });
                        taskInstance = new BrowserSavefileTask(this, {
                            data: file.data, path: filename,
                        });
                        break;
                    }
                    case 'download': {
                        const file = subTask.file;
                        const filename = constructFilename({
                            data: {
                                creator: creator,
                                post: this.data!,
                                file: file,
                            },
                            p: i + 1,
                        });
                        const downloadUrl = getFullUrl(file, this.data!);
                        taskInstance = new BrowserFileDownloadTask(
                            this,
                            {
                                url: downloadUrl,
                                path: filename,
                            }
                        );
                        break;
                    }
                }

                this.subTasks.push(taskInstance);
                await taskInstance.init;
            }));
            this.progress.total = files.length;
            this.progress.finished = 0;

            resolve();
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

        // 排队下载所有文件
        this.progress.status = 'ongoing' as Status;
        this.progress.finished = 0;
        this.progress.total = this.subTasks.length;
        await Promise.allSettled(this.subTasks.map(subTask =>
            // fileTask.run内部已存在错误处理逻辑，即使下载出错，这里也不应报错（除非是代码错误）
            subTask.run().then(() => subTask.progress.status === 'complete' && this.progress.finished++)
        ));

        // 下载完毕，设置任务状态
        this.progress.status = this.progress.status === 'aborted' ?
            // 如果任务已取消，则状态依然aborted
            'aborted' :
            // 如果任务没有被取消
            this.hasTaskStatus('error') ?
                // 如果任一文件下载子任务存在错误，即视作任务整体出错
                'error' :
                // 一个错误也没有，任务完成
                'complete';

        // 下载完毕，resolve runPromise
        resolve();
    }

    /**
     * browser下载方式不支持暂停功能
     */
    pause(): unknown {
        throw new FeatureNotSupportedError('Unsupported feature: pause', this.provider);
    }
    
    /**
     * browser下载方式不支持暂停功能
     */
    unpause(): unknown {
        throw new FeatureNotSupportedError('Unsupported feature: pause', this.provider);
    }

    async abort(): Promise<void> {
        if (this.progress.status !== 'queue' && this.progress.status !== 'ongoing') return;
        // 首先设置为aborted状态
        this.progress.status = 'aborted';
        // 然后停止所有子任务
        await Promise.allSettled(this.subTasks.map(task => task.abort()));
        // 等待本次run执行完毕后返回
        await this.runPromise;
    }

    /**
     * 重试任务  
     * 重试所有失败的子任务
     */
    async retry(): Promise<void> {
        // 如果没有错误就什么都不干
        if (this.progress.status !== 'error') return;
        
        // 重试
        this.progress.status = 'ongoing';
        await Promise.allSettled(
            this.subTasks
                .filter(task => task.progress.status === 'error')
                .map(task => task.retry())
        );

        // 设置父级任务状态
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
    hasTaskStatus(status: Status) {
        return this.subTasks.some(task => task.progress.status === status);
    }
}

export class PostsDownloadTask extends BasePostsDownloadTask implements IPostsDownloadTask {
    public provider: ProviderType = 'browser';
    public subTasks: Reactive<PostDownloadTask[]>;
    public name: string;
    public init: Promise<void>;

    /**
     * @param name 下载任务名称
     * @param infos 需要下载的posts信息列表
     */
    constructor(parent: Nullable<BaseDownloadTask>, name: string, infos: PostInfo[]) {
        super(parent, infos);

        // 设置名称
        this.name = name;
        
        // 为所有post创建子任务
        this.subTasks = this.infos.map(info => new PostDownloadTask(this, info));

        // 设置进度
        this.progress.total = this.subTasks.length;

        // 当所有子任务初始化完毕时，当前任务初始化完毕
        const { promise, resolve } = Promise.withResolvers<void>();
        this.init = promise;
        Promise.allSettled(this.subTasks.map(subTask => subTask.init)).then(() => resolve());
    }

    async run(): Promise<void> {
        // 防止重复运行
        if (this.progress.status === 'ongoing') return;

        // 开始下载
        this.progress.finished = 0;
        this.progress.status = 'ongoing' as Status;
        await Promise.allSettled(this.subTasks.map(async task => {
            await task.run();
            task.progress.status === 'complete' && this.progress.finished++;
        }));

        // 设置下载完成状态
        this.progress.status = this.progress.status === 'aborted' ?
            // 如果任务已取消，则状态依然aborted
            'aborted' :
            // 如果任务没有被取消
            this.hasTaskStatus('error') ?
                // 如果任一文件下载子任务存在错误，即视作任务整体出错
                'error' :
                // 一个错误也没有，任务完成
                'complete';
    }

    /**
     * browser下载方式不支持暂停功能
     */
    pause(): unknown {
        throw new FeatureNotSupportedError('Unsupported feature: pause', this.provider);
    }
    
    /**
     * browser下载方式不支持暂停功能
     */
    unpause(): unknown {
        throw new FeatureNotSupportedError('Unsupported feature: pause', this.provider);
    }

    async abort(): Promise<void> {
        if (this.progress.status !== 'queue' && this.progress.status !== 'ongoing') return;
        // 设置abort状态
        this.progress.status = 'aborted';
        // 终止每一个子任务
        await Promise.allSettled(this.subTasks.map(task => task.abort()));
        // 等待本次run完成后返回：由于此时每个子任务都已完成（终止），run自然就已经完成，因此无需额外等待
    }

    /**
     * 重试任务  
     * 重试所有失败的子任务
     */
    async retry(): Promise<void> {
        // 如果没有错误就什么都不干
        if (this.progress.status !== 'error') return;
        
        // 重试
        this.progress.status = 'ongoing';
        await Promise.allSettled(
            this.subTasks
                .filter(task => task.progress.status === 'error')
                .map(task => task.retry())
        );
        
        // 设置父级任务状态
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
    hasTaskStatus(status: Status) {
        return this.subTasks.some(task => task.progress.status === status);
    }
}

export default class BrowserDownloadProvider extends BaseDownloadProvider implements IDownloadProvider {
    public name: ProviderType = 'browser';
    static features: Feature[] = ['concurrent', 'textContent'];

    /**
     * 下载单Post
     * @param info 下载任务信息
     * @returns 
     */
    downloadPost(info: PostInfo): string {
        const task = new PostDownloadTask(null, info);
        this.tasks.push(task);
        task.init.then(() => task.run());
        return task.id;
    }

    /**
     * 下载多Post
     * @param name 下载任务名称
     * @param infos 需要下载的posts信息列表
     */
    downloadPosts(name: string, infos: PostInfo[]): string {
        const task = new PostsDownloadTask(null, name, infos);
        this.tasks.push(task);
        task.init.then(() => task.run());
        return task.id;
    }
}
