import { download, logger as globalLogger, Nullable, Queue, saveAs } from "@/utils/main.js";
import { BaseFileTask, BaseResourceTask } from "../../types/base/task.js";
import { BaseDownloadProvider, createResourceTask, Feature } from "../../types/base/provider.js";
import { FeatureNotSupportedError } from "../../types/base/error.js";
import { globalStorage } from "@/storage.js";
import type { DownloadTarget, ExpandFn, Resource, Status } from "../../types/model.js";
import type { ProviderType } from "../../types/base/provider.js";
import { onModuleRegistered, registerGroup } from "@/modules/settings/main.js";
import i18n, { i18nKeys } from "@/i18n/main.js";
import { computed } from "vue";

const logger = globalLogger.withPath('downloader', 'provider', 'browser');
const storage = globalStorage.withKeys('downloader');
const t = i18n.global.t;

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
        name: computed(() => t($settings.$label)),
    });
});

/**
 * 文件任务（叶子）  
 * 浏览器内置下载器实现：网络资源经GM_download下载，内存资源直接保存
 */
export class BrowserFileTask extends BaseFileTask {
    public provider: ProviderType = 'browser';

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

    private logger = logger.withPath('BrowserFileTask');

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

        // 内存资源：直接保存
        if (this.target.kind === 'save') {
            this.progress.status = 'ongoing' as Status;
            this.progress.finished = 0;
            this.progress.total = 1;

            await saveAs(this.target.data!, this.target.path);

            this.progress.finished = 1;
            this.progress.status = 'complete';
            return;
        }

        // 网络资源：排队下载
        const { promise, resolve } = Promise.withResolvers<void>();
        this.runPromise = promise;

        // 提供abort方法
        // 更新AbortSignal
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
                    url: this.target.url!,
                    name: this.target.path,
                    onprogress: e => {
                        this.progress.total = (e.total ?? e.totalSize ?? -1) || -1;
                        this.progress.finished = (e.done ?? e.loaded ?? -1) || -1;
                    }
                }, currentRunSignal);

                // 如果任务没有被取消，那就意味着任务成功完成了
                if ((this.progress.status as Status) !== 'aborted') {
                    // 设置任务完成状态
                    this.progress.status = 'complete';
                    // onprogress未必能保证任务完成时一定会以一个100%进度的回调结尾，因此这里需要手动设置任务进度
                    this.progress.finished = this.progress.total;
                }
            } catch (err) {
                console.log('err', err);
                // 下载出错，设置任务状态
                if ((this.progress.status as Status) !== 'aborted')
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

    /**
     * 终止任务  
     * 浏览器下载无法删除已下载文件，`deleteFiles`参数无效果
     */
    async abort(_deleteFiles: boolean = false): Promise<void> {
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

export default class BrowserDownloadProvider extends BaseDownloadProvider {
    public name: ProviderType = 'browser';
    static features: Feature[] = ['concurrent', 'textContent'];

    /**
     * 下载一个资源
     * @param resource 站点 adapter 解析出的资源
     * @param expand 展开函数
     * @param template 文件名模板
     * @returns 任务ID
     */
    download(resource: Resource, expand: ExpandFn, template: string): string {
        const task: BaseResourceTask = createResourceTask(this, {
            resource,
            expand,
            template,
            fileTaskFactory: (parent, target) => new BrowserFileTask(parent, target),
        });
        this.tasks.push(task);
        this.runWithRetry(task);
        return task.id;
    }
}
