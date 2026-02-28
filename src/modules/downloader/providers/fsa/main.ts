import { Nullable, Queue, requestBuffer } from "@/utils/main.js";
import { BaseDownloadTask, BaseFileDownloadTask, ProviderType } from "../../types/base/task";
import { DownloadFile, IFileDownloadTask, Status } from "../../types/interface/task";
import { logger as globalLogger } from "@/utils/main.js";
import { globalStorage } from "@/storage";
import { FeatureNotSupportedError } from "../../types/base/error";
import { ensurePermission, getDirectoryHandleRecursive, getDownloadDirectoryHandle, getFileHandleRecursive, requestNewHandle, streamDownloadToFileHandle, watchDirChange } from "./utils";
import { BasePostDownloadTask, BasePostsDownloadTask } from "../../types/base/post";
import { IPostDownloadTask, IPostsDownloadTask } from "../../types/interface/post";
import { Reactive, reactive, ref, watch } from "vue";
import { PostApiResponse } from "@/modules/api/types/post";
import { PostInfo } from "@/modules/api/types/common";
import { post, profile } from "@/modules/api/main";
import { constructFilename, getFullUrl } from "../../utils/main";
import { BaseDownloadProvider, Feature } from "../../types/base/provider";
import { IDownloadProvider } from "../../types/interface/provider";
import { onModuleRegistered, registerGroup, registerItem } from "@/modules/settings/main.js";
import i18n from "@/i18n/main.js";

const t = i18n.global.t;
const logger = globalLogger.withPath('downloader', 'provider', 'browser');
const storage = globalStorage.withKeys('downloader');

// 设置
const tSettingsPrefix = 'downloader.provider.fsa.settings.';

onModuleRegistered('downloader', () => {
    registerGroup('downloader', {
        id: 'fsa',
        index: 2,
        name: t(tSettingsPrefix + 'label'),
    });
    registerItem('downloader', [{
        id: 'directory',
        label: t(tSettingsPrefix + 'directory.label'),
        caption: t(tSettingsPrefix + 'directory.caption'),
        icon: 'pi pi-folder',
        type: 'button',
        value: (() => {
            // buttons类型的value是按钮的label，且不会从组件内不改变（数据单向流动）
            const label = ref(t(tSettingsPrefix + 'directory.not-selected'));
            // 当保存的目录改变时，更新按钮的label
            watchDirChange((newHandle) => newHandle && (label.value = newHandle.name), true);
            return label;
        }) (),
        props: {
            // 按钮onClick回调
            onClick: () => requestNewHandle().catch(err => {
                if (err instanceof DOMException && err.name === 'AbortError') {
                    // 用户没有选择文件夹就关闭了选择器窗口，会抛出AbortError，属正常现象
                    logger.simple('Detail', 'User cancelled dirctory picking');
                } else {
                    // 抛出了其他未知错误
                    logger.simple('Error', 'Something unexpected happened during requestNewHandle');
                    logger.asLevel('Error', err);
                }
            }),
        },
        group: 'fsa',
    }]);
});

/**
 * FSAProvider 全局共享API访问队列
 */
const queueApi = new Queue({
    max: 3,
    sleep: 500,
});

/**
 * FSAProvider 全局共享文件下载队列
 */
const queueFile = new Queue({
    max: 5,
    sleep: 0,
});

/**
 * 单文件下载任务  
 * 浏览器内置下载器实现
 */
class FSAFileDownloadTask extends BaseFileDownloadTask implements IFileDownloadTask {
    public provider: ProviderType = 'fsa';
    public init: Promise<void> = Promise.resolve();

    /**
     * 用于终止任务的信号控制器
     */
    private controller: AbortController = new AbortController();

    /**
     * 终止任务时是否删除已下载的文件  
     * 这是一个传参属性，在`abort`方法调用后一次性使用
     */
    private deleteFiles: boolean = false;

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
                // 获取文件可写流
                const filepath = this.file.path;
                const dlDirHandle = await getDownloadDirectoryHandle();
                const fileHandle = await getFileHandleRecursive(dlDirHandle, filepath);

                // 写入前确保拥有读写权限
                await ensurePermission(dlDirHandle);
                await ensurePermission(fileHandle);

                // 边下载边写入
                try {
                    // 优先使用原生fetch下载，GM_xhr的progress事件不包含数据
                    await streamDownloadToFileHandle(this.file.url, fileHandle, progress => {
                        this.progress.total = progress.total;
                        this.progress.finished = progress.received;
                    });
                } catch(err) {
                    // 原生fetch报错（预计为cors权限问题），改用GM_xhr兜底
                    logger.simple('Warning', 'native fetch error while downloading, using GM_xmlhttpRequest as fallback')
                    logger.asLevel('Warning', err);

                    const writable = await fileHandle.createWritable({
                        keepExistingData: false,
                        // @ts-ignore `mode`参数存在，但项目使用的ts类型库'@types/wicg-file-system-access'尚未实现此类型
                        mode: 'exclusive',
                    })
                    let lastBytesLoaded = 0;
                    const writeChunk = async (buffer: ArrayBuffer) => {
                        const chunk = buffer.slice(lastBytesLoaded);
                        if (chunk.byteLength > 0) {
                            await writable.write(chunk);
                            lastBytesLoaded += chunk.byteLength;
                        }
                    };
                    await requestBuffer({
                        url: this.file.url,
                        onprogress: async e => {
                            // 写入文件
                            if (e.response) await writeChunk(e.response);
                            // 更新进度
                            this.progress.total = (e.total ?? e.totalSize ?? -1) || -1;
                            this.progress.finished = (e.done ?? e.loaded ?? -1) || -1;
                        },
                        onload: async e => {
                            // 写入文件
                            await writeChunk(e.response);
                            // 更新进度
                            this.progress.finished = this.progress.total;
                        }
                    }, currentRunSignal);
                    await writable.close();
                }

                // 
                if (this.progress.status as Status !== 'aborted') {
                    // 如果任务没有被取消，那就意味着任务成功完成了
                    this.progress.status = 'complete';
                } else {
                    // 坏了，下载任务被取消了
                    // 根据传参属性决定是否删除已下载的文件
                    if (this.deleteFiles) {
                        const dirPath = (await dlDirHandle.resolve(fileHandle))!.join('/');
                        const dirHandle = await getDirectoryHandleRecursive(dlDirHandle, dirPath);
                        await dirHandle.removeEntry(fileHandle.name);
                    }
                }
            } catch (err) {
                // 下载出错
                // 控制台报错
                logger.simple('Error', 'download error');
                logger.asLevel('Error', err);
                // 设置任务状态
                if (this.progress.status !== 'aborted')
                    this.progress.status = 'error';
            }
        }, currentRunSignal).catch(() => {});

        // 下载完毕，resolve runPromise
        resolve();
    }

    /**
     * fsa下载方式暂时不支持暂停功能（后续添加）
     */
    pause(): unknown {
        throw new FeatureNotSupportedError('Unsupported feature: pause', this.provider);
    }
    
    /**
     * fsa下载方式暂时不支持暂停功能（后续添加）
     */
    unpause(): unknown {
        throw new FeatureNotSupportedError('Unsupported feature: pause', this.provider);
    }

    /**
     * 终止下载任务
     * @param deleteFiles 是否删除已下载的文件
     */
    async abort(deleteFiles: boolean): Promise<void> {
        if (this.progress.status !== 'queue' && this.progress.status !== 'ongoing') return;
        // 首先设置为aborted状态
        this.progress.status = 'aborted';
        // 然后立即发送abort信号
        this.deleteFiles = deleteFiles;
        this.controller?.abort();
        // 等待本次run执行完毕后返回
        await this.runPromise;
    }
}

export class PostDownloadTask extends BasePostDownloadTask implements IPostDownloadTask {
    public provider: ProviderType = 'fsa';
    public name: Nullable<string> = null;
    public data: Nullable<PostApiResponse> = null;
    public subTasks: Reactive<BaseFileDownloadTask[]> = reactive([]);
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

            // 为每个文件创建下载任务
            const files = [this.data!.post.file, ...this.data!.post.attachments];
            storage.get('noCoverFile') && files.shift();
            await Promise.allSettled(files.map(async (file, i) => {
                const creator = await profile({
                    service: this.info.service,
                    creatorId: this.info.creatorId
                });
                const filename = constructFilename({
                    data: {
                        creator: creator,
                        post: this.data!,
                        file: file,
                    },
                    p: i + 1,
                });
                const downloadUrl = getFullUrl(file, this.data!);
                const fileTask = new FSAFileDownloadTask(
                    this,
                    {
                        url: downloadUrl,
                        path: filename,
                    }
                );
                this.subTasks.push(fileTask);

                // 根据文件下载任务状态，更新Post下载任务状态
                watch(() => fileTask.progress.status, (newVal, oldVal) => {
                    if (newVal === 'complete') this.progress.finished++;
                    if (oldVal === 'complete') this.progress.finished--;
                    if (this.hasTaskStatus('ongoing') || this.hasTaskStatus('queue')) {
                        this.progress.status = 'ongoing';
                    } else if (this.hasTaskStatus('aborted')) {
                        this.progress.status = 'aborted';
                    } else if (this.hasTaskStatus('error')) {
                        this.progress.status = 'error';
                    } else if (this.subTasks.every(t => t.progress.status === 'complete')) {
                        this.progress.status = 'complete';
                    }
                });
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
        await Promise.allSettled(this.subTasks.map(subTask =>
            // fileTask.run内部已存在错误处理逻辑，即使下载出错，这里也不应报错（除非是代码错误）
            subTask.run()
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
     * fsa下载方式暂不支持暂停功能（后续添加）
     */
    pause(): unknown {
        throw new FeatureNotSupportedError('Unsupported feature: pause', this.provider);
    }
    
    /**
     * fsa下载方式暂不支持暂停功能（后续添加）
     */
    unpause(): unknown {
        throw new FeatureNotSupportedError('Unsupported feature: pause', this.provider);
    }

    /**
     * 终止下载任务
     * @param deleteFiles 是否删除已下载的文件
     */
    async abort(deleteFiles: boolean): Promise<void> {
        if (this.progress.status !== 'queue' && this.progress.status !== 'ongoing') return;
        // 首先设置为aborted状态
        this.progress.status = 'aborted';
        // 然后停止所有子任务
        await Promise.allSettled(this.subTasks.map(task => task.abort(deleteFiles)));
        // 等待本次run执行完毕后返回
        await this.runPromise;
    }

    /**
     * 检查所有subTasks中是否存在给定状态的task
     */
    hasTaskStatus(status: Status) {
        return this.subTasks.some(task => task.progress.status === status);
    }
}

export class PostsDownloadTask extends BasePostsDownloadTask implements IPostsDownloadTask {
    public provider: ProviderType = 'fsa';
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
            this.progress.finished++;
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
     * fsa下载方式暂不支持暂停功能（后续添加）
     */
    pause(): unknown {
        throw new FeatureNotSupportedError('Unsupported feature: pause', this.provider);
    }
    
    /**
     * fsa下载方式暂不支持暂停功能（后续添加）
     */
    unpause(): unknown {
        throw new FeatureNotSupportedError('Unsupported feature: pause', this.provider);
    }

    /**
     * 终止下载任务
     * @param deleteFiles 是否删除已下载的文件
     */
    async abort(deleteFiles: boolean): Promise<void> {
        if (this.progress.status !== 'queue' && this.progress.status !== 'ongoing') return;
        // 设置abort状态
        this.progress.status = 'aborted';
        // 终止每一个子任务
        await Promise.allSettled(this.subTasks.map(task => task.abort(deleteFiles)));
        // 等待本次run完成后返回：由于此时每个子任务都已完成（终止），run自然就已经完成，因此无需额外等待
    }

    /**
     * 检查所有subTasks中是否存在给定状态的task
     */
    hasTaskStatus(status: Status) {
        return this.subTasks.some(task => task.progress.status === status);
    }
}

export default class BrowserDownloadProvider extends BaseDownloadProvider implements IDownloadProvider {
    public name: ProviderType = 'fsa';
    static features: Feature[] = ['abortFiles'];

    /**
     * 下载单Post
     * @param info 下载任务信息
     * @returns 
     */
    async downloadPost(info: PostInfo): Promise<string> {
        // 初始化下载文件夹，确保任务创建时有一个可读写的下载目录
        await getDownloadDirectoryHandle();

        // 创建任务并开始执行
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
    async downloadPosts(name: string, infos: PostInfo[]): Promise<string> {
        // 初始化下载文件夹，确保任务创建时有一个可读写的下载目录
        await getDownloadDirectoryHandle();

        // 创建任务并开始执行
        const task = new PostsDownloadTask(null, name, infos);
        this.tasks.push(task);
        task.init.then(() => task.run());
        return task.id;
    }
}

export { checkCompatibility } from './utils.js';
