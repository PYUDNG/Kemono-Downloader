import { FileItem, PostInfo } from "@/modules/api/types/common.js";
import { BaseDownloadProvider, Feature } from "../../types/base/provider.js";
import { BaseDownloadTask, BaseFileDownloadTask, BaseMultiDownloadTask, BaseSavefileTask, BaseTask, ProviderType } from "../../types/base/task.js";
import { IDiscordChannelDownloadTask, IDiscordServerDownloadTask, IPostDownloadTask, IPostsDownloadTask } from "../../types/interface/post.js";
import { IDownloadProvider } from "../../types/interface/provider.js";
import { DownloadFile, IFileDownloadTask, ISavefileTask, SaveFile, Status } from "../../types/interface/task.js";
import { PostApiResponse } from "@/modules/api/types/post.js";
import { download, logger as globalLogger, htmlEncode, Nullable, Queue, saveAs } from "@/utils/main.js";
import { discord, isErrorResponse, post, profile } from "@/modules/api/main.js";
import { BaseDiscordChannelDownloadTask, BaseDiscordServerDownloadTask, BasePostDownloadTask, BasePostsDownloadTask } from "../../types/base/post.js";
import { Reactive, reactive } from "vue";
import { constructFilename, formatContentHTML, formatContentText, getFullUrl } from "../../utils/main.js";
import { globalStorage } from "@/storage.js";
import { FeatureNotSupportedError } from "../../types/base/error.js";
import { onModuleRegistered, registerGroup } from "@/modules/settings/main.js";
import i18n, { i18nKeys } from "@/i18n/main.js";
import { DiscordChannelApiResponse, DiscordChannelPost, DiscordServerApiResponse } from "@/modules/api/types/discord.js";

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

        // 根据本任务实际的重试结果，让父级任务重新计算进度和状态
        // 而不是盲目假设重试一定成功
        if (this.parent instanceof BaseMultiDownloadTask) this.parent.recomputeProgress();
    }
}

export class BrowserPostDownloadTask extends BasePostDownloadTask implements IPostDownloadTask {
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

        const { promise, resolve, reject } = Promise.withResolvers<void>();
        this.init = promise;

        // 排队访问API，获取Post数据
        this.dataPromise = queueApi.enqueue(async () => {
            const data = await post(this.info);
            if (isErrorResponse(data)) throw new Error(data.error);
            this.data = data;
            return this.data;
        });

        // 当api数据获取完毕时
        this.dataPromise.then(async () => {
          try {
            // 为post任务设置名称
            this.name = this.data!.post.title;

            // 获取创作者数据
            const creator = await profile({
                service: this.info.service,
                creatorId: this.info.creatorId
            });
            if (isErrorResponse(creator)) throw new Error(creator.error);

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
            const results = await Promise.allSettled(files.map(async (subTask, i) => {
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

            // 子任务创建/初始化失败时，不能静默忽略——否则父任务可能在缺失文件的情况下报告"完成"
            const failed = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
            if (failed.length > 0) {
                throw new Error(`Failed to initialize ${failed.length}/${files.length} subtask(s): ${failed.map(r => r.reason).join('; ')}`);
            }

            this.progress.total = files.length;
            this.progress.finished = 0;

            resolve();
          } catch (err) {
            this.progress.status = 'error';
            reject(err);
          }
        }).catch(err => {
            // dataPromise本身被reject的情况也会走到这里（此时上面的try块从未执行）
            this.progress.status = 'error';
            reject(err);
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

        // 根据子任务的实际状态重新计算自身进度和状态，而不是盲目假设重试一定成功
        this.recomputeProgress();

        // 同步通知父级任务根据其子任务的实际状态重新计算进度
        if (this.parent instanceof BaseMultiDownloadTask) this.parent.recomputeProgress();
    }

    /**
     * 检查所有subTasks中是否存在给定状态的task
     */
    hasTaskStatus(status: Status) {
        return this.subTasks.some(task => task.progress.status === status);
    }
}

export class BrowserPostsDownloadTask extends BasePostsDownloadTask implements IPostsDownloadTask {
    public provider: ProviderType = 'browser';
    public subTasks: Reactive<BrowserPostDownloadTask[]>;
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
        this.subTasks = this.infos.map(info => new BrowserPostDownloadTask(this, info));

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
        
        // 根据子任务的实际状态重新计算自身进度和状态，而不是盲目假设重试一定成功
        this.recomputeProgress();

        // 同步通知父级任务根据其子任务的实际状态重新计算进度
        if (this.parent instanceof BaseMultiDownloadTask) this.parent.recomputeProgress();
    }

    /**
     * 检查所有subTasks中是否存在给定状态的task
     */
    hasTaskStatus(status: Status) {
        return this.subTasks.some(task => task.progress.status === status);
    }
}

export class BrowserDiscordChannelDownloadTask extends BaseDiscordChannelDownloadTask implements IDiscordChannelDownloadTask {
    public provider: ProviderType = 'browser';
    public subTasks: Reactive<(BrowserFileDownloadTask | BrowserSavefileTask)[]> = [];
    public name: string;
    public data: Nullable<DiscordChannelApiResponse> = null;
    public init: Promise<void>;
    private logger = logger.withPath('BaseDiscordChannelDownloadTask');

    /**
     * 一个run过程中pending、run完毕后resolve的Promise  
     * 用于等待run执行完毕  
     * 注意：此Promise和直接调用`run`返回的Promise不是同一个
     */
    private runPromise: Promise<void> = Promise.resolve();

    /**
     * @param parent 父级任务（不可省略，需有父级任务后才能传入此任务名称，因为频道名只有ServerAPI才提供）
     * @param name 任务名称（应为频道名称，由父级任务传入）
     * @param channelId Discord频道ID
     */
    constructor(parent: BaseDownloadTask, name: string, channelId: string) {
        super(parent, channelId);

        // init promise
        const { promise, resolve, reject } = Promise.withResolvers<void>();
        this.init = promise;

        // 设置名称
        this.name = name;

        // 排队访问API，获取Post数据
        const dataPromise = queueApi.enqueue(async () => {
            const data = await discord({ channelId: this.channelId });
            if (isErrorResponse(data)) throw new Error(data.error);
            this.data = data;
            return this.data;
        });

        // 当api数据获取完毕时
        dataPromise.then(async posts => {
          try {
            // 先创建抽象任务列表，再分别创建实际任务实例
            /**
             * 抽象任务
             */
            type SubTask = ({
                type: 'download';
                /** API中的文件数据 */
                file: FileItem;
                /** 对应Post的API数据 */
                data: DiscordChannelPost;
            } | {
                type: 'savefile';
                /** 包含原始文件名的文件数据 */
                file: SaveFile;
                /** 对应Post的API数据 */
                data: DiscordChannelPost;
            });

            /**
             * 抽象任务列表
             */
            const files: SubTask[] = [];

            // 为文字内容创建抽象任务
            const textContent = storage.get('textContent');
            if (textContent !== 'none' && posts.length > 0) {
                const content = ({
                    html: posts.map(post => `<p>${ htmlEncode(post.content) }</p>`).join('\n'),
                    txt: posts.map(post => post.content).join('\n'),
                } satisfies Record<typeof textContent, string>) [textContent];
                files.push({
                    type: 'savefile',
                    file: {
                        data: content,
                        path: textContent === 'txt' ? 'content.txt' : 'content.html',
                    },
                    data: posts[0],
                });
            }

            // 为每个附件创建抽象任务
            posts.forEach(post => post.attachments.forEach(file => files.push({
                type: 'download',
                file: file,
                data: post,
            })));

            // 按照抽象任务列表创建实际任务
            const results = await Promise.allSettled(files.map(async (subTask, i) => {
                let taskInstance: typeof this.subTasks[number];
                switch (subTask.type) {
                    case 'savefile': {
                        const file = subTask.file;
                        const filename = constructFilename({
                            data: {
                                discord: subTask.data,
                                file: {
                                    name: file.path,
                                    path: '__internal_content__',
                                },
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
                                discord: subTask.data,
                                file: file,
                            },
                            p: i + 1,
                        });
                        const downloadUrl = getFullUrl(file);
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

            // 子任务创建/初始化失败时，不能静默忽略——否则父任务可能在缺失文件的情况下报告"完成"
            const failed = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
            if (failed.length > 0) {
                throw new Error(`Failed to initialize ${failed.length}/${files.length} subtask(s): ${failed.map(r => r.reason).join('; ')}`);
            }

            this.progress.total = files.length;
            this.progress.finished = 0;

            resolve();
          } catch (err) {
            this.progress.status = 'error';
            reject(err);
          }
        }).catch(err => {
            this.progress.status = 'error';
            reject(err);
        });
    }

    async run(): Promise<void> {
        // 检查当前任务状态
        const runnable: Status[] = ['queue', 'complete', 'aborted', 'error'];
        if (!runnable.includes(this.progress.status)) {
            this.logger.simple('Error', 'calling run in invalid status');
            return;
        }

        // 设置runPromise
        const { promise, resolve } = Promise.withResolvers<void>();
        this.runPromise = promise;

        // 设置任务状态
        this.progress.status = 'ongoing' as Status;
        this.progress.finished = 0;
        this.progress.total = this.subTasks.length;

        // 执行所有子任务
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
        
        // 下载完毕，resolve run promise
        resolve();
    }

    async abort(): Promise<void> {
        // 先设置任务状态
        this.progress.status = 'aborted';

        // 停止所有子任务
        await Promise.allSettled(this.subTasks.map(task => Promise.resolve(task.abort())));

        // 等待run执行完毕
        await this.runPromise;
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

        // 根据子任务的实际状态重新计算自身进度和状态，而不是盲目假设重试一定成功
        this.recomputeProgress();

        // 同步通知父级任务根据其子任务的实际状态重新计算进度
        if (this.parent instanceof BaseMultiDownloadTask) this.parent.recomputeProgress();
    }

    /**
     * 检查所有subTasks中是否存在给定状态的task
     */
    hasTaskStatus(status: Status) {
        return this.subTasks.some(task => task.progress.status === status);
    }
}

export class BrowserDiscordServerDownloadTask extends BaseDiscordServerDownloadTask implements IDiscordServerDownloadTask {
    public provider: ProviderType = 'browser';
    public subTasks: Reactive<BrowserDiscordChannelDownloadTask[]> = [];
    public data: Nullable<DiscordServerApiResponse> = null;
    public name: Nullable<string> = null;
    public init: Promise<void>;
    private logger = logger.withPath('BaseDiscordServerDownloadTask');

    /**
     * 一个run过程中pending、run完毕后resolve的Promise  
     * 用于等待run执行完毕  
     * 注意：此Promise和直接调用`run`返回的Promise不是同一个
     */
    private runPromise: Promise<void> = Promise.resolve();

    constructor(parent: Nullable<BaseTask>, serverId: string) {
        super(parent, serverId);

        // init promise
        const { promise, resolve, reject } = Promise.withResolvers<void>();
        this.init = promise;

        // 加载API数据
        const dataPromise = queueApi.enqueue(async () => {
            const data = await discord({ serverId: this.serverId });
            if (isErrorResponse(data)) throw new Error(data.error);
            this.data = data;
            return this.data;
        });

        // API加载完毕时
        dataPromise.then(async data => {
            // 设置任务名称
            this.name = data.name;

            // 为每个频道创建下载任务
            for (const channel of data.channels) {
                this.subTasks.push(new BrowserDiscordChannelDownloadTask(
                    this, channel.name, channel.id,
                ));
            }
            await Promise.allSettled(this.subTasks.map(t => t.init));
            resolve();
        }).catch(err => {
            // dataPromise本身被reject的情况下，上面的then回调不会执行，init会永远pending，因此需要在此显式reject
            this.progress.status = 'error';
            reject(err);
        });
    }

    async run(): Promise<void> {
        // 检查当前任务状态
        const runnable: Status[] = ['queue', 'complete', 'aborted', 'error'];
        if (!runnable.includes(this.progress.status)) {
            this.logger.simple('Error', 'calling run in invalid status');
            return;
        }

        // 设置runPromise
        const { promise, resolve } = Promise.withResolvers<void>();
        this.runPromise = promise;

        // 设置任务状态
        this.progress.status = 'ongoing' as Status;
        this.progress.finished = 0;
        this.progress.total = this.subTasks.length;

        // 执行所有子任务
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
        
        // 下载完毕，resolve run promise
        resolve();
    }

    async abort(): Promise<void> {
        // 先设置任务状态
        this.progress.status = 'aborted';

        // 停止所有子任务
        await Promise.allSettled(this.subTasks.map(task => Promise.resolve(task.abort())));

        // 等待run执行完毕
        await this.runPromise;
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

        // 根据子任务的实际状态重新计算自身进度和状态，而不是盲目假设重试一定成功
        this.recomputeProgress();

        // 同步通知父级任务根据其子任务的实际状态重新计算进度
        if (this.parent instanceof BaseMultiDownloadTask) this.parent.recomputeProgress();
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
        const task = new BrowserPostDownloadTask(null, info);
        this.tasks.push(task);
        this.runWithRetry(task);
        return task.id;
    }

    /**
     * 下载多Post
     * @param name 下载任务名称
     * @param infos 需要下载的posts信息列表
     */
    downloadPosts(name: string, infos: PostInfo[]): string {
        const task = new BrowserPostsDownloadTask(null, name, infos);
        this.tasks.push(task);
        this.runWithRetry(task);
        return task.id;
    }

    /**
     * 带自动错误重试逻辑地执行任务
     * @param task 需要执行的任务
     */
    private async runWithRetry(task: BaseTask) {
        // 等待任务初始化完毕
        // init可能因为API请求失败、子任务创建失败等原因reject，此时任务状态已在任务内部设置为error，
        // 这里只需避免产生未处理的promise rejection并中止后续流程
        try {
            await task.init;
        } catch (err) {
            logger.simple('Error', `task initialization failed: ${err}`);
            return;
        }

        // 首先执行一次
        await task.run();

        // 后续错误重试逻辑
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
