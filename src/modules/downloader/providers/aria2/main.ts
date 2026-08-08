import { debounce, logger as globalLogger, Nullable, saveAs, toast } from "@/utils/main.js";
import { BaseFileTask, BaseResourceTask } from "../../types/base/task.js";
import { BaseDownloadProvider, createResourceTask, Feature } from "../../types/base/provider.js";
import { globalStorage, makeStorageRef } from "@/storage.js";
import { onModuleRegistered, registerGroup, registerItem } from "@/modules/settings/main.js";
import i18n, { i18nKeys } from "@/i18n/main.js";
import { open, createWebSocket, createHTTP, Aria2RpcWebSocketUrl, Aria2RpcHTTPUrl, Aria2ServerVersion, OpenOptions, close, Conn } from "maria2";
import { buildPath, path2DirFile, ARIA2_STATUS_MAP, Aria2Status } from "./utils.js";
import { Aria2IntervalCallsManager } from "../../utils/main.js";
import mitt from "mitt";
import { ref, watch } from "vue";
import type { DownloadTarget, ExpandFn, Resource } from "../../types/model.js";
import type { ProviderType } from "../../types/base/provider.js";
import ServerIcon from '~icons/prime/server'
import WifiIcon from '~icons/prime/wifi'
import FolderIcon from '~icons/prime/folder'
import KeyIcon from '~icons/prime/key'
import ClockIcon from '~icons/prime/clock'

const t = i18n.global.t;
const logger = globalLogger.withPath('downloader', 'provider', 'aria2');
const providerStorage = globalStorage.withKeys('downloader').withKeys('providerSettings').withKeys('aria2');

/**
 * 轮询操作的时间周期（毫秒）
 * @todo 实现对此常量的用户设置
 */
const ARIA2_INTERVAL = providerStorage.get('interval') * 1000;
const manager = new Aria2IntervalCallsManager(null, ARIA2_INTERVAL);

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
        icon: ServerIcon,
        props: {
            placeholder: providerStorage.default('endpoint'),
        },
        value: makeStorageRef('endpoint', providerStorage, true, false),
        group: 'aria2',
    }, {
        id: 'secret',
        type: 'password',
        label: t($settings.$secret.$label),
        caption: t($settings.$secret.$caption),
        icon: KeyIcon,
        props: {
            feedback: false,
        },
        value: makeStorageRef('secret', providerStorage, true, false),
        group: 'aria2',
    }, {
        id: 'dir',
        type: 'text',
        label: t($settings.$dir.$label),
        caption: t($settings.$dir.$caption),
        help: t($settings.$dir.$help),
        icon: FolderIcon,
        value: makeStorageRef('dir', providerStorage, true, false),
        group: 'aria2',
    }, {
        id: 'interval',
        type: 'number',
        label: t($settings.$interval.$label),
        caption: t($settings.$interval.$caption),
        icon: ClockIcon,
        value: makeStorageRef('interval', providerStorage, true, false),
        props: {
            placeholder: providerStorage.default('interval').toString(),
            maxFractionDigits: 3,
        },
        group: 'aria2',
    }, {
        id: 'connection-test',
        type: 'button',
        label: t($settings.$connectionTest.$label),
        caption: t($settings.$connectionTest.$caption),
        icon: WifiIcon,
        value: ref(t($settings.$connectionTest.$button)),
        props: {
            async onClick() {
                const $toast = $settings.$connectionTest.$toast;
                // 使用当前配置创建临时连接测试，不依赖当前下载器是否为aria2
                let conn: Nullable<Conn> = null;
                try {
                    conn = await createAria2Connection(
                        providerStorage.get('endpoint'),
                        { secret: providerStorage.get('secret') || undefined },
                    );
                    const version = await conn.sendRequest<Aria2ServerVersion>(
                        { method: 'aria2.getVersion' },
                    );
                    // 连接成功
                    logger.simple('Detail', 'aria2 server connection ok');
                    logger.asLevel('Detail', version);
                    toast({
                        severity: 'success',
                        life: 3000,
                        summary: t($toast.$granted.$title),
                        detail: t($toast.$granted.$message, { version: version.version }),
                    });
                } catch (err) {
                    // 存在授权或其他问题
                    logger.simple('Error', 'error connecting aria2 server');
                    logger.asLevel('Error', err);
                    toast({
                        severity: 'error',
                        life: 3000,
                        summary: t($toast.$failed.$title),
                        detail: t($toast.$failed.$message),
                    });
                } finally {
                    conn && close(conn);
                }
            }
        },
        group: 'aria2',
    }, ]);
});

providerStorage.watch('interval', (_key, _oldVal, newVal, _remote) => {
    newVal && manager.setInterval(newVal * 1000);
});

// 连接Aria2服务端，并开启Aria2周期任务循环
const currentProvider = makeStorageRef('provider', globalStorage.withKeys('downloader'));
const serverUrl = makeStorageRef('endpoint', providerStorage);
const secret = makeStorageRef('secret', providerStorage);

/**
 * 创建Aria2 RPC连接  
 * 协议由URL决定：ws://wss://使用WebSocket，其余使用HTTP
 * @param serverUrl RPC服务器地址
 * @param options 连接选项（secret、超时、错误回调等）
 */
function createAria2Connection(serverUrl: string, options: Partial<OpenOptions> = {}): Promise<Conn> {
    const isWebSocket = serverUrl.startsWith('ws://') || serverUrl.startsWith('wss://');
    return open(
        isWebSocket ?
            createWebSocket(serverUrl as Aria2RpcWebSocketUrl, options) :
            createHTTP(serverUrl as Aria2RpcHTTPUrl, options)
    );
}

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
        aria2 = await createAria2Connection(serverUrl, {
            secret: secret || undefined,
            onServerError(err) {
                logger.simple('Error', 'aria2 server error');
                logger.asLevel('Error', err);
            },
        });
        manager.aria2 = aria2;
        manager.run();
    }
}, 500), { immediate: true, deep: true });

/**
 * 文件任务（叶子）  
 * Aria2 RPC实现：网络资源交由aria2服务端下载并轮询进度；内存资源回退到浏览器保存
 */
export class Aria2FileTask extends BaseFileTask {
    public provider: ProviderType = 'aria2';

    private logger = logger.withPath('Aria2FileTask');
    private gid?: string;
    private emmiter = mitt<{
        abort: void;
    }>();

    constructor(parent: Nullable<BaseResourceTask>, target: DownloadTarget) {
        super(parent, target);
        this.progress.status = 'queue';
    }

    /**
     * 开始下载/保存文件
     */
    async run(): Promise<void> {
        // 内存资源（如文字内容）：aria2无法保存本地数据，回退到浏览器保存
        if (this.target.kind === 'save') {
            this.progress.status = 'ongoing';
            this.progress.finished = 0;
            this.progress.total = 1;

            await saveAs(this.target.data!, this.target.path);

            this.progress.finished = 1;
            this.progress.status = 'complete';
            return;
        }

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
        const userDir = providerStorage.get('dir');
        const fullPath = buildPath(userDir, this.target.path);
        const { dir, file: out } = path2DirFile(fullPath);
        const gid: string = await aria2.sendRequest(
            { method: 'aria2.addUri' },
            [ this.target.url! ],
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
     * 暂停任务
     */
    async pause(): Promise<void> {
        if (!aria2) {
            this.logger.simple('Error', 'Aria2 not initialized. Check if aria2 provider is the active provider.');
            return;
        }
        if (!this.gid) return;

        await aria2.sendRequest(
            { method: 'aria2.pause' },
            this.gid,
        );
    }

    /**
     * 取消暂停任务
     */
    async unpause(): Promise<void> {
        if (!aria2) {
            this.logger.simple('Error', 'Aria2 not initialized. Check if aria2 provider is the active provider.');
            return;
        }
        if (!this.gid) return;

        await aria2.sendRequest(
            { method: 'aria2.unpause' },
            this.gid,
        );
    }

    /**
     * 终止任务
     */
    async abort(_deleteFiles: boolean = false): Promise<void> {
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

export default class Aria2DownloadProvider extends BaseDownloadProvider {
    public name: ProviderType = 'aria2';
    static features: Feature[] = ['pause'];

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
            fileTaskFactory: (parent, target) => new Aria2FileTask(parent, target),
        });
        this.tasks.push(task);
        this.runWithRetry(task);
        return task.id;
    }
}
