import { logger as globalLogger, Nullable, Queue, requestBuffer, toast } from "@/utils/main.js";
import { BaseFileTask, BaseResourceTask } from "../../types/base/task.js";
import { BaseDownloadProvider, createResourceTask, Feature } from "../../types/base/provider.js";
import { FeatureNotSupportedError } from "../../types/base/error.js";
import { globalStorage } from "@/storage";
import { ensurePermission, getDirectoryHandleRecursive, getDownloadDirectoryHandle, getFileHandleRecursive, requestNewHandle, streamDownloadToFileHandle, watchDirChange } from "./utils";
import { computed, ref } from "vue";
import type { DownloadTarget, ExpandFn, Resource, Status } from "../../types/model.js";
import type { ProviderType } from "../../types/base/provider.js";
import { onModuleRegistered, registerGroup, registerItem } from "@/modules/settings/main.js";
import i18n, { i18nKeys } from "@/i18n/main.js";
import FolderIcon from '~icons/prime/folder'
import KeyIcon from '~icons/prime/key'

const t = i18n.global.t;
const logger = globalLogger.withPath('downloader', 'provider', 'fsa');
const storage = globalStorage.withKeys('downloader');

// 设置
const $settings = i18nKeys.$downloader.$provider.$fsa.$settings;

onModuleRegistered('downloader', () => {
    registerGroup('downloader', {
        id: 'fsa',
        index: 2,
        name: computed(() => t($settings.$label)),
    });
    registerItem('downloader', [{
        id: 'directory',
        label: computed(() => t($settings.$directory.$label)),
        caption: computed(() => t($settings.$directory.$caption)),
        icon: FolderIcon,
        type: 'button',
        value: (() => {
            // buttons类型的value是按钮的label，且不会从组件内不改变（数据单向流动）
            const label = ref(t($settings.$directory.$notSelected));
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
    }, {
        id: 'permission-check',
        type: 'button',
        label: computed(() => t($settings.$permissionCheck.$label)),
        caption: computed(() => t($settings.$permissionCheck.$caption)),
        icon: KeyIcon,
        value: computed(() => t($settings.$permissionCheck.$button)),
        props: {
            async onClick() {
                const $toast = $settings.$permissionCheck.$toast;
                getDownloadDirectoryHandle().then(async handle => {
                    // 权限OK
                    logger.simple('Detail', 'directory permission test ok');
                    logger.asLevel('Detail', handle);

                    // 测试实际读写
                    const DIR_NAME = 'test-dir';
                    const FILE_NAME = 'test-file';
                    const CONTENT = 'test-content';
                    try {
                        const testDir = await handle.getDirectoryHandle(DIR_NAME, { create: true });
                        const testFile = await testDir.getFileHandle(FILE_NAME, { create: true });
                        const writable = await testFile.createWritable({ keepExistingData: false });
                        await writable.write(CONTENT);
                        await writable.close();
                        const file = await testFile.getFile();
                        const content = await file.text();
                        if (content !== CONTENT)
                            throw new Error(`file content not match: ${JSON.stringify(content)} !== ${JSON.stringify(CONTENT)}`);
                    } finally {
                        // 无论是否出错，都清理测试文件
                        await handle.removeEntry(DIR_NAME, { recursive: true });
                    }
                }).then(() => {
                    // 实际读写也没有问题
                    toast({
                        severity: 'success',
                        life: 3000,
                        summary: t($toast.$granted.$title),
                        detail: t($toast.$granted.$message),
                    });
                }).catch(err => {
                    // 存在授权或其他问题
                    logger.simple('Error', 'error while testing dir handle');
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
        group: 'fsa',
    }]);
});

/**
 * FSAProvider 全局共享文件下载队列
 */
const queueFile = new Queue({
    max: storage.get('concurrent'),
    sleep: 0,
});
storage.watch('concurrent', (_key, _oldVal, newVal, _remote) => queueFile.updateConfig({ max: newVal }));

/**
 * 文件任务（叶子）  
 * File System Access API实现：网络资源流式写入文件句柄，内存资源直接写入
 */
export class FSAFileTask extends BaseFileTask {
    public provider: ProviderType = 'fsa';

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

    private logger = logger.withPath('FSAFileTask');

    constructor(parent: Nullable<BaseResourceTask>, target: DownloadTarget) {
        super(parent, target);
        this.progress.status = 'queue';
    }

    /**
     * 开始下载/保存文件
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
        // 更新AbortSignal
        if (this.controller.signal.aborted) this.controller = new AbortController();
        const currentRunSignal = this.controller.signal;

        // 排队执行
        await queueFile.enqueue(async () => {
            // 排队期间可能已被终止：直接放弃执行
            if ((this.progress.status as Status) === 'aborted') return;
            this.progress.status = 'ongoing' as Status;
            this.progress.total = this.progress.finished = -1;

            try {
                // 获取文件句柄
                const dlDirHandle = await getDownloadDirectoryHandle();
                const fileHandle = await getFileHandleRecursive(dlDirHandle, this.target.path);

                // 写入前确保拥有读写权限
                await ensurePermission(dlDirHandle);
                await ensurePermission(fileHandle);

                // 内存资源：直接写入
                if (this.target.kind === 'save') {
                    this.progress.finished = 0;
                    this.progress.total = 1;

                    // 将数据转换为FSA文件可写流可写入格式
                    let data: FileSystemWriteChunkType;
                    if (this.target.data instanceof FileSystemFileHandle) {
                        data = await this.target.data.getFile();
                    } else {
                        data = this.target.data as FileSystemWriteChunkType;
                    }
                    const writable = await fileHandle.createWritable({ keepExistingData: false });
                    await writable.write(data);
                    await writable.close();

                    if ((this.progress.status as Status) !== 'aborted') {
                        this.progress.finished = 1;
                        this.progress.status = 'complete';
                    }
                    return;
                }

                // 网络资源：边下载边写入
                try {
                    // 优先使用原生fetch下载，GM_xhr的progress事件不包含数据
                    await streamDownloadToFileHandle(this.target.url!, fileHandle, progress => {
                        // 取消下载后可能仍会收到少量进度回调，照常更新即可
                        this.progress.total = progress.total;
                        this.progress.finished = progress.received;
                    }, currentRunSignal);
                } catch (err) {
                    // 用户已终止任务：跳过GM_xhr兜底，避免取消后重新开始下载
                    if ((this.progress.status as Status) === 'aborted') {
                        // 交由下方aborted分支处理（如删除已下载的文件）
                    } else {
                        // 原生fetch报错（预计为cors权限问题），改用GM_xhr兜底
                        logger.simple('Warning', 'native fetch error while downloading, using GM_xmlhttpRequest as fallback')
                        logger.asLevel('Warning', err);

                        const writable = await fileHandle.createWritable({
                            keepExistingData: false,
                            // @ts-expect-error `mode`参数存在，但项目使用的ts类型库'@types/wicg-file-system-access'尚未实现此类型
                            mode: 'exclusive',
                        });
                        // 为应对GM_xhr也出错（比如网络不稳定情况），使用try-finally保证文件可写流最终一定被关闭
                        try {
                            let lastBytesLoaded = 0;
                            const writeChunk = async (buffer: ArrayBuffer) => {
                                const chunk = buffer.slice(lastBytesLoaded);
                                if (chunk.byteLength > 0) {
                                    await writable.write(chunk);
                                    lastBytesLoaded += chunk.byteLength;
                                }
                            };
                            await requestBuffer({
                                url: this.target.url!,
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
                        } finally {
                            await writable.close();
                        }
                    }
                }

                // 判断任务结果
                if ((this.progress.status as Status) !== 'aborted') {
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
                console.log(this.target);
                // 设置任务状态
                if ((this.progress.status as Status) !== 'aborted')
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
    async abort(deleteFiles: boolean = false): Promise<void> {
        if (this.progress.status !== 'queue' && this.progress.status !== 'ongoing') return;
        // 首先设置为aborted状态
        this.progress.status = 'aborted';
        // 然后立即发送abort信号
        this.deleteFiles = deleteFiles;
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
        await this.abort(false);
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

export default class FSADownloadProvider extends BaseDownloadProvider {
    public name: ProviderType = 'fsa';
    static features: Feature[] = ['abortFiles', 'concurrent', 'textContent'];

    /**
     * 下载一个资源
     * @param resource 站点 adapter 解析出的资源
     * @param expand 展开函数
     * @param template 文件名模板
     * @returns 任务ID
     */
    async download(resource: Resource, expand: ExpandFn, template: string): Promise<string> {
        // 初始化下载文件夹，确保任务创建时有一个可读写的下载目录
        await getDownloadDirectoryHandle();

        // 创建任务并开始执行
        const task: BaseResourceTask = createResourceTask(this, {
            resource,
            expand,
            template,
            fileTaskFactory: (parent, target) => new FSAFileTask(parent, target),
        });
        this.tasks.push(task);
        this.runWithRetry(task);
        return task.id;
    }
}

export { checkCompatibility } from './utils.js';
