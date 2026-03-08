import { PostInfo } from "@/modules/api/types/common.js";
import { BaseDownloadProvider, Feature } from "../../types/base/provider.js";
import { BaseDownloadTask, BaseFileDownloadTask, ProviderType } from "../../types/base/task.js";
import { IPostDownloadTask, IPostsDownloadTask } from "../../types/interface/post.js";
import { IDownloadProvider } from "../../types/interface/provider.js";
import { DownloadFile, IFileDownloadTask, Status } from "../../types/interface/task.js";
import { PostApiResponse } from "@/modules/api/types/post.js";
import { debounce, logger as globalLogger, Nullable, Queue, toast } from "@/utils/main.js";
import { post, profile } from "@/modules/api/main.js";
import { BasePostDownloadTask, BasePostsDownloadTask } from "../../types/base/post.js";
import { Reactive, reactive, ref, watch } from "vue";
import { Aria2IntervalCallsManager, constructFilename, getFullUrl } from "../../utils/main.js";
import { globalStorage, makeStorageRef } from "@/storage.js";
import { onModuleRegistered, registerGroup, registerItem } from "@/modules/settings/main.js";
import i18n, { i18nKeys } from "@/i18n/main.js";
import { open, createWebSocket, createHTTP, Aria2RpcWebSocketUrl, Aria2RpcHTTPUrl, OpenOptions, close, Conn } from "maria2";
import { buildPath, path2DirFile, ARIA2_STATUS_MAP, Aria2Status} from "./utils.js";
import mitt from "mitt";

const t = i18n.global.t;
const logger = globalLogger.withPath('downloader', 'provider', 'aria2');
const storage = globalStorage.withKeys('downloader').withKeys('providerSettings').withKeys('aria2');

/**
 * 轮询操作的时间周期（毫秒）
 * @todo 实现对此常量的用户设置
 */
const ARIA2_INTERVAL = 1000;
const manager = new Aria2IntervalCallsManager(null, ARIA2_INTERVAL);

/**
 * Aria2Provider 全局共享API访问队列
 */
const queueApi = new Queue({
    max: 3,
    sleep: 500,
});

// 设置
const $settings = i18nKeys.$downloader.$provider.$aria2.$settings;

onModuleRegistered('downloader', () => {
    registerGroup('downloader', {
        id: 'aria2',
        index: 2,
        name: t($settings.$label),
    });

    registerItem('downloader', [{
        id: 'endpoint',
        type: 'text',
        label: t($settings.$endpoint.$label),
        caption: t($settings.$endpoint.$caption),
        icon: 'pi pi-server',
        props: {
            placeholder: storage.default('endpoint'),
        },
        value: makeStorageRef('endpoint', storage),
        group: 'aria2',
    }, {
        id: 'secret',
        type: 'password',
        label: t($settings.$secret.$label),
        caption: t($settings.$secret.$caption),
        icon: 'pi pi-key',
        props: {
            feedback: false,
        },
        value: makeStorageRef('secret', storage),
        group: 'aria2',
    }, {
        id: 'dir',
        type: 'text',
        label: t($settings.$dir.$label),
        caption: t($settings.$dir.$caption),
        help: t($settings.$dir.$help),
        icon: 'pi pi-folder',
        value: makeStorageRef('dir', storage),
        group: 'aria2',
    }, {
        id: 'connection-test',
        type: 'button',
        label: t($settings.$connectionTest.$label),
        caption: t($settings.$connectionTest.$caption),
        icon: 'pi pi-wifi',
        value: ref(t($settings.$connectionTest.$button)),
        props: {
            async onClick() {
                const $toast = $settings.$connectionTest.$toast;
                if (!aria2) {
                    toast({
                        severity: 'error',
                        life: 3000,
                        summary: t($toast.$notEnabled.$title),
                        detail: t($toast.$notEnabled.$message),
                    });
                    return;
                }

                type Aria2Version = {
                    version: string;
                    enabledFeatures: string[];
                };

                await aria2.sendRequest<Aria2Version>(
                    { method: 'aria2.getVersion' },
                ).then(version => {
                    // 连接成功
                    logger.simple('Detail', 'aria2 server connection ok');
                    logger.asLevel('Detail', version);
                    toast({
                        severity: 'success',
                        life: 3000,
                        summary: t($toast.$granted.$title),
                        detail: t($toast.$granted.$message, { version: version.version }),
                    });
                }, err => {
                    // 存在授权或其他问题
                    logger.simple('Error', 'error connecting aria2 server');
                    logger.asLevel('Error', err);
                    toast({
                        severity: 'error',
                        life: 3000,
                        summary: t($toast.$failed.$title),
                        detail: t($toast.$failed.$message),
                    });
                });
            }
        },
        group: 'aria2',
    }, ]);
});

// 连接Aria2服务端，并开启Aria2周期任务循环
const currentProvider = makeStorageRef('provider', globalStorage.withKeys('downloader'));
const serverUrl = makeStorageRef('endpoint', storage);
const secret = makeStorageRef('secret', storage);

/**
 * Aria2实例
 */
let aria2: Nullable<Conn> = null;
watch(() => ({
    currentProvider: currentProvider.value,
    serverUrl: serverUrl.value,
    secret: secret.value,
}), debounce(async ({ currentProvider, serverUrl, secret }: {
    currentProvider: ProviderType;
    serverUrl: string;
    secret: string;
}) => {
    // 关闭先前的连接（如果有）
    if (aria2) {
        manager.stop();
        close(aria2);
        aria2 = null;
        manager.aria2 = null;
    }

    // 如果aria2是当前provder，开启新连接
    if (currentProvider === 'aria2') {
        const isWebSocket = serverUrl.startsWith('ws://') || serverUrl.startsWith('wss://');
        // 即使协议不合法这里也进行连接，目的是保证aria2变量有值；后续报错交由后续逻辑处理
        //const isHTTP = serverUrl.startsWith('http://') || serverUrl.startsWith('https://');
        //if (!isWebSocket && !isHTTP) return;

        const options: Partial<OpenOptions> = {
            secret: secret || undefined,
            onServerError(err) {
                logger.simple('Error', 'aria2 server error');
                logger.asLevel('Error', err);
            },
        };
        aria2 = await open(
            isWebSocket ?
                createWebSocket(serverUrl as Aria2RpcWebSocketUrl, options) :
                createHTTP(serverUrl as Aria2RpcHTTPUrl, options)
        );
        manager.aria2 = aria2;
        manager.run();
    }
}, 500), { immediate: true, deep: true });

/**
 * 单文件下载任务  
 * 浏览器内置下载器实现
 */
class Aria2FileDownloadTask extends BaseFileDownloadTask implements IFileDownloadTask {
    public provider: ProviderType = 'aria2';
    public init: Promise<void> = Promise.resolve();

    private logger = logger.withPath('Aria2FileDownloadTask');
    private gid?: string;
    private emmiter = mitt<{
        abort: void;
    }>();

    constructor(parent: Nullable<BaseDownloadTask>, file: DownloadFile) {
        super(parent, file);
        if (!aria2) {
            this.logger.simple('Error', 'Aria2 not initialized. Check if aria2 provider is the active provider.');
            return;
        }

        this.progress.status = 'queue';
    }

    /**
     * 开始下载文件
     */
    async run(): Promise<void> {
        if (!aria2) {
            this.logger.simple('Error', 'Aria2 not initialized. Check if aria2 provider is the active provider.');
            return;
        }
        if (this.progress.status === 'ongoing') {
            this.logger.simple('Error', 'calling run while status is ongoing');
            return;
        }
        this.progress.status = 'ongoing';

        // 下载完成时resolve的Promise
        const { resolve, promise } = Promise.withResolvers<void>();
        
        // 创建Aria2任务
        const userDir = storage.get('dir');
        const fullPath = buildPath(userDir, this.file.path);
        const { dir, file: out } = path2DirFile(fullPath);
        const gid: string = await aria2.sendRequest(
            { method: 'aria2.addUri' },
            [ this.file.url ],
            { dir, out }
        );
        this.gid = gid;

        // 实时更新进度
        // 即使是WebSocket连接，服务端通知也没有进度通知，因此通过轮询更新进度
        const intervalTaskId = manager.add({
            call: {
                methodName: 'aria2.tellStatus',
                params: [
                    gid,
                    ['status', 'totalLength', 'completedLength'],
                ],
            },
            callback: (
                status: {
                    status: Aria2Status;
                    totalLength: number;
                    completedLength: number;
                }
            ) => {
                // 更新到本地数据
                this.progress.status = ARIA2_STATUS_MAP[status.status];
                this.progress.total = status.totalLength;
                this.progress.finished = status.completedLength;

                // 当下载不再进行时停止轮询
                if (!['active', 'waiting', 'paused'].includes(status.status)) {
                    manager.remove(intervalTaskId);
                    resolve();
                }
            },
        });
        // 当接收到abort事件时停止轮询
        this.emmiter.on('abort', () => {
            manager.remove(intervalTaskId);
            resolve();
        });

        return promise;
    }

    /**
     * aria2下载方式不支持暂停功能
     */
    async pause(): Promise<void> {
        //throw new FeatureNotSupportedError('Unsupported feature: pause', this.provider);
        if (!aria2) {
            this.logger.simple('Error', 'Aria2 not initialized. Check if aria2 provider is the active provider.');
            return;
        }
        if (!this.gid) return;

        await aria2.sendRequest(
            { method: 'aria2.pause'},
            this.gid,
        );
    }
    
    /**
     * aria2下载方式不支持暂停功能
     */
    async unpause(): Promise<void> {
        //throw new FeatureNotSupportedError('Unsupported feature: pause', this.provider);
        if (!aria2) {
            this.logger.simple('Error', 'Aria2 not initialized. Check if aria2 provider is the active provider.');
            return;
        }
        if (!this.gid) return;

        await aria2.sendRequest(
            { method: 'aria2.unpause'},
            this.gid,
        );
    }

    async abort(): Promise<void> {
        if (this.progress.status !== 'queue' && this.progress.status !== 'ongoing') return;
        if (!aria2) {
            this.logger.simple('Error', 'Aria2 not initialized. Check if aria2 provider is the active provider.');
            return;
        }
        if (!this.gid) return;

        // 通知Aira2服务端停止下载
        await aria2.sendRequest(
            { method: 'aria2.remove' },
            this.gid,
        );

        // 广播abort事件
        this.emmiter.emit('abort');
        
        // 无需等待run运行完毕，接收到abort事件后run会静默退出且不更改任务status
        // 设置停止状态
        this.progress.status = 'aborted';
    }
}

export class PostDownloadTask extends BasePostDownloadTask implements IPostDownloadTask {
    public provider: ProviderType = 'aria2';
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
                const fileTask = new Aria2FileDownloadTask(
                    this,
                    {
                        url: downloadUrl,
                        path: filename,
                    }
                );
                this.subTasks.push(fileTask);

                await fileTask.init;
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
     * aria2下载方式不支持暂停功能
     */
    async pause(): Promise<void> {
        //throw new FeatureNotSupportedError('Unsupported feature: pause', this.provider);
        await Promise.allSettled(this.subTasks.map(task => task.pause()));
        this.progress.status = 'paused';
    }
    
    /**
     * aria2下载方式不支持暂停功能
     */
    async unpause(): Promise<void> {
        //throw new FeatureNotSupportedError('Unsupported feature: pause', this.provider);
        this.progress.status = 'ongoing';
        await Promise.allSettled(this.subTasks.map(task => task.unpause()));
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
     * 检查所有subTasks中是否存在给定状态的task
     */
    hasTaskStatus(status: Status) {
        return this.subTasks.some(task => task.progress.status === status);
    }

    /**
     * 检查所有subTasks中是否均为给定状态的task
     */
    allTaskStatus(status: Status) {
        return this.subTasks.every(task => task.progress.status === status);
    }
}

export class PostsDownloadTask extends BasePostsDownloadTask implements IPostsDownloadTask {
    public provider: ProviderType = 'aria2';
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
        this.progress.total = this.subTasks.length;
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
     * aria2下载方式不支持暂停功能
     */
    async pause(): Promise<void> {
        //throw new FeatureNotSupportedError('Unsupported feature: pause', this.provider);
        await Promise.allSettled(this.subTasks.map(task => task.pause()));
        this.progress.status = 'paused';
    }
    
    /**
     * aria2下载方式不支持暂停功能
     */
    async unpause(): Promise<void> {
        //throw new FeatureNotSupportedError('Unsupported feature: pause', this.provider);
        this.progress.status = 'ongoing';
        await Promise.allSettled(this.subTasks.map(task => task.unpause()));
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
     * 检查所有subTasks中是否存在给定状态的task
     */
    hasTaskStatus(status: Status) {
        return this.subTasks.some(task => task.progress.status === status);
    }
}

export default class Aria2DownloadProvider extends BaseDownloadProvider implements IDownloadProvider {
    public name: ProviderType = 'aria2';
    static features: Feature[] = ['pause'];

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
